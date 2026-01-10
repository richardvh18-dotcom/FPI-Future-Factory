import React, { useState } from "react";
import {
  X,
  Edit2,
  Box,
  Shield,
  Calendar,
  Monitor,
  Play,
  Zap,
  ArrowRight,
  Loader2,
  Hash,
  Edit3,
} from "lucide-react";
import StatusBadge from "./common/StatusBadge";

const OrderDetail = ({
  order,
  onClose,
  isMaster,
  products = [],
  currentStation,
  onStartProduction,
  loading,
  formatDate,
}) => {
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualLot, setManualLot] = useState("");

  if (!order) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center opacity-10 text-slate-400">
        <Monitor size={120} />
        <p className="text-xl font-black uppercase tracking-widest mt-6 text-center">
          Selecteer een order uit de planning
        </p>
      </div>
    );
  }

  const safeFormatDate = (val) => {
    if (typeof formatDate === "function") return formatDate(val);
    return String(val || "-");
  };

  const orderProducts = products.filter((p) => p.orderId === order.orderId);
  const isMachineStation = currentStation?.type === "machine";
  const planReached = Number(order.toDo || 0) >= Number(order.plan);

  const handleManualStart = (e) => {
    e.preventDefault();
    if (manualLot.length < 10) return;
    onStartProduction(order, manualLot);
    setManualLot("");
    setShowManualInput(false);
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-300 text-left">
      {/* HEADER */}
      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30 shrink-0">
        <div className="text-left">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-slate-900 text-white px-3 py-1 rounded-lg font-mono text-[10px] font-black uppercase tracking-widest">
              {order.orderId}
            </span>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 transition-all"
            >
              <X size={16} />
            </button>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase leading-tight">
            {order.item}
          </h2>
        </div>
        <div className="flex bg-white p-2 rounded-2xl border shadow-sm shrink-0">
          <div className="px-5 text-center border-r">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">
              Plan
            </span>
            <span className="text-xl font-black text-slate-800">
              {order.plan}
            </span>
          </div>
          <div className="px-5 text-center">
            <span className="block text-[8px] font-black text-blue-500 uppercase tracking-widest text-left text-left">
              Started
            </span>
            <span className="text-xl font-black text-blue-600 text-left">
              {order.toDo || 0}
            </span>
          </div>
        </div>
      </div>

      {/* ACTIEBALK: START PRODUCTIE */}
      {isMachineStation && !planReached && (
        <div className="p-6 bg-blue-50 border-b border-blue-100 flex flex-col gap-4 animate-in slide-in-from-top duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 italic">
                Nieuwe Unit Starten
              </h4>
              <p className="text-xs font-bold text-slate-500">
                Koppel een lotnummer om het proces 'Wikkelen' te activeren.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowManualInput(!showManualInput)}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  showManualInput
                    ? "bg-white border-blue-500 text-blue-600 shadow-md"
                    : "bg-white border-slate-200 text-slate-400 hover:border-blue-300"
                }`}
                title="Handmatige lot koppeling"
              >
                <Edit3 size={20} />
              </button>
              <button
                onClick={() => onStartProduction(order)}
                disabled={loading}
                className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <Play size={18} fill="currentColor" /> Start Proces
                  </>
                )}
              </button>
            </div>
          </div>

          {showManualInput && (
            <form
              onSubmit={handleManualStart}
              className="flex gap-2 animate-in zoom-in-95 duration-200"
            >
              <div className="relative flex-1">
                <Hash
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={18}
                />
                <input
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-blue-200 rounded-2xl text-sm font-black tracking-widest uppercase outline-none focus:ring-4 focus:ring-blue-50"
                  placeholder="LOTNUMMER HANDMATIG KOPPELEN..."
                  value={manualLot}
                  onChange={(e) => setManualLot(e.target.value.toUpperCase())}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={manualLot.length < 10}
                className="bg-slate-900 text-white px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-30 transition-all shadow-lg"
              >
                Koppelen
              </button>
            </form>
          )}
        </div>
      )}

      {/* DETAILS & HISTORIE */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar text-left">
        <div className="bg-slate-50 p-6 rounded-[30px] border border-slate-100 grid grid-cols-2 gap-4">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">
              Machine
            </span>
            <p className="text-sm font-bold text-slate-700 uppercase italic">
              {order.machine}
            </p>
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">
              Leverdatum
            </span>
            <p className="text-sm font-bold text-blue-600">
              {safeFormatDate(order.date)}
            </p>
          </div>
        </div>

        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 italic">
          <Box size={14} /> Actieve Units
        </h4>
        <div className="space-y-3">
          {orderProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-300 border-2 border-dashed rounded-3xl uppercase text-[9px] font-black tracking-widest italic">
              Geen lopende productie voor deze order
            </div>
          ) : (
            orderProducts.map((p) => (
              <div
                key={p.lotNumber}
                className={`bg-white border p-5 rounded-[28px] flex items-center justify-between shadow-sm hover:border-blue-400 transition-all group ${
                  p.currentStep === "REJECTED" ? "opacity-50 grayscale" : ""
                }`}
              >
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">
                    Lotnummer
                  </span>
                  <span className="font-mono text-sm font-black text-slate-800 tracking-tighter text-left">
                    {p.lotNumber}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-left">
                  <div className="flex flex-col items-end text-left">
                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest text-left">
                      Huidige Fase
                    </span>
                    <span className="text-[11px] font-black uppercase italic text-slate-900 text-left">
                      {p.currentStep}
                    </span>
                  </div>
                  <StatusBadge
                    statusLabel={p.inspection?.status}
                    showIcon={false}
                  />
                  <ArrowRight
                    size={16}
                    className="text-slate-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
