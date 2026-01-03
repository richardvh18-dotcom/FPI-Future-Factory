import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Send, Bot, User, Loader2, Info } from "lucide-react";

/**
 * AiAssistantView.js - FPI Emerald Theme
 * Database Expert Assistent voor technische vragen.
 */
const AiAssistantView = ({
  products = [],
  moffen = [],
  callGemini,
  initialQuery,
  clearInitialQuery,
}) => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hallo! Ik ben de FPI GRE Expert. Ik heb de database geanalyseerd en ben klaar voor je vragen over producten, ID's of PN-klasses.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (initialQuery) {
      handleSend(initialQuery);
      clearInitialQuery();
    }
  }, [initialQuery]);

  const handleSend = async (text = input) => {
    const query = text.trim();
    if (!query || isTyping) return;

    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setInput("");
    setIsTyping(true);

    const contextData = products
      .slice(0, 50)
      .map(
        (p) =>
          `${p.type}|ID:${p.diameter}|PN:${p.pressure}|Art:${
            p.articleCode || "-"
          }`
      )
      .join("; ");

    const systemPrompt = `
      Je bent de 'FPI GRE Expert'. Gebruik onderstaande database informatie om vragen te beantwoorden.
      DATABASE: ${contextData}
      RICHTLIJNEN:
      1. Antwoord kort, bondig en in het Nederlands.
      2. Gebruik technische termen: ID (Diameter), PN (Druk), Art.nr.
      3. Formatteer antwoorden met bulletpoints voor leesbaarheid.
    `;

    try {
      const response = await callGemini(query, systemPrompt);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Systeemfout: De AI-module is momenteel niet bereikbaar.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-300">
      <div className="p-4 bg-white border-b flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-100">
            <Sparkles size={20} />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-black uppercase italic text-slate-900 tracking-tight">
              FPI Expert AI
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">
                Live DB Sync
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            } animate-in slide-in-from-bottom-2`}
          >
            <div
              className={`max-w-[85%] flex gap-3 ${
                m.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`h-9 w-9 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border ${
                  m.role === "user"
                    ? "bg-slate-900 border-slate-800 text-white"
                    : "bg-white border-slate-200 text-emerald-600"
                }`}
              >
                {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div
                className={`p-4 rounded-3xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap text-left ${
                  m.role === "user"
                    ? "bg-emerald-600 text-white rounded-tr-none font-bold"
                    : "bg-white border border-slate-200 text-slate-700 rounded-tl-none font-medium italic"
                }`}
              >
                {m.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-white border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative max-w-4xl mx-auto"
        >
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-5 pr-14 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-inner"
            placeholder="Stel een technische vraag..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={isTyping || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-emerald-600 disabled:opacity-30 transition-all active:scale-95"
          >
            {isTyping ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AiAssistantView;
