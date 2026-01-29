import React, { useState } from "react";
import { useMessages } from "../../hooks/useMessages";
import { useAdminAuth } from "../../hooks/useAdminAuth";
import { Mail, Archive, Trash2, CheckCircle, Inbox, User } from "lucide-react";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useNavigate } from "react-router-dom";

const AdminMessagesView = () => {
  const { user } = useAdminAuth();
  const { messages, loading } = useMessages(user);
  const [activeTab, setActiveTab] = useState("inbox"); // 'inbox', 'archived'
  const [selectedMessage, setSelectedMessage] = useState(null);
  const navigate = useNavigate();

  const appId = typeof __app_id !== "undefined" ? __app_id : "fittings-app-v1";

  // Filter messages for tabs
  const filteredMessages = messages.filter((m) => {
    if (activeTab === "inbox") return !m.archived;
    if (activeTab === "archived") return m.archived;
    return true;
  });

  const handleMarkAsRead = async (msg) => {
    if (msg.read) return;
    try {
      const ref = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "messages",
        msg.id
      );
      await updateDoc(ref, { read: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = async (msg) => {
    try {
      const ref = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "messages",
        msg.id
      );
      await updateDoc(ref, { archived: !msg.archived });
      if (selectedMessage?.id === msg.id) setSelectedMessage(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (msg) => {
    if (!window.confirm("Bericht definitief verwijderen?")) return;
    try {
      const ref = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "messages",
        msg.id
      );
      await deleteDoc(ref);
      if (selectedMessage?.id === msg.id) setSelectedMessage(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectMessage = (msg) => {
    setSelectedMessage(msg);
    handleMarkAsRead(msg);
  };

  if (loading)
    return (
      <div className="p-8 text-center text-slate-400">Berichten laden...</div>
    );

  return (
    <div className="flex flex-col md:flex-row h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden m-4 md:m-6 animate-in fade-in">
      {/* Sidebar List */}
      <div
        className={`w-full md:w-1/3 border-r border-slate-200 flex flex-col ${
          selectedMessage ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b border-slate-200 flex gap-2 bg-slate-50/50">
          <button
            onClick={() => {
              setActiveTab("inbox");
              setSelectedMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === "inbox"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <Inbox size={16} /> Inbox
          </button>
          <button
            onClick={() => {
              setActiveTab("archived");
              setSelectedMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === "archived"
                ? "bg-slate-800 text-white shadow-md"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <Archive size={16} /> Archief
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredMessages.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center text-slate-400">
              <Mail size={32} className="mb-2 opacity-50" />
              <p className="text-sm italic font-medium">
                Geen berichten in {activeTab}.
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => handleSelectMessage(msg)}
                className={`p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-50 group relative
                                    ${!msg.read ? "bg-blue-50/60" : ""} 
                                    ${
                                      selectedMessage?.id === msg.id
                                        ? "bg-blue-50 border-l-4 border-l-blue-600"
                                        : "border-l-4 border-l-transparent"
                                    }
                                `}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <span
                    className={`text-xs ${
                      !msg.read
                        ? "font-black text-slate-900"
                        : "font-bold text-slate-600"
                    }`}
                  >
                    {msg.from || "Systeem"}
                  </span>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                    {msg.timestamp.toLocaleDateString()}
                  </span>
                </div>
                <h4
                  className={`text-sm mb-1 truncate leading-tight ${
                    !msg.read ? "font-bold text-blue-700" : "text-slate-700"
                  }`}
                >
                  {msg.subject}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {msg.content}
                </p>
                {!msg.read && (
                  <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full shadow-sm"></div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Message Detail */}
      <div
        className={`flex-1 flex-col bg-slate-50/30 ${
          !selectedMessage ? "hidden md:flex" : "flex"
        }`}
      >
        {selectedMessage ? (
          <>
            <div className="p-6 border-b border-slate-200 bg-white shadow-sm z-10">
              <div className="flex justify-between items-start mb-4">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="md:hidden text-slate-400 hover:text-slate-600 mb-2"
                >
                  Terug
                </button>
                <div className="flex-1 pr-4">
                  <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">
                    {selectedMessage.subject}
                  </h2>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleArchive(selectedMessage)}
                    className="p-2.5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-xl transition-colors border border-slate-200"
                    title={
                      selectedMessage.archived ? "Terugzetten" : "Archiveren"
                    }
                  >
                    <Archive size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(selectedMessage)}
                    className="p-2.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-xl transition-colors border border-slate-200"
                    title="Verwijderen"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 inline-flex">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-200">
                  <User size={16} />
                </div>
                <div>
                  <span className="font-bold text-slate-700 block text-xs uppercase tracking-wide">
                    Van: {selectedMessage.from || "Systeem"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {selectedMessage.timestamp.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-8 overflow-y-auto flex-1 text-slate-700 leading-relaxed text-sm">
              {selectedMessage.content.split("\n").map((line, i) => (
                <p key={i} className="mb-3">
                  {line}
                </p>
              ))}

              {/* Actie knop voor validatie alerts */}
              {selectedMessage.type === "validation_alert" && (
                <div className="mt-8 p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col sm:flex-row items-center gap-6 shadow-sm">
                  <div className="bg-white p-3 rounded-full shadow-sm text-emerald-600">
                    <CheckCircle size={32} />
                  </div>
                  <div className="text-center sm:text-left">
                    <h4 className="font-bold text-emerald-900 text-lg">
                      Validatie Vereist
                    </h4>
                    <p className="text-sm text-emerald-700 mt-1">
                      Er staat een nieuw product klaar dat uw goedkeuring
                      vereist.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/admin/products")}
                    className="ml-auto w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                  >
                    Ga naar Producten
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8 text-center">
            <div className="bg-slate-100 p-6 rounded-full mb-4">
              <Mail size={48} className="opacity-50 text-slate-400" />
            </div>
            <h3 className="text-lg font-black text-slate-400 mb-1">
              Geen bericht geselecteerd
            </h3>
            <p className="text-sm">
              Kies een bericht uit de lijst om de details te bekijken.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMessagesView;
