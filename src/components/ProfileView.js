import React, { useState } from "react";
import { User, Shield, Clock, Save, Key, LogOut } from "lucide-react";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { updateProfile, updatePassword, getAuth } from "firebase/auth";

const ProfileView = () => {
  const { user, role, logout } = useAdminAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [newPassword, setNewPassword] = useState("");
  const [isSaving, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setMessage(null);

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (displayName !== user.displayName) {
        await updateProfile(currentUser, { displayName: displayName });
      }

      if (newPassword) {
        await updatePassword(currentUser, newPassword);
      }

      setMessage({ type: "success", text: "Profiel succesvol bijgewerkt." });
      setNewPassword("");
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Fout bij opslaan: " + error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full py-10 px-6 animate-in fade-in duration-500 overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center border-b border-slate-200 pb-8">
          <div className="w-24 h-24 bg-slate-900 text-white rounded-full flex items-center justify-center text-4xl font-black mx-auto mb-4 shadow-xl">
            {user?.displayName?.charAt(0).toUpperCase() ||
              user?.email?.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-3xl font-black text-slate-800 uppercase italic tracking-tight">
            Mijn Profiel
          </h1>
          <p className="text-slate-500 font-medium">{user?.email}</p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Info */}
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <User size={16} /> Account Gegevens
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Volledige Naam
                </label>
                <input
                  type="text"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Nieuw Wachtwoord
                </label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3">
                  <Key size={18} className="text-slate-400" />
                  <input
                    type="password"
                    className="w-full p-3 bg-transparent font-bold text-slate-800 outline-none"
                    placeholder="Laat leeg om te behouden"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              {message && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold text-center ${
                    message.type === "success"
                      ? "bg-green-50 text-green-600"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  "Opslaan..."
                ) : (
                  <>
                    <Save size={16} /> Wijzigingen Opslaan
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Rol & Rechten (Read Only) */}
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 flex flex-col">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Shield size={16} /> Rol & Toegang
            </h3>
            <div className="space-y-4 flex-1">
              <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">
                  <Shield size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    Huidige Rol
                  </p>
                  <p className="text-lg font-black text-slate-800 uppercase">
                    {role}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm text-emerald-600">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    Laatst Ingelogd
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {user?.metadata?.lastSignInTime
                      ? new Date(user.metadata.lastSignInTime).toLocaleString()
                      : "-"}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="mt-6 w-full py-3 border-2 border-red-100 text-red-500 hover:bg-red-50 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={16} /> Uitloggen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
