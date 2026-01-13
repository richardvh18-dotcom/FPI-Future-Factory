import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  X,
  RotateCcw,
  FileUp,
  Tag,
  FileText,
  ChevronDown,
  ClipboardList,
} from "lucide-react";

/**
 * PlanningSidebar V1.6
 * - PERFORMANCE: Verlaagde initiële render-limiet naar 30 items.
 * - PERFORMANCE: Geoptimaliseerde selectie-logica (geeft enkel ID door).
 * - UI: Betere visuele feedback bij het laden van grote lijsten.
 */
const PlanningSidebar = ({
  orders = [],
  selectedOrderId, // Veranderd van object naar ID voor stabiliteit
  onSelect,
  searchTerm,
  setSearchTerm,
  onImport,
}) => {
  const [displayCount, setDisplayCount] = useState(30);

  const hasActiveFilters = searchTerm && searchTerm.trim() !== "";

  // Stap 1: Filter de orders (CPU intensief bij grote lijsten)
  const filteredOrders = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return orders;

    return orders.filter(
      (o) =>
        (o.orderId || "").toLowerCase().includes(q) ||
        (o.item || "").toLowerCase().includes(q)
    );
  }, [orders, searchTerm]);

  // Stap 2: Toon maar een klein deel (Lazy Loading) om Chrome niet te laten crashen
  const visibleOrders = useMemo(() => {
    return filteredOrders.slice(0, displayCount);
  }, [filteredOrders, displayCount]);

  // Reset de scroll-limiet als de zoekterm verandert
  useEffect(() => {
    setDisplayCount(30);
  }, [searchTerm]);

  return (
    <div className="col-span-12 lg:col-span-4 bg-white rounded-[32px] border border-slate-200 p-6 flex flex-col overflow-hidden shadow-sm h-full text-left animate-in fade-in duration-300">
      {/* Header sectie */}
      <div className="flex justify-between items-center mb-6 text-left">
        <div className="text-left">
          <h3 className="font-black text-xs uppercase text-slate-400 italic leading-none flex items-center gap-2">
            <ClipboardList size={14} /> Planning
          </h3>
          <p className="text-[8px] font-bold text-slate-300 uppercase mt-1 italic">
            {filteredOrders.length} orders{" "}
            {hasActiveFilters ? "gevonden" : "totaal"}
          </p>
        </div>
        {onImport && (
          <button
            onClick={onImport}
            className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg flex items-center gap-2 group active:scale-95"
            title="Importeer nieuwe planning"
          >
            <FileUp size={18} />
          </button>
        )}
      </div>

      {/* Zoekbalk met direct reset-optie */}
      <div className="relative mb-6 text-left group">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"
          size={16}
        />
        <input
          className="w-full pl-10 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-xs font-bold outline-none focus:bg-white focus:border-blue-400 shadow-inner transition-all"
          placeholder="Zoek order of item..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {hasActiveFilters && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-slate-200 text-slate-500 rounded-full hover:bg-red-100 hover:text-red-600 transition-all"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* De Lijst (Lazy Loaded) */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar text-left">
        {visibleOrders.length === 0 ? (
          <div className="py-20 text-center opacity-20 flex flex-col items-center gap-2">
            <Search size={48} strokeWidth={1} />
            <p className="font-black uppercase text-[10px] tracking-widest">
              Geen orders gevonden
            </p>
          </div>
        ) : (
          visibleOrders.map((orderItem) => (
            <div
              key={orderItem.id}
              onClick={() => onSelect(orderItem)}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer group ${
                selectedOrderId === orderItem.orderId ||
                selectedOrderId === orderItem.id
                  ? "border-blue-500 bg-blue-50/30 shadow-md scale-[1.02]"
                  : "border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white"
              }`}
            >
              <div className="flex justify-between mb-1 text-left">
                <div className="flex items-center gap-2 text-left">
                  <span className="text-[10px] font-mono font-black text-blue-600 uppercase tracking-tighter">
                    {orderItem.orderId}
                  </span>
                  {orderItem.referenceCode && (
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black rounded border border-amber-200 uppercase">
                      {orderItem.referenceCode}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 rounded italic shrink-0">
                  {orderItem.machine}
                </span>
              </div>
              <h4 className="font-black text-[11px] text-slate-800 leading-tight italic line-clamp-2 uppercase">
                {orderItem.item}
              </h4>

              <div className="mt-3 flex items-center gap-3 text-left">
                <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-1000"
                    style={{
                      width: `${
                        (Number(orderItem.liveFinish || 0) /
                          Math.max(1, Number(orderItem.plan))) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <span className="text-[9px] font-black text-slate-500 whitespace-nowrap">
                  {orderItem.liveFinish || 0} / {orderItem.plan}
                </span>
              </div>
            </div>
          ))
        )}

        {/* Laad meer knop om Chrome te ontlasten */}
        {filteredOrders.length > displayCount && (
          <button
            onClick={() => setDisplayCount((prev) => prev + 50)}
            className="w-full py-4 text-[10px] font-black uppercase text-blue-600 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-all flex items-center justify-center gap-2 mt-4 border-2 border-dashed border-blue-100"
          >
            <ChevronDown size={14} /> Toon volgende 50 orders (
            {filteredOrders.length - displayCount} resterend)
          </button>
        )}
      </div>
    </div>
  );
};

export default PlanningSidebar;
