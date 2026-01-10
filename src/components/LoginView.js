import React, { useState, useEffect } from "react";
import {
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Key,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import { auth } from "../config/firebase";
import { sendPasswordResetEmail, updatePassword } from "firebase/auth";

/**
 * LoginView: Behandelt Login, Wachtwoord Vergeten en Verplichte Wachtwoordwijziging.
 * Bevat een 'shake' animatie bij foutieve invoer.
 */
const LoginView = ({
  onLogin,
  error,
  mustChangePassword,
  onPasswordChanged,
}) => {
  const [view, setView] = useState("login"); // login | forgot | change
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [shake, setShake] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // Trigger shake animatie bij fouten van buitenaf (props)
  useEffect(() => {
    if (error) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Als de App aangeeft dat het wachtwoord gewijzigd MOET worden
  useEffect(() => {
    if (mustChangePassword) setView("change");
  }, [mustChangePassword]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg("Er is een herstellink verzonden naar je e-mailadres.");
      setTimeout(() => setView("login"), 5000);
    } catch (err) {
      setLocalError("Kon geen herstelmail sturen. Controleer het e-mailadres.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setLocalError("Wachtwoorden komen niet overeen.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (newPassword.length < 6) {
      setLocalError("Wachtwoord moet minimaal 6 tekens zijn.");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      if (onPasswordChanged) await onPasswordChanged();
      setSuccessMsg("Wachtwoord succesvol bijgewerkt!");
    } catch (err) {
      setLocalError(
        "Sessie verlopen. Log opnieuw in met je tijdelijke wachtwoord."
      );
      setTimeout(() => window.location.reload(), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Achtergrond decoratie */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
      </div>

      <div
        className={`w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden relative z-10 transition-transform duration-500 ${
          shake ? "animate-shake" : ""
        }`}
      >
        {/* Progressie balk voor Password Change */}
        {view === "change" && <div className="h-2 bg-blue-500 animate-pulse" />}

        <div className="p-10">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-slate-900 p-4 rounded-3xl mb-4 shadow-xl">
              <ShieldCheck className="text-emerald-400" size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">
              FPI <span className="text-emerald-500">Technical Hub</span>
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
              {view === "login"
                ? "Beveiligde Toegang"
                : view === "forgot"
                ? "Wachtwoord Herstellen"
                : "Nieuw Wachtwoord Instellen"}
            </p>
          </div>

          {(error || localError) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold animate-in fade-in zoom-in duration-300">
              <AlertCircle size={18} />
              {localError || error}
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-xs font-bold animate-in fade-in zoom-in duration-300">
              <CheckCircle2 size={18} />
              {successMsg}
            </div>
          )}

          {/* VIEW: LOGIN */}
          {view === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={18}
                />
                <input
                  type="email"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:border-emerald-500 transition-all"
                  placeholder="E-mailadres"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={18}
                />
                <input
                  type="password"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:border-emerald-500 transition-all"
                  placeholder="Wachtwoord"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setView("forgot")}
                  className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-500 transition-colors"
                >
                  Wachtwoord vergeten?
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    Inloggen <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {view === "forgot" && (
            <form onSubmit={handleResetRequest} className="space-y-6">
              <p className="text-xs text-slate-500 font-medium leading-relaxed text-center mb-4">
                Vul je e-mailadres in. We sturen je een link om een nieuw
                wachtwoord aan te maken.
              </p>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={18}
                />
                <input
                  type="email"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:border-blue-500"
                  placeholder="Je werk e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "Herstellink Versturen"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="w-full text-slate-400 font-black text-[10px] uppercase tracking-widest py-2 flex items-center justify-center gap-1"
                >
                  <ChevronLeft size={14} /> Terug naar Login
                </button>
              </div>
            </form>
          )}

          {/* VIEW: CHANGE PASSWORD (FIRST TIME) */}
          {view === "change" && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6">
                <p className="text-blue-700 text-xs font-bold leading-relaxed flex items-start gap-2">
                  <Key size={16} className="shrink-0" />
                  Je logt voor het eerst in met een tijdelijk wachtwoord. Stel
                  nu een eigen veilig wachtwoord in.
                </p>
              </div>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={18}
                />
                <input
                  type="password"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:border-blue-500"
                  placeholder="Nieuw Wachtwoord"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="relative">
                <ShieldCheck
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={18}
                />
                <input
                  type="password"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:border-blue-500"
                  placeholder="Bevestig Wachtwoord"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Wachtwoord Opslaan"
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

export default LoginView;
