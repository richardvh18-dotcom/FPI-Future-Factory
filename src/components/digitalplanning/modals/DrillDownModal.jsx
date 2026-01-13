import React, { useState, useMemo } from "react";
import {
  X,
  Box,
  ClipboardList,
  ChevronRight,
  ChevronDown,
  Search,
  Hash,
  Database,
  Trash2,
  History,
  Timer,
  Factory,
  CheckCircle2,
} from "lucide-react";
import StatusBadge from "../common/StatusBadge";

/**
 * DrillDownModal V1.9
 * - PERFORMANCE FIX: Gebruikt een Lookup Map voor orders (O(1) in plaats van O(n)).
 * - PERFORMANCE FIX: Render-limiet toegevoegd om Chrome-crashes te voorkomen.
 * - FIX: To Do en Finish waardes worden direct uit het 'telefoonboek' gehaald.
 */
const DrillDownModal = ({
  isOpen,
  onClose,
  title,
  items = [],
  ordersMap = {},
  isManager,
  onDeleteLot,
}) => {
  const [expandedId, setExpandedId] = useState(null);
  const [internalSearch, setInternalSearch] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(40);

  // --- STAP 1: SNELLE FILTERING ---
  const filteredItems = useMemo(() => {
    const q = internalSearch.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (item) =>
        (item.lotNumber || "").toLowerCase().includes(q) ||
        (item.orderId || "").toLowerCase().includes(q) ||
        (item.item || "").toLowerCase().includes(q)
    );
  }, [items, internalSearch]);

  if (!isOpen) return null;

  const formatExcelDate = (val) => {
    if (!val) return "-";
    if (!isNaN(val) && parseFloat(val) > 30000) {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toLocaleDateString("nl-NL");
    }
    return String(val);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[250] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4 text-left">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
              <Hash size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black italic uppercase leading-none">
                {title}
              </h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">
                {filteredItems.length} resultaten
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-all border-none bg-transparent"
          >
            <X size={24} />
          </button>
        </div>

        {/* Zoekbalk */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
              size={18}
            />
            <input
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all"
              placeholder="Snel zoeken in deze lijst..."
              value={internalSearch}
              onChange={(e) => {
                setInternalSearch(e.target.value);
                setVisibleLimit(40);
              }}
            />
          </div>
        </div>

        {/* Scrollbare Lijst */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar bg-slate-50/30 text-left">
          {filteredItems.slice(0, visibleLimit).map((item) => {
            const itemId = item.id || item.lotNumber;
            const isExpanded = expandedId === itemId;

            // --- GEOPTIMALISEERDE LOOKUP (O(1)) ---
            // We zoeken niet meer in de lijst, we vragen het direct aan de Map
            const linkedOrder = ordersMap[item.orderId] || {};

            return (
              <div
                key={itemId}
                className={`bg-white rounded-[28px] border-2 transition-all duration-200 ${
                  isExpanded
                    ? "border-blue-500 shadow-lg"
                    : "border-slate-100 shadow-sm"
                }`}
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : itemId)}
                  className="p-4 flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isExpanded
                          ? "bg-blue-600 text-white"
                          : "bg-slate-50 text-slate-400"
                      }`}
                    >
                      <Box size={20} />
                    </div>
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-blue-600 font-black">
                          {item.lotNumber || item.orderId}
                        </span>
                        {item.currentStep && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded border border-blue-100 uppercase">
                            {item.currentStep}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-slate-800 uppercase italic line-clamp-1">
                        {item.item}
                      </h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isManager && item.lotNumber && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLot?.(item.lotNumber);
                        }}
                        className="p-2 text-slate-300 hover:text-red-500 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {isExpanded ? (
                      <ChevronDown size={20} className="text-blue-500" />
                    ) : (
                      <ChevronRight size={20} className="text-slate-300" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-8 pt-2 border-t border-slate-50 bg-slate-50/50 animate-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                      <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                          <Database size={80} />
                        </div>
                        <span className="text-[9px] font-black text-emerald-400 uppercase block mb-4 italic border-b border-emerald-400/20 pb-2">
                          Master Data
                        </span>
                        <div className="space-y-3">
                          <div className="flex justify-between border-b border-white/5 pb-1.5">
                            <span className="text-[9px] text-slate-500 uppercase font-bold">
                              Tekening
                            </span>
                            <span className="text-xs font-black italic">
                              {item.drawing || linkedOrder.drawing || "-"}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1.5">
                            <span className="text-[9px] text-slate-500 uppercase font-bold">
                              Plan (O)
                            </span>
                            <span className="text-xs font-black">
                              {linkedOrder.plan || item.plan || 0}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1.5 text-orange-400">
                            <span className="text-[9px] uppercase font-bold">
                              Te Doen (P)
                            </span>
                            <span className="text-xs font-black">
                              {linkedOrder.liveToDo || 0}
                            </span>
                          </div>
                          <div className="flex justify-between text-emerald-400">
                            <span className="text-[9px] uppercase font-bold">
                              Gereed (Q)
                            </span>
                            <span className="text-xs font-black">
                              {linkedOrder.liveFinish || 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                        <span className="text-[9px] font-black text-blue-600 uppercase block mb-4 italic flex items-center gap-2">
                          <History size={12} /> Tijdlijn
                        </span>
                        <div className="space-y-4 relative ml-2">
                          <div className="absolute left-[7px] top-1.5 bottom-1.5 w-0.5 bg-slate-100" />
                          {[
                            {
                              label: "Wikkelen",
                              time: item.startTime,
                              color: "bg-emerald-500",
                            },
                            {
                              label: "Lossen",
                              time: item.lossenTime,
                              color: "bg-blue-500",
                            },
                            {
                              label: "Afwerking",
                              time: item.nabewerkenTime,
                              color: "bg-orange-500",
                            },
                            {
                              label: "Klaar",
                              time: item.inspectieTime,
                              color: "bg-purple-600",
                            },
                          ].map((st, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-3 relative"
                            >
                              <div
                                className={`w-4 h-4 rounded-full border-2 z-10 ${
                                  st.time
                                    ? `${st.color} border-white shadow-sm`
                                    : "bg-white border-slate-100"
                                }`}
                              />
                              <div>
                                <p
                                  className={`text-[10px] font-black uppercase ${
                                    st.time
                                      ? "text-slate-800"
                                      : "text-slate-300"
                                  }`}
                                >
                                  {st.label}
                                </p>
                                {st.time && (
                                  <p className="text-[8px] font-bold text-slate-400">
                                    {new Date(st.time).toLocaleString("nl-NL")}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredItems.length > visibleLimit && (
            <button
              onClick={() => setVisibleLimit((prev) => prev + 50)}
              className="w-full py-4 text-[10px] font-black uppercase text-blue-600 bg-blue-50 rounded-2xl border-2 border-blue-100 hover:bg-blue-100 transition-all"
            >
              Laad meer resultaten (+50)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrillDownModal;
