import React, { useState, useEffect } from "react";
import {
  Inbox,
  Send,
  Trash2,
  UserPlus,
  AlertTriangle,
  Info,
  ArrowRight,
} from "lucide-react";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, appId } from "../../../config/firebase";

import InboxView from "./InboxView";

/**
 * MessagesManager
 * Beheert de inbox. De 'Compose' functionaliteit wordt nu via de parent (App.js) afgehandeld.
 */
const MessagesManager = ({ onBack, onCompose }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Laad Berichten
  useEffect(() => {
    if (!appId) return;
    const q = query(
      collection(db, "artifacts", appId, "public", "data", "messages"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const unreadCount = messages.filter((m) => !m.read).length;

  const handleMarkAsRead = async (id) => {
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "messages", id),
      { read: true }
    );
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bericht verwijderen?")) {
      await deleteDoc(
        doc(db, "artifacts", appId, "public", "data", "messages", id)
      );
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 text-left">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4 text-left">
          <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
            <Inbox size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase italic">
              Berichten Centrum
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {unreadCount} ongelezen berichten
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCompose} // Gebruik de globale compose trigger
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
          >
            <Send size={16} /> Nieuw Bericht
          </button>
          <button
            onClick={onBack}
            className="text-slate-400 font-bold uppercase text-xs hover:text-slate-600"
          >
            Terug
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-left">
        <div className="max-w-5xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              onClick={() => handleMarkAsRead(msg.id)}
              className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer group ${
                msg.read
                  ? "border-slate-100 opacity-80"
                  : "border-blue-200 shadow-md ring-1 ring-blue-50"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-3 rounded-xl shrink-0 ${
                    msg.type === "access_request" || msg.type === "system_alert"
                      ? "bg-orange-100 text-orange-600"
                      : msg.priority === "high"
                      ? "bg-red-100 text-red-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {msg.type === "access_request" ? (
                    <UserPlus size={20} />
                  ) : msg.type === "system_alert" ? (
                    <AlertTriangle size={20} />
                  ) : (
                    <Info size={20} />
                  )}
                </div>

                <div className="flex-1 text-left">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4
                        className={`text-sm font-bold ${
                          msg.read ? "text-slate-700" : "text-slate-900"
                        }`}
                      >
                        {msg.subject}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium">
                        Van: {msg.senderName || "Systeem"} •{" "}
                        {msg.timestamp?.toDate
                          ? msg.timestamp.toDate().toLocaleString()
                          : "Zojuist"}
                      </p>
                    </div>
                    {!msg.read && (
                      <span className="bg-blue-600 w-2 h-2 rounded-full"></span>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    {msg.content}
                  </p>

                  {msg.actionLink === "admin_users" && (
                    <div className="mt-4">
                      <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-colors">
                        Ga naar Gebruikersbeheer <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(msg.id);
                  }}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {messages.length === 0 && !loading && (
            <div className="text-center py-20 text-slate-300">
              <Inbox size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm font-bold uppercase tracking-widest">
                Geen berichten
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesManager;
