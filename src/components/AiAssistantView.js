import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Loader2,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  BookmarkCheck,
  Search,
  ArrowLeft,
  Settings,
  Key,
  X,
  Database, // Icoon voor data status
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  limit,
} from "firebase/firestore";
import { db, appId } from "../config/firebase";
import { useProductsData } from "../hooks/useProductsData";

// =================================================================================
// 🔑 API KEY CONFIGURATIE
// =================================================================================
const HARDCODED_API_KEY = "AIzaSyBkYyj-dFQK-xxlRt8nDG_ZC5m4WmFY6No";

/**
 * AiAssistantView
 * * Nu met STRIKTE prompt: Alleen antwoorden op basis van Firebase data.
 */
const AiAssistantView = () => {
  const navigate = useNavigate();

  // 1. HAAL CATALOGUS OP
  const { products: rawProducts, loading: loadingProducts } = useProductsData();
  const products = rawProducts || [];

  // 2. EXTRA DATA STATES
  const [orders, setOrders] = useState([]);
  const [trackedItems, setTrackedItems] = useState([]);
  const [loadingLive, setLoadingLive] = useState(true);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hallo! Ik ben de FPI Database Assistent. Ik geef alleen antwoord op basis van de actuele gegevens in het systeem (Catalogus, Planning, Tracking).",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [userApiKey, setUserApiKey] = useState(HARDCODED_API_KEY);

  // Load Key
  useEffect(() => {
    const storedKey = localStorage.getItem("fpi_gemini_key");
    // Check eerst environment, dan local storage, dan hardcoded
    const envKey = process.env.REACT_APP_GEMINI_API_KEY;

    if (storedKey) {
      setUserApiKey(storedKey);
    } else if (envKey) {
      setUserApiKey(envKey);
    } else if (HARDCODED_API_KEY) {
      setUserApiKey(HARDCODED_API_KEY);
    }
  }, []);

  // --- NIEUW: HAAL LIVE FABRIEKSDATA OP ---
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        setLoadingLive(true);

        // Haal recente orders (Planning)
        // We gebruiken limit(100) om de meest recente context te hebben
        const ordersQuery = query(
          collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "digital_planning"
          ),
          limit(100)
        );
        const ordersSnap = await getDocs(ordersQuery);
        const loadedOrders = ordersSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setOrders(loadedOrders);

        // Haal recente tracked items (Lotnummers/Status)
        const trackingQuery = query(
          collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "tracked_products"
          ),
          limit(100)
        );
        const trackingSnap = await getDocs(trackingQuery);
        const loadedTracking = trackingSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setTrackedItems(loadedTracking);
      } catch (e) {
        console.error("Fout bij laden live data:", e);
      } finally {
        setLoadingLive(false);
      }
    };
    fetchLiveData();
  }, []);

  const saveApiKey = () => {
    if (userApiKey.trim()) {
      localStorage.setItem("fpi_gemini_key", userApiKey.trim());
      setShowSettings(false);
      setError(null);
      alert("API Sleutel opgeslagen!");
    }
  };

  const modelName = "gemini-2.5-flash-preview-09-2025";

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  // --- KENNISBANK ---
  const findVerifiedAnswer = async (userQuery) => {
    try {
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
          contextDataCount: products.length,
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
    if (index > 0) {
      await logInteraction(
        messages[index - 1].content,
        messages[index].content,
        type
      );
    }
  };

  // --- AI FETCH ---
  const fetchAi = async (prompt, systemPrompt) => {
    const currentKey = userApiKey || HARDCODED_API_KEY || "";
    if (!currentKey) throw new Error("MISSING_KEY");

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${currentKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    const delays = [1000, 2000];

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
        if (!text) throw new Error("Leeg antwoord van AI");
        return text;
      } catch (err) {
        if (err.message === "MISSING_KEY") throw err;
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
      // 1. Kennisbank Check
      const verifiedMatch = await findVerifiedAnswer(userQuery);
      if (verifiedMatch) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `(Uit Kennisbank):\n\n${
              verifiedMatch.correctedAnswer || verifiedMatch.answer
            }`,
            isVerified: true,
          },
        ]);
        setIsTyping(false);
        return;
      }

      // 2. INTELLIGENTE DATA FILTERING (Context opbouwen)

      // A. Zoek in Catalogus
      const relevantProducts = products
        .filter(
          (p) =>
            userQuery.includes(String(p.diameter)) ||
            (p.type &&
              userQuery.toLowerCase().includes(p.type.toLowerCase())) ||
            (p.productCode &&
              userQuery.toLowerCase().includes(p.productCode.toLowerCase()))
        )
        .slice(0, 5);

      // B. Zoek in Orders (Digital Planning)
      const relevantOrders = orders
        .filter(
          (o) =>
            (o.orderId && userQuery.includes(o.orderId)) ||
            (o.lotNumber && userQuery.includes(o.lotNumber))
        )
        .slice(0, 5);

      // C. Zoek in Tracking (Product Status)
      const relevantTracking = trackedItems
        .filter(
          (t) =>
            (t.lotNumber && userQuery.includes(t.lotNumber)) ||
            (t.orderId && userQuery.includes(t.orderId))
        )
        .slice(0, 5);

      // D. Bouw Context String
      let contextString = "";

      if (relevantProducts.length > 0) {
        contextString +=
          "CATALOGUS DATA:\n" +
          relevantProducts
            .map(
              (p) =>
                `- ${p.type} ID${p.diameter} PN${p.pressure} (${p.connection})`
            )
            .join("\n") +
          "\n\n";
      }

      if (relevantOrders.length > 0) {
        contextString +=
          "PLANNING (ORDERS):\n" +
          relevantOrders
            .map(
              (o) =>
                `- Order: ${o.orderId}, Item: ${o.item}, Status: ${
                  o.status
                }, Plan: ${o.plan}, Gereed: ${o.liveFinish || 0}`
            )
            .join("\n") +
          "\n\n";
      }

      if (relevantTracking.length > 0) {
        contextString +=
          "TRACKING (LOTNUMMERS):\n" +
          relevantTracking
            .map(
              (t) =>
                `- Lot: ${t.lotNumber}, Status: ${t.status}, Locatie: ${
                  t.currentStation || "Onbekend"
                }, Laatste scan: ${t.lastScannedBy}`
            )
            .join("\n") +
          "\n\n";
      }

      if (!contextString) {
        contextString =
          "(Geen specifieke data gevonden in de database die matcht met deze zoekopdracht.)";
      }

      const systemPrompt = `
        Je bent de FPI Database Assistent. Je fungeert als een strikte zoekmachine over de interne database.
        
        GEVONDEN DATA VOOR DEZE VRAAG (Dit is de ENIGE bron van waarheid):
        ${contextString}
        
        STRIKTE INSTRUCTIES:
        1. Gebruik UITSLUITEND de bovenstaande data om de vraag te beantwoorden.
        2. Raadpleeg GEEN externe kennis, internet, of algemene aannames.
        3. Als het antwoord niet in de "GEVONDEN DATA" staat, zeg dan letterlijk: "Ik kan deze specifieke informatie niet vinden in de huidige database (Catalogus/Planning/Tracking)."
        4. Verzin GEEN statussen of locaties.
        5. Vertaal 'Elbow' naar 'Bocht', 'Tee' naar 'T-stuk'.
        6. Antwoord kort en feitelijk.
      `;

      const responseText = await fetchAi(userQuery, systemPrompt);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: responseText },
      ]);

      logInteraction(userQuery, responseText, null);
    } catch (err) {
      console.error("AI Error Details:", err);
      let errorMsg = "Er ging iets mis.";

      if (err.message.includes("MISSING_KEY")) {
        errorMsg = "Geen API Sleutel gevonden.";
        setShowSettings(true);
      } else if (
        err.message.includes("403") ||
        err.message.includes("API key")
      ) {
        errorMsg = "API Sleutel geweigerd.";
        setShowSettings(true);
      } else {
        errorMsg = "Verbindingsfout.";
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Ik kon geen antwoord genereren vanwege een fout.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-100 relative">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-200">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 italic uppercase tracking-tight">
                AI Assistent
              </h1>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  {loadingProducts || loadingLive
                    ? "Data Synchroniseren..."
                    : "Live Verbonden"}
                  {!loadingLive && (
                    <Database size={10} className="text-blue-500 ml-1" />
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowSettings(true)}
          className="p-2 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
          title="API Instellingen"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute top-20 right-4 w-80 bg-white shadow-xl rounded-2xl border border-slate-200 z-50 p-4 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Key size={16} /> API Configuratie
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Sleutel status:{" "}
            <strong>{userApiKey ? "Aanwezig" : "Ontbreekt"}</strong>
          </p>
          <input
            type="password"
            value={userApiKey}
            onChange={(e) => setUserApiKey(e.target.value)}
            placeholder="Plak API Key hier..."
            className="w-full border border-slate-300 rounded-lg p-2 text-sm mb-3 focus:border-emerald-500 outline-none"
          />
          <button
            onClick={saveApiKey}
            className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold text-xs uppercase tracking-wide hover:bg-emerald-700"
          >
            Opslaan
          </button>
        </div>
      )}

      {/* Chat Gebied */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              } animate-in slide-in-from-bottom-2`}
            >
              <div
                className={`flex gap-3 max-w-[85%] ${
                  m.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${
                    m.role === "user"
                      ? "bg-slate-800 border-slate-700 text-white"
                      : "bg-white border-slate-200 text-emerald-600"
                  }`}
                >
                  {m.role === "user" ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div
                  className={`flex flex-col gap-1 ${
                    m.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-slate-800 text-white rounded-tr-none"
                        : "bg-white border border-slate-200 text-slate-700 rounded-tl-none"
                    }`}
                  >
                    {m.content}
                  </div>

                  {m.role === "assistant" && i > 0 && !m.isVerified && (
                    <div className="flex items-center gap-2 px-1 opacity-50 hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleFeedback(i, "positive")}
                        className={`p-1 rounded hover:bg-emerald-50 ${
                          m.feedback === "positive"
                            ? "text-emerald-500"
                            : "text-slate-400"
                        }`}
                      >
                        <ThumbsUp size={12} />
                      </button>
                      <button
                        onClick={() => handleFeedback(i, "negative")}
                        className={`p-1 rounded hover:bg-red-50 ${
                          m.feedback === "negative"
                            ? "text-red-500"
                            : "text-slate-400"
                        }`}
                      >
                        <ThumbsDown size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm text-emerald-500 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs font-bold text-slate-400">
                  Analyseren...
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="mx-auto max-w-lg bg-red-50 border border-red-100 p-4 rounded-xl text-center flex flex-col gap-2 items-center">
              <AlertCircle className="text-red-500" size={24} />
              <p className="text-xs font-bold text-red-600 break-words w-full">
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Input Gebied */}
        <div className="p-4 bg-white border-t border-slate-200 pb-8 md:pb-4">
          <form
            onSubmit={handleSend}
            className="relative flex items-center gap-2 bg-slate-50 border-2 border-slate-100 rounded-full px-2 py-2 focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all"
          >
            <div className="pl-3">
              <Search size={20} className="text-slate-400" />
            </div>
            <input
              className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400 h-10"
              placeholder="Vraag bijv: Status van ORD-2026-001?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping || loadingProducts}
            />
            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              className="p-3 bg-slate-900 text-white rounded-full hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AiAssistantView;
