import React, { useState } from "react";
import {
  Bot,
  Send,
  Sparkles,
  GraduationCap,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import FlashcardViewer from "./ai/FlashcardViewer";
import { MOCK_FLASHCARDS } from "../data/aiPrompts";

const AiAssistantView = () => {
  const [activeTab, setActiveTab] = useState("chat"); // 'chat' of 'training'

  // Chat State
  const [messages, setMessages] = useState([
    {
      role: "system",
      content:
        "Hallo! Ik ben de FPi AI Assistent. Ik kan je helpen met vragen over producten, voorraad of technische specificaties.",
    },
  ]);
  const [input, setInput] = useState("");

  // Training State
  const [trainingTopic, setTrainingTopic] = useState("");
  const [flashcardData, setFlashcardData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- CHAT LOGICA ---
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Simuleer AI antwoord
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content:
            "Ik ben een demo-versie. In de productie-omgeving zou ik nu antwoord geven via de OpenAI/Gemini API.",
        },
      ]);
    }, 1000);
  };

  // --- TRAINING LOGICA ---
  const handleStartTraining = (e) => {
    e.preventDefault();
    if (!trainingTopic.trim()) return;

    setIsGenerating(true);

    // Simuleer API call naar LLM met de Flashcard Prompt
    // In het echt stuur je hier de FLASHCARD_SYSTEM_PROMPT mee
    setTimeout(() => {
      setFlashcardData(MOCK_FLASHCARDS); // We gebruiken de mock data
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
      {/* HEADER */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Bot className="text-blue-600" />
            AI Assistent & Training
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Stel vragen of start een trainingssessie.
          </p>
        </div>

        {/* TABS */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === "chat"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <MessageSquare size={16} /> Chat
          </button>
          <button
            onClick={() => setActiveTab("training")}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === "training"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <GraduationCap size={16} /> Training
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-hidden relative">
        {/* === MODE: CHAT === */}
        {activeTab === "chat" && (
          <div className="h-full flex flex-col max-w-4xl mx-auto">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-white border-t border-slate-200">
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                  placeholder="Typ je vraag..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* === MODE: TRAINING === */}
        {activeTab === "training" && (
          <div className="h-full flex flex-col items-center justify-center p-6">
            {!flashcardData ? (
              <div className="w-full max-w-lg text-center space-y-6">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto text-purple-600 mb-4">
                  <GraduationCap size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-900">
                  Start een Kennissessie
                </h2>
                <p className="text-slate-500">
                  Wil je je kennis over GRE, veiligheid of specifieke
                  productcodes testen? Voer een onderwerp in en de AI genereert
                  een oefenset voor je.
                </p>

                <form onSubmit={handleStartTraining} className="mt-8">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Bijv. 'Wavistrong Codes' of 'Veiligheid'"
                      className="w-full bg-white border-2 border-slate-200 rounded-2xl px-6 py-4 outline-none focus:border-purple-500 transition-colors shadow-sm text-lg"
                      value={trainingTopic}
                      onChange={(e) => setTrainingTopic(e.target.value)}
                      disabled={isGenerating}
                    />
                    <button
                      type="submit"
                      disabled={isGenerating || !trainingTopic}
                      className="absolute right-2 top-2 bottom-2 bg-purple-600 text-white px-6 rounded-xl font-bold uppercase tracking-wider hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {isGenerating ? (
                        "Genereren..."
                      ) : (
                        <>
                          <Sparkles size={18} /> Start
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <FlashcardViewer
                data={flashcardData}
                onClose={() => setFlashcardData(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAssistantView;
