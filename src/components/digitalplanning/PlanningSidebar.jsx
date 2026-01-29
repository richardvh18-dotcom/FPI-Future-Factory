import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronRight,
  Filter,
  LayoutList,
  AlertCircle,
  Clock,
  Briefcase,
  Sparkles,
} from "lucide-react";
import StatusBadge from "./common/StatusBadge";

/**
 * PlanningSidebar - Nu met 'NIEUW' indicator voor recent toegevoegde orders.
 */
const PlanningSidebar = ({ orders = [], selectedOrderId, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOrders = useMemo(() => {
    const term = (searchTerm || "").toLowerCase().trim();
    if (!term) return orders;

    return orders.filter((order) => {
      const orderId = (order?.orderId || "").toLowerCase();
      const itemCode = (
        order?.itemCode ||
        order?.productId ||
        ""
      ).toLowerCase();
      const itemDesc = (order?.item || "").toLowerCase();
      const project = (order?.project || "").toLowerCase();

      return (
        orderId.includes(term) ||
        itemCode.includes(term) ||
        itemDesc.includes(term) ||
        project.includes(term)
      );
    });
  }, [orders, searchTerm]);

  // Helper om te bepalen of een order nieuw is (< 24 uur)
  const isOrderNew = (order) => {
    if (!order.createdAt) return false;
    const createdAt = order.createdAt.toMillis
      ? order.createdAt.toMillis()
      : new Date(order.createdAt).getTime();
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    return createdAt > twentyFourHoursAgo;
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 animate-in fade-in duration-300">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="relative group">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
            size={16}
          />
          <input
            type="text"
            placeholder="Zoek order of item..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center opacity-40">
            <AlertCircle size={32} className="mb-2 text-slate-300" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Geen resultaten
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isSelected =
              selectedOrderId === order.id || selectedOrderId === order.orderId;
            const isNew = isOrderNew(order);

            return (
              <button
                key={order.id}
                onClick={() => onSelect(order.id)}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 group relative overflow-hidden
                  ${
                    isSelected
                      ? "bg-blue-50 border-blue-500 shadow-md shadow-blue-100"
                      : "bg-white border-slate-50 hover:border-slate-200 hover:bg-slate-50"
                  }
                `}
              >
                {/* Nieuw Badge */}
                {isNew && (
                  <div className="absolute top-0 left-0 px-2 py-0.5 bg-emerald-500 text-white text-[7px] font-black uppercase tracking-tighter rounded-br-lg shadow-sm z-10">
                    Nieuw
                  </div>
                )}

                {/* Urgentie indicator */}
                {order.isUrgent && (
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-red-500 animate-pulse" />
                )}

                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-black text-sm tracking-tighter truncate ${
                          isSelected ? "text-blue-700" : "text-slate-900"
                        }`}
                      >
                        {order.orderId || "Geen ID"}
                      </span>
                      {isNew && (
                        <Sparkles
                          size={10}
                          className="text-emerald-500 animate-bounce"
                        />
                      )}
                    </div>
                    {order.project && (
                      <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-400 truncate max-w-[120px]">
                        {order.project}
                      </span>
                    )}
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <p className="text-[10px] font-bold text-slate-400 truncate mb-3">
                  {order.itemCode || order.productId || "Geen artikelcode"}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100/50">
                  <div className="flex items-center gap-2">
                    <Clock size={10} className="text-slate-300" />
                    <span className="text-[9px] font-black text-slate-400 uppercase">
                      W{order.weekNumber || order.week || "--"}
                    </span>
                  </div>
                  <ChevronRight
                    size={14}
                    className={`transition-transform duration-300 ${
                      isSelected
                        ? "text-blue-500 translate-x-1"
                        : "text-slate-200 group-hover:text-slate-400"
                    }`}
                  />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PlanningSidebar;
