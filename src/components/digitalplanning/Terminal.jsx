import React, { useState, useEffect, useRef } from "react";
import {
  Scan,
  ArrowRight,
  Loader2,
  Camera,
  Zap,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

/**
 * Terminal V2.0
 * - RESTORE: Volledige scan en invoer functionaliteit.
 * - UI: Visueel 'Camera Frame' toegevoegd voor scan simulatie/focus.
 * - FIX: Directe validatie van 15-cijferige lotnummers.
 */
const Terminal = ({
  currentStation,
  products,
  onNextStep,
  notify,
  loading,
}) => {
  const [input, setInput] = useState("");
  const [isValid, setIsValid] = useState(false);
  const inputRef = useRef(null);

  // Focus input automatisch voor snelle workflow
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  useEffect(() => {
    // Check of het een geldig 15-cijferig lotnummer is (40...)
    setIsValid(input.length === 15 && input.startsWith("40"));
  }, [input]);

  const handleConfirm = () => {
    if (!input || loading) return;
    const cleanInput = input.trim().toUpperCase();
    const productMatch = products.find((p) => p.lotNumber === cleanInput);

    if (productMatch) {
      onNextStep(productMatch);
      setInput("");
    } else {
      notify("Lotnummer niet gevonden in systeem", "error");
    }
  };

  return (
    <div className="h-full flex items-center justify-center max-w-4xl mx-auto px-6 animate-in fade-in duration-500 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center w-full">
        {/* SCAN / CAMERA GEDEELTE (VISUEEL) */}
        <div className="bg-slate-900 rounded-[50px] aspect-square relative overflow-hidden border-8 border-white shadow-2xl group">
          {/* Scan Overlay / Camera Frame */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
            <div className="w-full h-full border-2 border-blue-500/30 rounded-[40px] relative">
              {/* Hoekjes van het frame */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-3xl" />
              <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-3xl" />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-3xl" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-3xl" />

              {/* Animatie Scan Lijn */}
              <div className="absolute left-4 right-4 h-1 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan-move top-1/2" />

              <div className="h-full flex flex-col items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                <Camera size={80} className="text-white mb-4" />
                <p className="text-white text-[10px] font-black uppercase tracking-[0.4em]">
                  Ready to scan
                </p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-blue-600/20 backdrop-blur-md px-6 py-2 rounded-full border border-blue-500/50">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic flex items-center gap-2">
              <Zap size={12} fill="currentColor" /> Machine {currentStation?.id}{" "}
              Focus
            </span>
          </div>
        </div>

        {/* INPUT GEDEELTE */}
        <div className="bg-white p-12 rounded-[50px] shadow-2xl border border-slate-100 text-center flex flex-col h-full justify-between">
          <div className="text-left">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-lg">
                <Scan size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800">
                  Terminal Invoer
                </h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">
                  Handmatig of Scanner
                </p>
              </div>
            </div>
            <div className="h-px bg-slate-100 my-8" />
          </div>

          <div className="space-y-8 text-left">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">
                Lotnummer (15 cijfers)
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  className={`w-full bg-slate-50 border-4 rounded-[30px] p-8 text-center text-3xl font-black tracking-[0.2em] uppercase outline-none transition-all shadow-inner ${
                    isValid
                      ? "border-emerald-500 bg-emerald-50/30"
                      : "border-slate-100 focus:border-blue-500"
                  }`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                  placeholder="40XXXXXXX"
                  maxLength={15}
                />
                {isValid && (
                  <div className="absolute -top-3 right-8 bg-emerald-500 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-2 shadow-lg">
                    <CheckCircle2 size={12} /> Formaat OK
                  </div>
                )}
              </div>
            </div>

            <button
              disabled={input.length < 10 || loading}
              onClick={handleConfirm}
              className={`w-full py-8 rounded-[35px] font-black uppercase text-xl shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-95 ${
                input.length >= 10
                  ? "bg-slate-900 text-white hover:bg-emerald-600"
                  : "bg-slate-100 text-slate-300"
              }`}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  Voltooi Fase <ArrowRight size={24} />
                </>
              )}
            </button>
          </div>

          <div className="mt-12 flex items-center gap-4 p-4 bg-blue-50 rounded-3xl border border-blue-100">
            <ShieldAlert size={20} className="text-blue-500 shrink-0" />
            <p className="text-[10px] font-bold text-blue-700 uppercase italic leading-tight text-left">
              Na bevestiging wordt de unit automatisch verplaatst naar het
              volgende station in de procesflow.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan-move {
          0% { top: 15%; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 85%; opacity: 0; }
        }
        .animate-scan-move {
          animation: scan-move 2.5s infinite linear;
          position: absolute;
        }
      `}</style>
    </div>
  );
};

export default Terminal;
