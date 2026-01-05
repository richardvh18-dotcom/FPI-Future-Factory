import React, { useState } from "react";
import { Inbox, Send, RefreshCw, MessageSquare } from "lucide-react";
import InboxView from "./InboxView";
import ComposeModal from "./ComposeModal";
import { useMessages } from "../../../hooks/useMessages";
import { useAdminAuth } from "../../../hooks/useAdminAuth";

const MessagesManager = ({ onBack }) => {
  const { user } = useAdminAuth();
  const { messages, sendMessage, markAsRead, deleteMessage, loading } =
    useMessages(user);

  const [isComposing, setIsComposing] = useState(false);
  const [filter, setFilter] = useState("inbox"); // 'inbox' | 'sent'

  // Filter logica
  const filteredMessages = messages.filter((msg) => {
    if (filter === "sent") return msg.from === user?.email;
    // Inbox: Berichten aan mij OF aan iedereen, die NIET van mij zijn
    return (
      (msg.to === user?.email || msg.to === "all") && msg.from !== user?.email
    );
  });

  return (
    // AANPASSING: 'w-full' toegevoegd zodat items-center goed werkt
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden items-center">
      <div className="w-full max-w-5xl flex flex-col h-full p-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200 shrink-0">
          <div>
            <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <MessageSquare className="text-purple-500" size={32} />
              Berichtencentrum
            </h2>
            <p className="text-sm text-slate-400 font-medium ml-11 mt-1">
              Interne communicatie en notificaties
            </p>
          </div>

          <div className="flex gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200"
              >
                Terug
              </button>
            )}
            <button
              onClick={() => setIsComposing(true)}
              className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all transform hover:-translate-y-0.5"
            >
              <Send size={16} /> Nieuw Bericht
            </button>
          </div>
        </div>

        {/* Content met Sidebar voor mappen */}
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Folder Menu */}
          <div className="w-64 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col gap-2 shrink-0 h-fit">
            <button
              onClick={() => setFilter("inbox")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                filter === "inbox"
                  ? "bg-purple-50 text-purple-700"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Inbox size={18} /> Inbox
            </button>
            <button
              onClick={() => setFilter("sent")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                filter === "sent"
                  ? "bg-purple-50 text-purple-700"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Send size={18} /> Verzonden
            </button>
          </div>

          {/* Lijst */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                {filter === "inbox"
                  ? "Ontvangen Berichten"
                  : "Verzonden Berichten"}
              </span>
              {loading && (
                <RefreshCw size={14} className="animate-spin text-slate-400" />
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              <InboxView
                messages={filteredMessages}
                userEmail={user?.email}
                onMarkRead={markAsRead}
                onDelete={deleteMessage}
              />
            </div>
          </div>
        </div>
      </div>

      {isComposing && (
        <ComposeModal
          onClose={() => setIsComposing(false)}
          onSend={sendMessage}
          currentUserEmail={user?.email}
        />
      )}
    </div>
  );
};

export default MessagesManager;
