import React, { useState, useEffect } from "react";
import {
  X,
  Send,
  User,
  Users,
  ChevronDown,
  Loader2,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db, appId } from "../../../config/firebase";

const ComposeModal = ({ onClose, onSend, currentUserEmail }) => {
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecipients = async () => {
      try {
        const querySnapshot = await getDocs(
          collection(db, "artifacts", appId, "public", "data", "user_roles")
        );
        const userList = querySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          // Filter huidige gebruiker uit de lijst (case insensitive)
          .filter(
            (u) =>
              (u.email || "").toLowerCase() !==
              (currentUserEmail || "").toLowerCase()
          );

        setAvailableUsers(userList);
      } catch (error) {
        console.error("Fout bij laden ontvangers:", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchRecipients();
  }, [currentUserEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!recipient) return setError("Selecteer een ontvanger.");
    if (!subject.trim()) return setError("Vul een onderwerp in.");
    if (!content.trim()) return setError("Typ een bericht.");
    if (isSending) return;

    setIsSending(true);
    try {
      // Forceer lowercase bij verzenden voor consistentie
      await onSend({
        to: recipient.toLowerCase(),
        subject: subject.trim(),
        content: content.trim(),
        from: currentUserEmail.toLowerCase(),
        read: false,
        type: recipient === "all" ? "broadcast" : "private",
      });

      onClose();
    } catch (err) {
      setError("Verzenden mislukt. Probeer het opnieuw.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-2.5 rounded-2xl text-slate-900">
              <MessageSquare size={20} />
            </div>
            <h2 className="text-lg font-black uppercase italic">
              Nieuw Bericht
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 p-3 text-red-600 text-xs font-bold flex items-center gap-2 border-b border-red-100">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar"
        >
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Ontvanger
            </label>
            <div className="relative">
              <select
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-12 py-4 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 appearance-none"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
              >
                <option value="">- Kies een collega -</option>
                <option
                  value="all"
                  className="text-emerald-600 font-black italic"
                >
                  📢 IEDEREEN (Broadcast)
                </option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.email}>
                    {u.name || u.email} ({u.role})
                  </option>
                ))}
              </select>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                {recipient === "all" ? <Users size={20} /> : <User size={20} />}
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Onderwerp
            </label>
            <input
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-emerald-500"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Bericht
            </label>
            <textarea
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-sm font-medium outline-none focus:border-emerald-500 min-h-[160px] resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>
        </form>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-4 text-[10px] font-black uppercase text-slate-400"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={isSending}
            className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-emerald-600 disabled:opacity-50 transition-all"
          >
            {isSending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
            Bericht Verzenden
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComposeModal;
