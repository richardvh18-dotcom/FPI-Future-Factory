import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInAnonymously,
} from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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
  AlertCircle,
} from "lucide-react";

import { db } from "../config/firebase";

const getAppId = () => {
  if (typeof window !== "undefined" && window.__app_id) return window.__app_id;
  return "fittings-app-v1";
};

const LoginView = ({ onLogin, error: externalError }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [mustChangePassword, setMustChangePassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();

  // Aanvraag State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqData, setReqData] = useState({
    name: "",
    email: "",
    department: "",
  });
  const [reqStatus, setReqStatus] = useState("idle"); // 'idle' | 'sending' | 'success' | 'error'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Poging tot inloggen
      if (onLogin) {
        await onLogin(email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        const from = location.state?.from?.pathname || "/portal";
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error("Login fout:", err);
      let msg = "Inloggen mislukt. Controleer uw gegevens.";
      if (err.code === "auth/invalid-credential")
        msg = "Ongeldig e-mailadres of wachtwoord.";
      if (err.code === "auth/user-not-found")
        msg = "Geen account gevonden met dit e-mailadres.";
      if (err.code === "auth/too-many-requests")
        msg = "Te veel pogingen. Wacht even.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * AFHANDELING TOEGANGSAANVRAAG
   * Zorgt voor tijdelijke authenticatie om data te mogen schrijven
   */
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (reqStatus === "sending") return;

    setReqStatus("sending");
    const appId = getAppId();

    try {
      // CRUCIAAL: Als we niet ingelogd zijn, kunnen we niet schrijven naar Firestore.
      // We melden ons anoniem aan om het verzoek te kunnen versturen.
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      // 1. Sla aanvraag op in de database
      // Pad: artifacts/{appId}/public/data/access_requests
      const requestRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "access_requests"
      );
      await addDoc(requestRef, {
        ...reqData,
        status: "pending",
        requestDate: serverTimestamp(),
        source: "Login Portal",
      });

      // 2. Stuur systeem-notificatie naar admin inbox
      const messagesRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "messages"
      );
      await addDoc(messagesRef, {
        type: "system_alert",
        target: "admin",
        from: "SYSTEM",
        fromName: "Login Portal",
        to: "admin",
        subject: `Nieuwe aanvraag: ${reqData.name}`,
        content: `${reqData.name} (${reqData.email}) heeft toegang aangevraagd voor afdeling ${reqData.department}. Controleer de aanvraag in het beheerpaneel.`,
        timestamp: serverTimestamp(),
        read: false,
        archived: false,
        priority: "high",
      });

      setReqStatus("success");

      // Sluit modal na 3 seconden bij succes
      setTimeout(() => {
        setShowRequestModal(false);
        setReqStatus("idle");
        setReqData({ name: "", email: "", department: "" });
      }, 3000);
    } catch (err) {
      console.error("Aanvraag verzenden mislukt:", err);
      setReqStatus("error");
      // Toon specifieke fout in de console voor debugging
      alert(
        "Er is iets misgegaan bij het versturen: " +
          (err.message || "Onbekende fout")
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-blue-950 flex items-center justify-center p-4">
      {/* ACHTERGROND EFFECTEN */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl overflow-hidden border border-white/10 relative z-10 animate-in fade-in zoom-in-95 duration-700">
        {/* HEADER */}
        <div className="bg-gradient-to-br from-slate-900 to-emerald-900 p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-emerald-500 to-blue-400"></div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-white/10 rounded-[24px] flex items-center justify-center mb-6 backdrop-blur-md border border-white/20 shadow-2xl rotate-3">
              <Factory className="text-emerald-400 w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">
              Future <span className="text-emerald-400">Factory</span>
            </h1>
            <p className="text-emerald-200/60 text-[10px] font-bold mt-3 uppercase tracking-[0.4em] opacity-80">
              Digital MES Environment
            </p>
          </div>
        </div>

        <div className="p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {(error || externalError) && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-black flex items-center gap-3 border border-red-100 animate-in shake duration-300">
                <AlertCircle size={18} className="shrink-0" />
                {error || externalError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                E-mailadres
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-14 pr-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-sm"
                  placeholder="naam@futurepipe.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Wachtwoord
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-14 pr-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-emerald-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl hover:shadow-emerald-900/20 active:scale-[0.98] disabled:opacity-50 mt-4"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <>
                  Inloggen op Hub
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className="group text-slate-400 hover:text-emerald-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all"
            >
              <div className="p-2 bg-slate-50 group-hover:bg-emerald-50 rounded-lg transition-colors">
                <UserPlus size={16} />
              </div>
              Nieuwe Gebruiker Aanvragen
            </button>
          </div>
        </div>

        <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
            Secure MES Access Control
          </p>
        </div>

        {/* MODAL VOOR TOEGANGSAANVRAAG */}
        {showRequestModal && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 relative">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-slate-800 text-xs uppercase tracking-[0.2em] italic text-left w-full">
                  Toegang Aanvragen
                </h3>
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {reqStatus === "success" ? (
                <div className="p-12 text-center animate-in fade-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 shadow-inner">
                    <CheckCircle size={40} />
                  </div>
                  <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-3">
                    Aanvraag Verzonden!
                  </h4>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    Bedankt{" "}
                    <span className="font-bold text-slate-800">
                      {reqData.name}
                    </span>
                    . <br />
                    De beheerder heeft uw verzoek ontvangen en zal dit
                    beoordelen.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleRequestSubmit}
                  className="p-8 space-y-5 text-left"
                >
                  {reqStatus === "error" && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold flex items-center gap-2 border border-red-100 mb-2">
                      <AlertCircle size={14} /> Fout bij verzenden. Probeer het
                      opnieuw.
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Volledige Naam
                    </label>
                    <input
                      type="text"
                      required
                      value={reqData.name}
                      onChange={(e) =>
                        setReqData({ ...reqData, name: e.target.value })
                      }
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 transition-all shadow-sm"
                      placeholder="Richard van Heerde"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Werk E-mail
                    </label>
                    <input
                      type="email"
                      required
                      value={reqData.email}
                      onChange={(e) =>
                        setReqData({ ...reqData, email: e.target.value })
                      }
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 transition-all shadow-sm"
                      placeholder="richard@fpi.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Afdeling
                    </label>
                    <div className="relative">
                      <Building
                        size={16}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <select
                        required
                        value={reqData.department}
                        onChange={(e) =>
                          setReqData({ ...reqData, department: e.target.value })
                        }
                        className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 appearance-none shadow-sm cursor-pointer"
                      >
                        <option value="">Kies een afdeling...</option>
                        <option value="Productie">Productie</option>
                        <option value="Engineering">Engineering</option>
                        <option value="QC">Kwaliteitscontrole</option>
                        <option value="Logistiek">Logistiek</option>
                        <option value="Beheer">Beheer / IT</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={reqStatus === "sending"}
                    className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 active:scale-95 disabled:opacity-50 mt-4"
                  >
                    {reqStatus === "sending" ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        <Send size={18} /> Verstuur Verzoek
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
