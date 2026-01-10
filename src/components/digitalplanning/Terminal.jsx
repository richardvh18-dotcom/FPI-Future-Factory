import React, { useState } from "react";
import { Scan, ArrowRight, Loader2 } from "lucide-react";

const Terminal = ({
  currentStation,
  products,
  onNextStep,
  notify,
  loading,
}) => {
  const [input, setInput] = useState("");

  const handleConfirm = () => {
    if (!input || loading) return;
    const cleanInput = input.trim().toUpperCase();
    const productMatch = products.find((p) => p.lotNumber === cleanInput);

    if (productMatch) {
      onNextStep(productMatch);
      setInput("");
    } else {
      notify("Lotnummer niet gevonden", "error");
    }
  };

  return (
    <div className="h-full flex items-center justify-center max-w-2xl mx-auto px-6 animate-in fade-in duration-500">
      <div className="bg-white w-full p-10 rounded-[50px] shadow-2xl border border-slate-100 text-center">
        <div className="w-16 h-16 bg-slate-900 rounded-[24px] mx-auto flex items-center justify-center text-white mb-6 shadow-xl">
          <Scan size={32} />
        </div>
        <h2 className="text-3xl font-black mb-1 italic uppercase tracking-tighter">
          Terminal <span className="text-blue-600">{currentStation?.id}</span>
        </h2>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mb-10">
          Scan lotnummer voor volgende fase
        </p>
        <div className="space-y-6">
          <input
            className="w-full bg-slate-50 border-4 border-slate-100 rounded-[30px] p-8 text-center text-3xl font-black tracking-[0.2em] uppercase focus:border-blue-500 outline-none shadow-inner"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            placeholder="SCAN LOT"
            autoFocus
          />
          <button
            disabled={input.length < 10 || loading}
            onClick={handleConfirm}
            className={`w-full py-8 rounded-[30px] font-black uppercase text-xl shadow-2xl flex items-center justify-center gap-4 ${
              input.length >= 10
                ? "bg-slate-900 text-white hover:bg-blue-600"
                : "bg-slate-100 text-slate-300"
            }`}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                Bevestig Stap <ArrowRight size={24} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
