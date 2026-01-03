import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, appId } from "../config/firebase";
// TOEGEVOEGD: Shield icoon in de import
import {
  Lock,
  Mail,
  User,
  MapPin,
  Send,
  ChevronLeft,
  Shield,
} from "lucide-react";

const LoginView = ({ onLogin }) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Aanvraag formulier state
  const [requestData, setRequestData] = useState({
    name: "",
    email: "",
    country: "Nederland",
  });
  const [message, setMessage] = useState("");

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  const handleRequestAccess = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "artifacts", appId, "account_requests"), {
        ...requestData,
        timestamp: serverTimestamp(),
        status: "pending",
      });
      setMessage("Aanvraag verzonden! We nemen contact met je op.");

      // Keer na 3 seconden automatisch terug naar het inlogscherm
      setTimeout(() => {
        setIsRequesting(false);
        setMessage("");
        setRequestData({ name: "", email: "", country: "Nederland" });
      }, 3000);
    } catch (error) {
      alert("Fout bij aanvraag: " + error.message);
    }
  };

  // --- WEERGAVE: AANVRAAG FORMULIER ---
  if (isRequesting) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in duration-300">
          <button
            onClick={() => setIsRequesting(false)}
            className="flex items-center gap-2 text-slate-400 hover:text-blue-600 mb-6 transition-colors group"
          >
            <ChevronLeft
              size={18}
              className="group-hover:-translate-x-1 transition-transform"
            />
            <span className="text-xs font-bold uppercase tracking-widest">
              Terug naar login
            </span>
          </button>

          <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">
            Toegang Aanvragen
          </h2>
          <p className="text-slate-500 text-sm mb-8 font-medium">
            Laat je gegevens achter. Een beheerder zal je aanvraag beoordelen.
          </p>

          {message ? (
            <div className="bg-emerald-50 text-emerald-700 p-6 rounded-2xl text-center font-bold animate-in slide-in-from-bottom-4">
              <div className="bg-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Send size={20} />
              </div>
              {message}
            </div>
          ) : (
            <form onSubmit={handleRequestAccess} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">
                  Volledige Naam
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-3 text-slate-300"
                    size={18}
                  />
                  <input
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="bijv. Richard V."
                    value={requestData.name}
                    onChange={(e) =>
                      setRequestData({ ...requestData, name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">
                  E-mail Adres
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-3 text-slate-300"
                    size={18}
                  />
                  <input
                    required
                    type="email"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="naam@bedrijf.nl"
                    value={requestData.email}
                    onChange={(e) =>
                      setRequestData({ ...requestData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">
                  Land / Regio
                </label>
                <div className="relative">
                  <MapPin
                    className="absolute left-3 top-3 text-slate-300"
                    size={18}
                  />
                  <input
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="bijv. Nederland"
                    value={requestData.country}
                    onChange={(e) =>
                      setRequestData({
                        ...requestData,
                        country: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 mt-4"
              >
                <Send size={18} /> Verzend Aanvraag
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // --- WEERGAVE: STANDAARD LOGIN ---
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-8">
        <div className="text-center mb-10">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg rotate-3">
            <Shield className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">
            GRE Fittings
          </h1>
          <p className="text-slate-400 text-[10px] font-black tracking-[0.2em] uppercase">
            Product Database v1.0
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-slate-300" size={18} />
            <input
              required
              type="email"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-slate-300" size={18} />
            <input
              required
              type="password"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Wachtwoord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-slate-800 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200/50"
          >
            Inloggen
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-50 text-center">
          <p className="text-xs text-slate-400 mb-4 font-medium">
            Nog geen toegang tot de database?
          </p>
          <button
            onClick={() => setIsRequesting(true)}
            className="text-blue-600 text-xs font-black uppercase tracking-widest hover:text-blue-800 transition-colors border-b-2 border-transparent hover:border-blue-800 pb-1"
          >
            Toegang aanvragen
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
