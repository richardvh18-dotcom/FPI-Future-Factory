import React, { useState, useEffect } from "react";
import {
  Mail,
  Send,
  Trash2,
  User,
  Clock,
  Inbox,
  Plus,
  Loader2,
  X,
} from "lucide-react";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db, appId } from "../../config/firebase";
import { useAdminAuth } from "../../hooks/useAdminAuth";

const AdminMessagesView = ({ onBack }) => {
  const { user } = useAdminAuth();

  // Data State
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isComposing, setIsComposing] = useState(false);
  const [viewMode, setViewMode] = useState("inbox"); // 'inbox' of 'sent'

  // Compose State
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // 1. DATA FETCHING
  useEffect(() => {
    if (!appId) return;

    const q = query(
      collection(db, "artifacts", appId, "public", "data", "messages"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Fallback voor timestamp
        timestamp: doc.data().timestamp?.toDate
          ? doc.data().timestamp.toDate().toISOString()
          : new Date().toISOString(),
      }));
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. ACTIONS
  const handleSendMessage = async (to, subject, body) => {
    try {
      await addDoc(
        collection(db, "artifacts", appId, "public", "data", "messages"),
        {
          to,
          from: user?.email,
          fromName: user?.displayName || user?.email?.split("@")[0] || "Admin",
          subject,
          body,
          timestamp: serverTimestamp(),
          read: false,
        }
      );
      return true;
    } catch (e) {
      console.error("Send error:", e);
      return false;
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "messages", id),
        {
          read: true,
          readAt: serverTimestamp(),
        }
      );
    } catch (e) {
      console.error("Mark read error:", e);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Zeker weten?")) return;
    try {
      await deleteDoc(
        doc(db, "artifacts", appId, "public", "data", "messages", id)
      );
      if (selectedMessage?.id === id) setSelectedMessage(null);
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  // 3. UI LOGICA

  // Filterberichten
  const receivedMessages = messages.filter(
    (m) => m.to === user?.email || m.to === "iedereen" || m.to === "admin"
  );
  const sentMessages = messages.filter((m) => m.from === user?.email);

  const displayedMessages =
    viewMode === "inbox" ? receivedMessages : sentMessages;

  const handleSendForm = async (e) => {
    e.preventDefault();
    if (!to || !subject || !body) return alert("Vul alle velden in.");

    const success = await handleSendMessage(to, subject, body);
    if (success) {
      alert("Bericht verzonden!");
      setIsComposing(false);
      setTo("");
      setSubject("");
      setBody("");
      setViewMode("sent");
    } else {
      alert("Er ging iets mis.");
    }
  };

  const handleSelect = (msg) => {
    setSelectedMessage(msg);
    // Markeer als gelezen als het aan mij gericht is
    if (!msg.read && (msg.to === user?.email || msg.to === "admin")) {
      handleMarkRead(msg.id);
    }
  };

  // Helper voor datum weergave
  const formatDate = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleString("nl-NL", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading)
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );

  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <Mail className="text-blue-500" size={32} />
            Berichtencentrum
          </h2>
          <p className="text-sm text-slate-400 font-medium ml-11 mt-1">
            Interne communicatie
          </p>
        </div>
        <div className="flex gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
            >
              Terug
            </button>
          )}
          <button
            onClick={() => {
              setIsComposing(true);
              setSelectedMessage(null);
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
          >
            <Plus size={16} /> Nieuw Bericht
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Lijst */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100 flex gap-2">
            <button
              onClick={() => {
                setViewMode("inbox");
                setSelectedMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors ${
                viewMode === "inbox"
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Inbox size={14} /> Inbox (
              {receivedMessages.filter((m) => !m.read).length})
            </button>
            <button
              onClick={() => {
                setViewMode("sent");
                setSelectedMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors ${
                viewMode === "sent"
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Send size={14} /> Verzonden
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {displayedMessages.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Geen berichten.
              </div>
            )}
            {displayedMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => handleSelect(msg)}
                className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                  selectedMessage?.id === msg.id ? "bg-blue-50/50" : ""
                } ${
                  !msg.read && viewMode === "inbox"
                    ? "bg-blue-50 border-l-4 border-l-blue-500"
                    : ""
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`text-xs font-bold ${
                      !msg.read && viewMode === "inbox"
                        ? "text-slate-800"
                        : "text-slate-600"
                    }`}
                  >
                    {viewMode === "inbox" ? msg.fromName : `Aan: ${msg.to}`}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatDate(msg.timestamp)}
                  </span>
                </div>
                <h4
                  className={`text-sm truncate mb-1 ${
                    !msg.read && viewMode === "inbox"
                      ? "font-bold text-black"
                      : "font-medium text-slate-700"
                  }`}
                >
                  {msg.subject}
                </h4>
                <p className="text-xs text-slate-400 truncate">{msg.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-slate-50 p-8 overflow-y-auto custom-scrollbar flex flex-col items-center">
          {/* COMPOSE MODUS */}
          {isComposing && (
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  Nieuw Bericht Schrijven
                </h3>
                <button
                  onClick={() => setIsComposing(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSendForm} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    Aan
                  </label>
                  <input
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-blue-500 outline-none"
                    placeholder="Emailadres of 'iedereen'"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    list="users-datalist"
                  />
                  <datalist id="users-datalist">
                    <option value="iedereen" />
                    {/* Hier zou je idealiter users uit AdminUsersView injecteren */}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    Onderwerp
                  </label>
                  <input
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-blue-500 outline-none"
                    placeholder="Waar gaat het over?"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    Bericht
                  </label>
                  <textarea
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-blue-500 outline-none h-40 resize-none"
                    placeholder="Typ je bericht..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                    <Send size={16} /> Versturen
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* READING MODUS */}
          {!isComposing && selectedMessage && (
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
              <div className="p-8 border-b border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <h1 className="text-2xl font-black text-slate-800">
                    {selectedMessage.subject}
                  </h1>
                  <div className="flex gap-2">
                    <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2">
                      <Clock size={12} />{" "}
                      {formatDate(selectedMessage.timestamp)}
                    </span>
                    <button
                      onClick={() => handleDelete(selectedMessage.id)}
                      className="bg-red-50 text-red-500 px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    {selectedMessage.fromName?.[0]?.toUpperCase() || (
                      <User size={20} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">
                      {selectedMessage.fromName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {selectedMessage.from}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-8 text-slate-600 leading-relaxed whitespace-pre-wrap">
                {selectedMessage.body}
              </div>
              {/* Alleen in Inbox mag je 'beantwoorden' (in deze simpele versie) */}
              {viewMode === "inbox" && (
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setIsComposing(true);
                      setTo(selectedMessage.from);
                      setSubject(`Re: ${selectedMessage.subject}`);
                      setBody(
                        `\n\n--- Op ${formatDate(
                          selectedMessage.timestamp
                        )} schreef ${selectedMessage.fromName}: ---\n${
                          selectedMessage.body
                        }`
                      );
                    }}
                    className="text-blue-600 font-bold text-sm hover:underline px-4"
                  >
                    Beantwoorden
                  </button>
                </div>
              )}
            </div>
          )}

          {/* EMPTY STATE */}
          {!isComposing && !selectedMessage && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
              <Mail size={64} className="mb-4 opacity-20" />
              <p className="font-bold text-lg">Selecteer een bericht</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMessagesView;
