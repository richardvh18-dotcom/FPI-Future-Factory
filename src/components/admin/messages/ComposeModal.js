import React, { useState, useEffect, useRef } from "react";
import { X, Send, Users, User, Loader2, Search } from "lucide-react";
import { useUsers } from "../../../hooks/useUsers";

const ComposeModal = ({ onClose, onSend, currentUserEmail }) => {
  const { users, loading: usersLoading } = useUsers();
  const [formData, setFormData] = useState({
    to: "",
    subject: "",
    body: "",
  });
  const [sending, setSending] = useState(false);

  // Autocomplete states
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Sluit dropdown als je er buiten klikt
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter gebruikers logica
  const filteredUsers = users.filter(
    (u) =>
      u.email !== currentUserEmail &&
      ((u.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (u.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()))
  );

  const handleSelectUser = (email, name) => {
    setFormData({ ...formData, to: email });
    setSearchTerm(name || email); // Toon de naam in het veld
    setShowDropdown(false);
  };

  const handleSelectBroadcast = () => {
    setFormData({ ...formData, to: "all" });
    setSearchTerm("📢 Iedereen (Broadcast)");
    setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.to || !formData.subject || !formData.body) return;

    setSending(true);
    await onSend(formData.to, formData.subject, formData.body);
    setSending(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-white/50 overflow-hidden flex flex-col">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-slate-800 flex items-center gap-2">
            <Send size={18} className="text-blue-500" /> Nieuw Bericht
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
              Aan
            </label>
            <div className="relative">
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pl-9 text-sm font-bold focus:border-blue-500 outline-none"
                placeholder="Zoek op naam of e-mail..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setFormData({ ...formData, to: "" }); // Reset selectie bij typen
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                disabled={usersLoading}
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                {formData.to === "all" ? (
                  <Users size={16} />
                ) : (
                  <User size={16} />
                )}
              </div>
            </div>

            {/* Dropdown Lijst */}
            {showDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
                {usersLoading ? (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    Laden...
                  </div>
                ) : (
                  <>
                    {/* Broadcast Optie (als zoekterm matcht of leeg is) */}
                    {"iedereen broadcast all".includes(
                      searchTerm.toLowerCase()
                    ) && (
                      <div
                        onClick={handleSelectBroadcast}
                        className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-2 text-sm font-bold text-purple-600 border-b border-slate-100"
                      >
                        <Users size={14} /> 📢 Iedereen (Broadcast)
                      </div>
                    )}

                    {/* Gebruikers Lijst */}
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => handleSelectUser(u.email, u.name)}
                          className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex flex-col border-b border-slate-50 last:border-0"
                        >
                          <span className="text-sm font-bold text-slate-700">
                            {u.name || "Naamloos"}
                          </span>
                          <span className="text-xs text-slate-400">
                            {u.email} ({u.role})
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400">
                        Geen gebruikers gevonden.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
              Onderwerp
            </label>
            <input
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-blue-500 outline-none"
              placeholder="Waar gaat het over?"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
              Bericht
            </label>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-blue-500 outline-none min-h-[150px] resize-none"
              placeholder="Typ hier je bericht..."
              value={formData.body}
              onChange={(e) =>
                setFormData({ ...formData, body: e.target.value })
              }
              required
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={sending || !formData.to}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Send size={16} />
              )}
              {sending ? "Verzenden..." : "Versturen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComposeModal;
