import React, { useState, useEffect } from "react";
import {
  X,
  Ruler,
  Package,
  Info,
  Loader2,
  Download,
  ExternalLink,
  Database,
  ShieldCheck,
  Clock,
  FileText,
  AlertCircle,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db, appId } from "../../config/firebase";
import { generateProductPDF } from "../../utils/pdfGenerator";

/**
 * ProductDetailModal: Toont productdetails met LIVE maatvoering.
 * Haalt de maten real-time op uit de technische database op basis van de opgeslagen sleutels.
 */
const ProductDetailModal = ({ product, onClose, userRole }) => {
  const [liveSpecs, setLiveSpecs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- LIVE FETCH LOGICA ---
  useEffect(() => {
    if (!product || !appId) return;

    const fetchLiveDimensions = async () => {
      setLoading(true);
      setError(null);
      try {
        const connKey = product.connection?.split("/")[0]?.toUpperCase();
        const pnStr = `PN${product.pressure}`;
        const idStr = `ID${product.diameter}`;
        const codeSuffix =
          product.extraCode && product.extraCode !== "-"
            ? `_${product.extraCode.toUpperCase()}`
            : "";

        // Paden bouwen (exact zoals in de Matrix Manager)
        const bellId = `${connKey}_${pnStr}_${idStr}${codeSuffix}`;
        const fittingId = `${product.type?.toUpperCase()}_${connKey}_${pnStr}_${idStr}${codeSuffix}`;

        let merged = {};

        // 1. Haal Bell (Mof) maten op
        const bellCol =
          connKey?.toLowerCase() === "cb" ? "cb_dimensions" : "fitting_specs";
        const bellSnap = await getDoc(
          doc(db, "artifacts", appId, "public", "data", bellCol, bellId)
        );
        if (bellSnap.exists()) merged = { ...merged, ...bellSnap.data() };

        // 2. Haal Fitting specifieke maten op
        const fittingSnap = await getDoc(
          doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "standard_fitting_specs",
            fittingId
          )
        );
        if (fittingSnap.exists()) merged = { ...merged, ...fittingSnap.data() };

        setLiveSpecs(merged);
      } catch (err) {
        console.error("Maten ophalen mislukt:", err);
        setError("Technische maten konden niet live worden geladen.");
      } finally {
        setLoading(false);
      }
    };

    fetchLiveDimensions();
  }, [product]);

  if (!product) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col lg:flex-row max-h-[90vh]">
        {/* LINKER KANT: MEDIA & INFO */}
        <div className="w-full lg:w-2/5 bg-slate-50 p-8 border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto">
          <div className="relative aspect-square bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm mb-8">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center opacity-10">
                <Package size={120} />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">
                Specificaties
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-blue-500 uppercase">
                    PN
                  </span>
                  <span className="text-xl font-black">
                    {product.pressure} bar
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-emerald-500 uppercase">
                    Mof
                  </span>
                  <span className="text-xl font-black">
                    {product.connection}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() =>
                generateProductPDF({ ...product, ...liveSpecs }, userRole)
              }
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-600 transition-all shadow-xl"
            >
              <Download size={18} /> Download Tech Fiche
            </button>
          </div>
        </div>

        {/* RECHTER KANT: LIVE MATEN */}
        <div className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar flex flex-col text-left">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase italic tracking-widest">
                  Gevalideerd: {product.label}
                </span>
              </div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
                {product.name}
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                <Database size={12} /> Tech-ID: {product.id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1">
            <div className="bg-slate-50 rounded-[32px] border border-slate-200 overflow-hidden shadow-inner">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white/50">
                <h4 className="flex items-center gap-2 font-black text-[10px] uppercase text-slate-500 tracking-widest">
                  <Ruler size={16} className="text-blue-500" /> Live Maatvoering
                  (Matrix Sync)
                </h4>
                {loading && (
                  <Loader2 className="animate-spin text-blue-500" size={16} />
                )}
              </div>

              <div className="p-8">
                {loading ? (
                  <div className="py-20 text-center space-y-4">
                    <Loader2
                      className="animate-spin mx-auto text-slate-300"
                      size={40}
                    />
                    <p className="text-[10px] font-black text-slate-400 uppercase">
                      Synchroniseren met Engineering Database...
                    </p>
                  </div>
                ) : error ? (
                  <div className="bg-red-50 p-8 rounded-2xl border border-red-100 text-center">
                    <AlertCircle
                      className="mx-auto text-red-500 mb-4"
                      size={32}
                    />
                    <p className="text-sm font-bold text-red-700">{error}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {liveSpecs &&
                    Object.keys(liveSpecs).filter((k) => k.length <= 4).length >
                      0 ? (
                      Object.entries(liveSpecs)
                        .filter(
                          ([k]) =>
                            !["id", "pressure", "diameter", "type"].includes(k)
                        )
                        .map(([key, val]) => (
                          <div
                            key={key}
                            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group hover:border-blue-300 transition-all"
                          >
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              {key}
                            </span>
                            <span className="text-2xl font-black text-slate-800 tracking-tight">
                              {val}
                              <span className="text-xs text-slate-300 ml-1">
                                mm
                              </span>
                            </span>
                          </div>
                        ))
                    ) : (
                      <div className="col-span-full py-10 text-center text-slate-300">
                        <Info size={48} className="mx-auto mb-3 opacity-20" />
                        <p className="text-xs font-bold uppercase">
                          Geen specifieke maten gevonden in database
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex items-start gap-4 p-6 bg-blue-50 rounded-3xl border border-blue-100">
              <div className="p-2 bg-blue-500 text-white rounded-xl">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-blue-900 uppercase">
                  Engineering Source of Truth
                </p>
                <p className="text-[10px] font-bold text-blue-700/70 leading-relaxed uppercase mt-1">
                  Deze gegevens worden real-time opgehaald. Elke wijziging in de
                  technische matrix is direct hier zichtbaar voor productie en
                  kwaliteitscontrole.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
