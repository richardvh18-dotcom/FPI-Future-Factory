import React, { useState, useMemo } from "react";
import {
  Inbox,
  Send,
  RefreshCw,
  MessageSquare,
  Search,
  ArrowLeft,
  Plus,
  Mail,
  Clock,
} from "lucide-react";
import InboxView from "./InboxView";
import ComposeModal from "./ComposeModal";
import { useMessages } from "../../../hooks/useMessages";
import { useAdminAuth } from "../../../hooks/useAdminAuth";

const MessagesManager = ({ onBack }) => {
  const { user } = useAdminAuth();
  const {
    messages,
    sendMessage,
    markAsRead,
    deleteMessage,
    loading,
    unreadCount,
  } = useMessages(user);

  const [isComposing, setIsComposing] = useState(false);
  const [activeFolder, setActiveFolder] = useState("inbox"); // 'inbox' | 'sent'
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMessages = useMemo(() => {
    if (!messages || !user?.email) return [];
    const myEmail = user.email.toLowerCase();

    let base = messages.filter((msg) => {
      const fromEmail = (msg.from || "").toLowerCase();
      const toEmail = (msg.to || "").toLowerCase();

      if (activeFolder === "sent") {
        return fromEmail === myEmail;
      }

      // Inbox: Berichten gericht aan mij OF aan 'all', maar niet verzonden door mijzelf
      return (
        (toEmail === myEmail || toEmail === "all") && fromEmail !== myEmail
      );
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter(
        (m) =>
          (m.subject || "").toLowerCase().includes(q) ||
          (m.content || "").toLowerCase().includes(q) ||
          (m.from || "").toLowerCase().includes(q)
      );
    }
    return base;
  }, [messages, activeFolder, searchQuery, user?.email]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden items-center animate-in fade-in duration-500">
      <div className="w-full max-w-6xl flex flex-col h-full p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 shrink-0 gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2.5 hover:bg-slate-50 rounded-2xl text-slate-400 transition-all border border-transparent hover:border-slate-100"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="h-12 w-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <MessageSquare size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase italic">
                Berichten<span className="text-emerald-500">centrum</span>
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Interne Communicatie
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsComposing(true)}
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 shadow-xl transition-all active:scale-95"
          >
            <Plus size={18} /> Nieuw Bericht
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
          {/* Sidebar Nav */}
          <div className="w-full md:w-64 flex md:flex-col gap-2 shrink-0">
            <button
              onClick={() => setActiveFolder("inbox")}
              className={`flex items-center justify-between px-5 py-4 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all ${
                activeFolder === "inbox"
                  ? "bg-white border-2 border-emerald-500 text-emerald-600 shadow-md"
                  : "bg-white border-2 border-transparent text-slate-400 hover:border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Inbox size={18} /> Inbox
              </div>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveFolder("sent")}
              className={`flex items-center gap-3 px-5 py-4 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all ${
                activeFolder === "sent"
                  ? "bg-white border-2 border-emerald-500 text-emerald-600 shadow-md"
                  : "bg-white border-2 border-transparent text-slate-400 hover:border-slate-200"
              }`}
            >
              <Send size={18} /> Verzonden
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 bg-white rounded-[32px] border border-slate-200 overflow-hidden flex flex-col shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center gap-4">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                  size={16}
                />
                <input
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                  placeholder="Zoek in berichten..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {loading && (
                <RefreshCw
                  size={16}
                  className="animate-spin text-emerald-500"
                />
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-slate-300 opacity-40">
                  <Mail size={64} strokeWidth={1} />
                  <p className="mt-4 font-black uppercase text-xs tracking-widest">
                    Geen berichten gevonden
                  </p>
                </div>
              ) : (
                <InboxView
                  messages={filteredMessages}
                  userEmail={user?.email}
                  onMarkRead={markAsRead}
                  onDelete={deleteMessage}
                  activeFolder={activeFolder}
                />
              )}
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
