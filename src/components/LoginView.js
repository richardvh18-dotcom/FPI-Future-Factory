import React, { useState } from "react";
import {
  KeyRound,
  Mail,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Factory,
  UserPlus,
  X,
  Send,
  Building,
  CheckCircle,
} from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

// Helper voor App ID
const getAppId = () => {
  if (typeof window !== "undefined" && window.__app_id) return window.__app_id;
  return "fittings-app-v1";
};

const LoginView = ({
  onLogin,
  error,
  mustChangePassword,
  onPasswordChanged,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // States voor Aanvraag Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqData, setReqData] = useState({
    name: "",
    email: "",
    department: "",
  });
  const [reqStatus, setReqStatus] = useState("idle");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mustChangePassword) {
        await onPasswordChanged(newPassword);
      } else {
        await onLogin(email, password);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- NIEUWE LOGICA: VERSTUUR AANVRAAG + BERICHT ---
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setReqStatus("sending");
    const appId = getAppId();

    try {
      // 1. Maak de technische aanvraag in de database (voor AdminUsersView)
      await addDoc(
        collection(db, "artifacts", appId, "public", "data", "access_requests"),
        {
          ...reqData,
          status: "pending",
          requestDate: serverTimestamp(),
        }
      );

      // 2. STUUR BERICHT NAAR ADMIN INBOX
      await addDoc(
        collection(db, "artifacts", appId, "public", "data", "messages"),
        {
          type: "system_alert", // Speciaal type voor icoontjes
          target: "admin", // Doelgroep
          sender: "Systeem",
          senderName: "Login Portal",
          subject: `Aanvraag: ${reqData.name}`,
          content: `Nieuwe toegangsaanvraag ontvangen van ${reqData.name} voor afdeling ${reqData.department}. Controleer gebruikersbeheer.`,
          timestamp: serverTimestamp(),
          read: false,
          actionLink: "admin_users", // Hiermee kunnen we een "Ga naar" knop maken
        }
      );

      setReqStatus("success");

      // Reset na 3 seconden
      setTimeout(() => {
        setShowRequestModal(false);
        setReqStatus("idle");
        setReqData({ name: "", email: "", department: "" });
      }, 3000);
    } catch (err) {
      console.error("Aanvraag fout:", err);
      setReqStatus("error");
    }
  };

  const handleRequestAccess = () => {
    setShowRequestModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-950 to-blue-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/10 relative">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-slate-900 via-cyan-950 to-blue-950 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400"></div>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500 rounded-full blur-3xl opacity-20"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-600 rounded-full blur-3xl opacity-20"></div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20 shadow-lg">
              <Factory className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">
              FPI Future Factory
            </h1>
            <p className="text-cyan-200 text-sm font-medium mt-1 uppercase tracking-widest opacity-80">
              Digital Production Hub
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold flex items-center gap-3 border border-red-100 animate-in slide-in-from-top-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                {error}
              </div>
            )}

            {!mustChangePassword ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                    E-mailadres
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 transition-all font-medium"
                      placeholder="naam@futurepipe.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                    Wachtwoord
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <KeyRound className="h-5 w-5 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 transition-all font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Nieuw Wachtwoord
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  </div>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 placeholder-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                    placeholder="Kies een veilig wachtwoord"
                  />
                </div>
                <p className="text-xs text-emerald-600 font-medium px-1">
                  Je logt voor het eerst in. Stel een nieuw wachtwoord in.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-cyan-900 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all shadow-lg hover:shadow-cyan-900/30 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <>
                  {mustChangePassword ? "Wachtwoord Opslaan" : "Inloggen"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Aanvraag Knop */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col items-center">
            <button
              type="button"
              onClick={handleRequestAccess}
              className="text-slate-400 hover:text-cyan-700 text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors"
            >
              <UserPlus size={16} /> Nieuwe Gebruiker Aanvragen
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            © 2026 Future Pipe Industries
          </p>
        </div>

        {/* AANVRAAG MODAL */}
        {showRequestModal && (
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                  Toegang Aanvragen
                </h3>
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="p-1 hover:bg-slate-200 rounded-full"
                >
                  <X size={18} className="text-slate-500" />
                </button>
              </div>

              {reqStatus === "success" ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                    <CheckCircle size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 mb-2">
                    Aanvraag Verstuurd!
                  </h4>
                  <p className="text-sm text-slate-500">
                    De beheerder heeft je verzoek ontvangen.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRequestSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Volledige Naam
                    </label>
                    <input
                      type="text"
                      required
                      value={reqData.name}
                      onChange={(e) =>
                        setReqData({ ...reqData, name: e.target.value })
                      }
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-cyan-500"
                      placeholder="Jouw Naam"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      E-mailadres
                    </label>
                    <input
                      type="email"
                      required
                      value={reqData.email}
                      onChange={(e) =>
                        setReqData({ ...reqData, email: e.target.value })
                      }
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-cyan-500"
                      placeholder="jouw@email.com"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Afdeling
                    </label>
                    <div className="relative">
                      <Building
                        size={16}
                        className="absolute left-3 top-3.5 text-slate-400"
                      />
                      <select
                        required
                        value={reqData.department}
                        onChange={(e) =>
                          setReqData({ ...reqData, department: e.target.value })
                        }
                        className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-cyan-500 appearance-none"
                      >
                        <option value="">Kies Afdeling...</option>
                        <option value="Productie">Productie</option>
                        <option value="Kwaliteit">Kwaliteit (QC)</option>
                        <option value="Logistiek">Logistiek</option>
                        <option value="Management">Management</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={reqStatus === "sending"}
                    className="w-full py-3 bg-cyan-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-cyan-700 transition-colors shadow-lg shadow-cyan-200 disabled:opacity-50"
                  >
                    {reqStatus === "sending" ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        <Send size={16} /> Verstuur Aanvraag
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginView;
