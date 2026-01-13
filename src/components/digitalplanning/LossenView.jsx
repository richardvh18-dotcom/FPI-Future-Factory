import React, { useState, useMemo } from 'react';
import { 
  ArrowRight, Box, Clock, Activity, CheckCircle2, AlertCircle, LogOut, Search, X, Tag 
} from 'lucide-react';

/**
 * LossenView V2.3
 * - UPDATE: Toont referenceCode (Kolom M) bij producten in de wachtrij.
 * - UPDATE: Zoekfunctie ondersteunt nu ook zoeken op referentiecode.
 */
const LossenView = ({ currentStation, products, onNextStep, loading }) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const lossenProducts = useMemo(() => {
    if (!currentStation) return [];
    const q = searchTerm.toLowerCase().trim();
    return products
      .filter(p => p.currentStation === currentStation.id && p.currentStep === 'Lossen')
      .filter(p => {
        if (!q) return true;
        return (
          (p.lotNumber || "").toLowerCase().includes(q) || 
          (p.orderId || "").toLowerCase().includes(q) ||
          (p.referenceCode || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [products, currentStation, searchTerm]);

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 text-left">
      <div className="bg-emerald-50 border-2 border-emerald-100 p-8 rounded-[40px] mb-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-5 text-left">
           <div className="p-4 bg-emerald-500 text-white rounded-3xl shadow-lg shadow-emerald-200 text-left"><LogOut size={32} /></div>
           <div className="text-left">
             <h2 className="text-3xl font-black text-emerald-900 tracking-tighter uppercase italic text-left">Lossen</h2>
             <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest mt-1 text-left">Gereed voor ontmallen en transport</p>
           </div>
        </div>
        <div className="bg-white px-8 py-3 rounded-2xl border-2 border-emerald-200 shadow-sm text-center">
           <span className="text-[10px] font-black text-emerald-400 uppercase block mb-0.5">Wachtrij</span>
           <span className="text-2xl font-black text-emerald-600">{lossenProducts.length}</span>
        </div>
      </div>

      <div className="relative mb-6 group text-left">
        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors"><Search size={20} /></div>
        <input className="w-full bg-white border-2 border-slate-100 rounded-3xl pl-16 pr-12 py-5 text-sm font-bold outline-none focus:border-emerald-400 shadow-sm transition-all" placeholder="Zoek op Lot, Order of Referentie..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 pb-20 text-left">
        {lossenProducts.map((p, idx) => (
          <div key={p.lotNumber} className="bg-white border-2 border-slate-100 p-8 rounded-[40px] flex items-center justify-between hover:border-slate-200 transition-all shadow-sm group animate-in slide-in-from-bottom-4 text-left">
            <div className="flex items-center gap-8 text-left">
              <div className="text-center bg-emerald-50 px-5 py-3 rounded-2xl border-2 border-emerald-100 text-emerald-700 text-left"><span className="text-[10px] font-black uppercase block mb-0.5 opacity-60">Pos</span><span className="text-xl font-black">{idx + 1}</span></div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-3 mb-1 text-left">
                  <span className="text-sm font-mono font-black text-blue-600 text-left uppercase">{p.lotNumber}</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded uppercase">Order: {p.orderId}</span>
                  {p.referenceCode && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded uppercase border border-amber-200 flex items-center gap-1"><Tag size={10}/> {p.referenceCode}</span>}
                </div>
                <h4 className="text-xl font-black text-slate-900 leading-tight italic uppercase text-left">{p.item}</h4>
              </div>
            </div>

            <div className="flex items-center gap-12 text-left">
              <div className="hidden md:flex flex-col items-end text-left text-left">
                 <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5 italic text-left"><Clock size={12}/> In bewerking sinds</span>
                 <span className="text-sm font-bold text-slate-700 text-left">{new Date(p.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <button onClick={() => !loading && onNextStep(p)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-3">
                Gereed Melden <ArrowRight size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LossenView;