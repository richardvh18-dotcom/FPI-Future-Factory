import React from "react";
import { Package, CircleDashed, ArrowRight } from "lucide-react";

const ProductCard = ({ product, onClick }) => {
  if (!product) return null;
  const isBore = product.isBoreSpec === true;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-[2rem] border transition-all cursor-pointer group relative overflow-hidden flex flex-col h-full animate-in text-left ${
        isBore ? "border-slate-100" : "border-slate-200"
      } hover:shadow-2xl hover:border-blue-500 hover:-translate-y-1`}
    >
      <div
        className={`absolute top-0 right-0 px-4 py-2 rounded-bl-3xl font-black text-[8px] uppercase tracking-widest z-20 shadow-md ${
          isBore ? "bg-slate-900 text-white" : "bg-emerald-600 text-white"
        }`}
      >
        {isBore
          ? "Referentie"
          : product.productLabel || product.label || "Wavistrong"}
      </div>
      <div className="aspect-square flex items-center justify-center p-8 border-b bg-slate-50/50 relative overflow-hidden">
        {isBore ? (
          <CircleDashed
            className="text-slate-300 group-hover:text-blue-500 transition-all duration-500"
            size={80}
          />
        ) : product.image ? (
          <img
            src={product.image}
            className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500"
            alt=""
          />
        ) : (
          <Package className="text-slate-200" size={60} />
        )}
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter mb-4 group-hover:text-blue-700 leading-tight min-h-[2.5em]">
          {product.name || product.id}
        </h3>
        {!isBore && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
                Maat
              </p>
              <p className="text-xs font-black text-slate-900 uppercase italic mt-1">
                ID {product.diameter} mm
              </p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
                Druk
              </p>
              <p className="text-xs font-black text-blue-600 uppercase italic mt-1">
                PN {product.pressure}
              </p>
            </div>
          </div>
        )}
        <div className="mt-auto flex flex-wrap gap-2">
          <span
            className={`text-[9px] font-black px-3 py-1 rounded-xl border uppercase flex items-center gap-1.5 ${
              isBore
                ? "bg-slate-100 text-slate-600 border-slate-200"
                : "bg-blue-50 text-blue-600 border-blue-100"
            }`}
          >
            {isBore ? <CircleDashed size={10} /> : <Package size={10} />}{" "}
            {product.type}
          </span>
        </div>
      </div>
      <div className="px-6 py-3 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between group-hover:bg-blue-50 transition-colors">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-600 italic tracking-wider">
          Gegevens Inzien
        </span>
        <ArrowRight
          size={14}
          className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"
        />
      </div>
    </div>
  );
};

export default ProductCard;
