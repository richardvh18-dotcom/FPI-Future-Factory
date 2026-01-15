import React, { useState } from "react";
import { X, Send, Loader2, AlertCircle } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, appId } from "../../../config/firebase";

const ComposeModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    to: "admin",
    subject: "",
    content: "",
    priority: "normal",
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // FIX: Geen render als gesloten
  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.content) {
      setError("Vul alle verplichte velden in.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      if (!appId) throw new Error("Geen App ID gevonden");

      await addDoc(
        collection(db, "artifacts", appId, "public", "data", "messages"),
        {
          ...formData,
          sender: "Systeem",
          senderName: "Gebruiker",
          timestamp: serverTimestamp(),
          read: false,
          type: "user_message",
        }
      );

      // Succes: reset en sluit
      setFormData({
        to: "admin",
        subject: "",
        content: "",
        priority: "normal",
      });
      onClose();
    } catch (err) {
      console.error("Fout bij versturen:", err);
      setError("Kon bericht niet versturen. Controleer verbinding.");
    } finally {
      setSending(false);
    }
  };

  return (
    // Backdrop met hogere z-index en klik-om-te-sluiten
    <div
      className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-100 scale-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()} // Voorkom sluiten bij klik binnen modal
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-black text-slate-800 uppercase italic tracking-tight">
            Nieuw Bericht
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors group"
            aria-label="Sluiten"
          >
            <X
              size={20}
              className="text-slate-500 group-hover:text-slate-700"
            />
          </button>
        </div>

        {/* Form */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Onderwerp
              </label>
              <input
                type="text"
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Waar gaat het over?"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Aan
                </label>
                <select
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-500"
                  value={formData.to}
                  onChange={(e) =>
                    setFormData({ ...formData, to: e.target.value })
                  }
                >
                  <option value="admin">Administrators</option>
                  <option value="maintenance">Technische Dienst</option>
                  <option value="logistics">Logistiek</option>
                  <option value="quality">Kwaliteit (QC)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Prioriteit
                </label>
                <select
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-500"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                >
                  <option value="normal">Normaal</option>
                  <option value="high">Hoog</option>
                  <option value="urgent">Spoed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Bericht
              </label>
              <textarea
                required
                rows={4}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors resize-none"
                placeholder="Typ hier je bericht..."
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors text-sm"
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={sending}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center gap-2"
              >
                {sending ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <Send size={18} /> Versturen
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ComposeModal;
