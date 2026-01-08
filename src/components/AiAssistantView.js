import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Loader2,
  AlertCircle,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  BookmarkCheck,
  Search,
  MessageSquare,
} from "lucide-react";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { db, appId } from "../config/firebase";

/**
 * AiAssistantView: De technische expert met leervermogen.
 * Hersteld: Verwijdert complexe Firestore queries om 'Permission Denied' of index-fouten te voorkomen.
 */
const AiAssistantView = ({ products = [], currentSearch = "" }) => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hallo! Ik ben de FPI GRE Expert. Ik heb toegang tot de database en leer van geverifieerde antwoorden. Waarmee kan ik helpen?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  // Gemini API Config (Verplichte lege sleutel voor injectie)
  const apiKey = "";
  const modelName = "gemini-2.5-flash-preview-09-2025";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  /**
   * Zoekt in de 'ai_knowledge_base'.
   * GEFIXT: Geen where() meer gebruiken (Regel 2), maar filteren in JS.
   */
  const findVerifiedAnswer = async (userQuery) => {
    try {
      // Haal de hele collectie op (simpele query conform regel 2)
      const colRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "ai_knowledge_base"
      );
      const snap = await getDocs(colRef);

      const allEntries = snap.docs.map((d) => d.data());

      // Filter in het geheugen op 'verified' en match de vraag
      const verifiedMatches = allEntries.filter((m) => m.verified === true);

      const match = verifiedMatches.find(
        (m) =>
          userQuery.toLowerCase().includes(m.question.toLowerCase()) ||
          m.question.toLowerCase().includes(userQuery.toLowerCase())
      );

      return match || null;
    } catch (e) {
      console.error("Database check mislukt:", e);
      return null;
    }
  };

  /**
   * Slaat interactie op voor de AI Training module.
   */
  const logInteraction = async (userQ, aiA, feedback = null) => {
    try {
      await addDoc(
        collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "ai_knowledge_base"
        ),
        {
          question: userQ,
          answer: aiA,
          feedback: feedback,
          timestamp: serverTimestamp(),
          verified: false,
          contextSearch: currentSearch,
        }
      );
    } catch (e) {
      console.error("Logging mislukt:", e);
    }
  };

  const handleFeedback = async (index, type) => {
    const updatedMessages = [...messages];
    updatedMessages[index].feedback = type;
    setMessages(updatedMessages);
    await logInteraction(
      messages[index - 1].content,
      messages[index].content,
      type
    );
  };

  /**
   * fetchAi: Implementatie met verplichte exponential backoff (1s, 2s, 4s, 8s, 16s)
   */
  const fetchAi = async (prompt, systemPrompt) => {
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    const delays = [1000, 2000, 4000, 8000, 16000];

    for (let i = 0; i < delays.length; i++) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Leeg antwoord");
        return text;
      } catch (err) {
        if (i === delays.length - 1) throw err;
        await new Promise((r) => setTimeout(r, delays[i]));
      }
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const userQuery = input.trim();
    if (!userQuery || isTyping) return;

    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: userQuery }]);
    setInput("");
    setIsTyping(true);

    try {
      // 1. Check de kennisbank (nu veilig zonder where-clausule)
      const verifiedMatch = await findVerifiedAnswer(userQuery);
      if (verifiedMatch) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `(Geverifieerd):\n\n${
              verifiedMatch.correctedAnswer || verifiedMatch.answer
            }`,
            isVerified: true,
          },
        ]);
        setIsTyping(false);
        return;
      }

      // 2. Roep AI aan
      const relevantProducts = products
        .filter(
          (p) =>
            userQuery.includes(String(p.diameter)) ||
            userQuery.toLowerCase().includes(String(p.type || "").toLowerCase())
        )
        .slice(0, 15);

      const contextData = relevantProducts
        .map(
          (p) =>
            `${p.type}|ID:${p.diameter}|PN:${p.pressure}|Art:${
              p.articleCode || "-"
            }`
        )
        .join("; ");

      const systemPrompt = `
        Je bent de 'FPI GRE Expert'. Gebruik deze data: ${contextData}.
        Huidige zoekfilter: ${currentSearch}.
        Antwoord technisch en kort in het Nederlands. Gebruik bulletpoints.
        Voor CB moffen: B1, B2, BA, A1. Voor TB: B1, B2, BA, r1, alpha.
      `;

      const response = await fetchAi(userQuery, systemPrompt);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response },
      ]);
    } catch (err) {
      console.error("AI Error:", err);
      setError(
        "AI-service is momenteel druk. Probeer het over 10 seconden opnieuw."
      );
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm animate-in fade-in duration-500">
      <div className="p-6 bg-white border-b flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-100">
            <Bot size={22} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase italic text-slate-900 tracking-tight">
              FPI Expert
            </h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
              Live Kennisbank
            </p>
          </div>
        </div>
        {currentSearch && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl">
            <Search size={12} className="text-blue-500" />
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">
              Scope: {currentSearch}
            </span>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            } animate-in slide-in-from-bottom-2`}
          >
            <div
              className={`max-w-[85%] flex flex-col ${
                m.role === "user" ? "items-end" : "items-start"
              } gap-2`}
            >
              <div
                className={`flex gap-3 ${
                  m.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border ${
                    m.role === "user"
                      ? "bg-slate-900 border-slate-800 text-white"
                      : "bg-white border-slate-200 text-emerald-600"
                  }`}
                >
                  {m.role === "user" ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div
                  className={`p-4 rounded-[1.5rem] text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-emerald-600 text-white rounded-tr-none font-bold"
                      : "bg-white border border-slate-200 text-slate-700 rounded-tl-none font-medium italic shadow-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>

              {m.role === "assistant" &&
                i > 0 &&
                !m.isVerified &&
                !m.feedback && (
                  <div className="flex items-center gap-3 ml-12 mt-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase italic">
                      Antwoord correct?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFeedback(i, "positive")}
                        className="p-1.5 hover:bg-emerald-50 text-slate-300 hover:text-emerald-500 transition-all rounded-lg"
                      >
                        <ThumbsUp size={14} />
                      </button>
                      <button
                        onClick={() => handleFeedback(i, "negative")}
                        className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all rounded-lg"
                      >
                        <ThumbsDown size={14} />
                      </button>
                    </div>
                  </div>
                )}

              {m.feedback && (
                <div
                  className={`flex items-center gap-1.5 ml-12 text-[9px] font-black uppercase ${
                    m.feedback === "positive"
                      ? "text-emerald-500"
                      : "text-red-400"
                  }`}
                >
                  {m.feedback === "positive" ? (
                    <BookmarkCheck size={12} />
                  ) : (
                    <AlertCircle size={12} />
                  )}
                  {m.feedback === "positive"
                    ? "Opgeslagen als nuttig"
                    : "Gemeld voor QC"}
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm text-emerald-500">
              <Loader2 size={16} className="animate-spin" />
            </div>
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center gap-3 p-8 text-center bg-red-50 rounded-[2rem] border border-red-100 mx-auto max-w-sm">
            <AlertCircle size={32} className="text-red-400" />
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">
              {error}
            </p>
            <button
              onClick={() => handleSend()}
              className="px-6 py-2.5 bg-white border border-red-200 rounded-xl text-[10px] font-black uppercase text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
            >
              <RefreshCw size={12} className="mr-2 inline" /> Probeer opnieuw
            </button>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-slate-100 shrink-0">
        <form onSubmit={handleSend} className="relative max-w-4xl mx-auto">
          <input
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] pl-6 pr-16 py-5 text-sm font-bold focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all shadow-inner"
            placeholder="Stel een vraag (bijv: Wat zijn de maten voor ID 80 PN 10?)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={isTyping || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-4 bg-slate-900 text-white rounded-[1.5rem] shadow-xl hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center"
          >
            {isTyping ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AiAssistantView;
