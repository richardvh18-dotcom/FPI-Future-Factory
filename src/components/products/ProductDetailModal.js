import React, { useMemo, useState } from "react";
import {
  X,
  FileText,
  Ruler,
  Package,
  ShieldCheck,
  Warehouse,
  Info,
  ImageIcon,
  Box,
  Layout,
  Download,
  Database,
  Fingerprint,
} from "lucide-react";

/**
 * ProductDetailModal.js - v9.0
 * XXL Foto weergave en live tolerantie synchronisatie.
 */
const ProductDetailModal = ({
  product,
  moffen = [],
  toleranceSettings = {},
  onClose,
  onExportPDF,
}) => {
  const [activeDetailTab, setActiveDetailTab] = useState("info");

  if (!product) return null;

  const BELL_KEYS = [
    "B1",
    "B2",
    "BA",
    "r1",
    "alpha",
    "A1",
    "A",
    "F",
    "C",
    "O",
    "R",
  ];

  const getTolerance = (key) => {
    if (!toleranceSettings) return null;
    let cat = "SocketEnd";
    if (product.category === "Elbow") cat = "Elbow";
    if (
      product.category?.includes("Tee") ||
      product.category?.includes("Reducer")
    )
      cat = "TeeReducer";
    if (product.category === "Coupler") cat = "Coupler";
    const type = product.type || "TB";
    const pn = String(product.pressure);
    const dia = String(product.diameter);
    return toleranceSettings[cat]?.[type]?.[pn]?.[dia]?.[key] || null;
  };

  const groupedSpecs = useMemo(() => {
    const rawSpecs = product.specs || {};
    const fitting = [],
      bell = [];
    Object.entries(rawSpecs).forEach(([k, v]) => {
      const val = v !== null && typeof v === "object" ? v.value : v;
      const tol =
        getTolerance(k) || (v !== null && typeof v === "object" ? v.tol : null);
      const obj = { label: k, value: val, tol };
      if (BELL_KEYS.includes(k)) bell.push(obj);
      else fitting.push(obj);
    });
    return { fitting, bell };
  }, [product, toleranceSettings]);

  const SpecCell = ({ spec }) => (
    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex flex-col justify-center hover:bg-white transition-all shadow-sm h-14">
      <div className="flex justify-between items-start">
        <span className="text-[8px] font-black text-slate-400 uppercase">
          {spec.label}
        </span>
        {spec.tol && (
          <span className="text-[7px] font-bold text-emerald-600">
            ±{spec.tol}
          </span>
        )}
      </div>
      <span className="text-xs font-black text-slate-900 italic">
        {spec.value || "—"}{" "}
        <span className="text-[7px] not-italic text-slate-400 ml-0.5">mm</span>
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[250] flex items-center justify-center p-4 animate-in fade-in duration-300 text-left">
      <div className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[92vh] max-h-[950px]">
        <div className="bg-slate-900 px-8 py-4 text-white shrink-0 border-b border-white/5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-8 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none text-white">
                {product.name || product.id}
              </h2>
              <span className="text-[9px] bg-orange-500 text-white px-2.5 py-0.5 rounded-full font-black uppercase tracking-[0.2em] shadow-lg shadow-orange-500/20">
                {product.productLabel || "Wavistrong Standard"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black italic text-blue-400 uppercase">
                  ID {product.diameter} / PN {product.pressure}
                </span>
              </div>
              <div className="flex items-center gap-6 border-l border-white/10 pl-6 h-6">
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none">
                    Artikelcode
                  </span>
                  <span className="text-[11px] font-black text-white/90 uppercase">
                    {product.articleCode || "—"}
                  </span>
                </div>
                {product.extraCode && (
                  <div className="flex flex-col">
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none">
                      Extra Code
                    </span>
                    <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">
                      {product.extraCode}
                    </span>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none">
                    System ID
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 tracking-tighter uppercase font-mono">
                    {String(product.id).slice(-8)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 border-b flex px-8 gap-10 shrink-0">
          <button
            onClick={() => setActiveDetailTab("info")}
            className={`py-4 text-[10px] font-black uppercase tracking-widest border-b-2 ${
              activeDetailTab === "info"
                ? "border-blue-600 text-slate-900"
                : "border-transparent text-slate-400"
            }`}
          >
            <Layout size={14} /> Informatie
          </button>
          <button
            onClick={() => setActiveDetailTab("specs")}
            className={`py-4 text-[10px] font-black uppercase tracking-widest border-b-2 ${
              activeDetailTab === "specs"
                ? "border-blue-600 text-slate-900"
                : "border-transparent text-slate-400"
            }`}
          >
            <Ruler size={14} /> Technische Maten
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
          {activeDetailTab === "info" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in slide-in-from-bottom-2 h-full">
              <div className="lg:col-span-9 h-full">
                <div className="aspect-[16/9] lg:aspect-auto lg:h-[550px] bg-slate-50 rounded-[3rem] border border-slate-100 flex items-center justify-center p-2 overflow-hidden shadow-inner relative group bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-slate-50">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt=""
                      className="w-full h-full object-contain group-hover:scale-105 transition-all duration-1000"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-slate-200">
                      <ImageIcon size={140} strokeWidth={0.5} />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
                        Asset preview unavailable
                      </p>
                    </div>
                  )}
                  <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                    <Fingerprint className="text-blue-500" size={14} />
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                      Certified Asset
                    </span>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-3 space-y-4 flex flex-col justify-start">
                <button
                  onClick={() => onExportPDF(product)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-blue-600 transition-all shadow-lg"
                >
                  <Download size={16} /> Export PDF
                </button>
                <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100/50">
                  <p className="text-[8px] font-black text-emerald-600/70 uppercase tracking-widest mb-3">
                    Magazijn Status
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg text-emerald-600 shadow-sm">
                      <Warehouse size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-900 uppercase leading-none">
                        {moffen.find(
                          (m) =>
                            m.type === product.type &&
                            Number(m.diameter) === Number(product.diameter) &&
                            String(m.pressure) === String(product.pressure)
                        )?.location || "Niet Geregistreerd"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-blue-50/40 rounded-2xl border border-blue-100/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-blue-500" />
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                      Integriteit
                    </span>
                  </div>
                  <p className="text-[9px] font-bold text-blue-800/60 leading-relaxed uppercase italic tracking-tight">
                    Data gesynchroniseerd met Master Database. QC-metingen zijn
                    leidend bij afname.
                  </p>
                </div>
              </div>
            </div>
          )}
          {activeDetailTab === "specs" && (
            <div className="space-y-12 animate-in slide-in-from-right-2 text-left">
              <section>
                <div className="flex items-center gap-3 mb-6 border-b pb-3 border-slate-100">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shadow-sm">
                    <Box size={16} />
                  </div>
                  <h3 className="text-[11px] font-black uppercase text-slate-800 tracking-[0.2em]">
                    Fitting Specificaties
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {groupedSpecs.fitting.map((s, i) => (
                    <SpecCell key={i} spec={s} />
                  ))}
                  {groupedSpecs.fitting.length === 0 && (
                    <p className="text-[10px] font-bold text-slate-300 uppercase italic">
                      Geen maten
                    </p>
                  )}
                </div>
              </section>
              <section>
                <div className="flex items-center gap-3 mb-6 border-b pb-3 border-slate-100">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shadow-sm">
                    <Database size={16} />
                  </div>
                  <h3 className="text-[11px] font-black uppercase text-slate-800 tracking-[0.2em]">
                    Mof Dimensies (Bell)
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {groupedSpecs.bell.map((s, i) => (
                    <SpecCell key={i} spec={s} />
                  ))}
                  {groupedSpecs.bell.length === 0 && (
                    <p className="text-[10px] font-bold text-slate-300 uppercase italic">
                      Geen mof maten gevonden
                    </p>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
