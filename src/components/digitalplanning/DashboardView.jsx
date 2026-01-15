import React, { useState } from "react";
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  Factory,
  ChevronRight,
  Package,
  AlertTriangle,
  Monitor,
  ArrowRight,
  Ruler,
  Layers,
  Wrench,
  Users,
  LayoutGrid,
} from "lucide-react";

import RejectionAnalysisTile from "./RejectionAnalysisTile";

const DashboardView = ({
  metrics,
  products = [],
  onTileClick,
  onStationSelect,
}) => {
  const [activeDept, setActiveDept] = useState("ALL");
  const [expandedMachine, setExpandedMachine] = useState(null);

  const DEPARTMENTS = [
    {
      id: "ALL",
      label: "Totaaloverzicht",
      icon: <LayoutGrid size={16} />,
      color: "bg-slate-900",
    },
    {
      id: "FITTINGS",
      label: "Fittings",
      icon: <Package size={16} />,
      color: "bg-blue-600",
    },
    {
      id: "PIPES",
      label: "Pipes",
      icon: <Layers size={16} />,
      color: "bg-orange-600",
    },
    {
      id: "SPOOLS",
      label: "Spools",
      icon: <Users size={16} />,
      color: "bg-emerald-600",
    },
  ];

  // FIX: Geef het juiste station ID door!
  const handleEnterStation = (e, stationId) => {
    e.stopPropagation();
    if (onStationSelect) {
      onStationSelect(stationId); // Hier zat de fout ('workstations' string)
    }
  };

  const isMachineInDept = (mId) => {
    if (activeDept === "ALL") return true;
    if (activeDept === "FITTINGS")
      return (
        mId.startsWith("BH") ||
        mId === "Mazak" ||
        mId === "Nabewerking" ||
        mId === "BM01"
      );
    if (activeDept === "PIPES")
      return mId.startsWith("PIPE") || mId.includes("BM-PIPES");
    if (activeDept === "SPOOLS") return mId.startsWith("SPOOL");
    return true;
  };

  const filteredMachineMetrics =
    metrics.machineMetrics?.filter((m) => isMachineInDept(m.id)) || [];

  return (
    <div className="h-full overflow-y-auto space-y-6 custom-scrollbar pr-2 text-left animate-in zoom-in-95 duration-500 pb-20">
      {/* AFDELINGS SELECTIE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 ml-2">
          <div
            className={`p-2 rounded-xl text-white transition-colors duration-300 ${
              DEPARTMENTS.find((d) => d.id === activeDept)?.color
            }`}
          >
            {DEPARTMENTS.find((d) => d.id === activeDept)?.icon}
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase italic leading-none">
              Management Dashboard
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {activeDept === "ALL"
                ? "Bedrijfsbreed overzicht"
                : `Focus: Afdeling ${activeDept}`}
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 overflow-x-auto no-scrollbar max-w-full">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setActiveDept(dept.id)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${
                activeDept === dept.id
                  ? "bg-white text-slate-900 shadow-md scale-105"
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
              }`}
            >
              {dept.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Tegels ... (Ongewijzigd, maar wel nodig voor context) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {/* ... (Tegels code zoals in vorig antwoord) ... */}
        {/* Ik kort dit in voor de leesbaarheid, maar neem aan dat de tegels hier staan */}
        <div
          onClick={() => onTileClick("gepland")}
          className={`bg-white p-5 rounded-[30px] border shadow-sm flex flex-col justify-between group cursor-pointer transition-all text-left ${
            activeDept !== "ALL" && activeDept !== "FITTINGS"
              ? "opacity-40 grayscale scale-95"
              : "border-slate-200 hover:border-blue-400"
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Fittings
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
              <Package size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800 leading-none">
              {metrics.totalPlanned || 0}
            </h3>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">
              Gereed: {metrics.finishedFittings || 0}
            </p>
          </div>
        </div>
        {/* ... Overige tegels ... */}
      </div>

      {/* MACHINES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-sm font-black uppercase text-slate-800 mb-4 flex items-center gap-2">
            <Factory size={18} className="text-blue-500" /> Machine Voortgang (
            {activeDept})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMachineMetrics.length > 0 ? (
              filteredMachineMetrics.map((m) => {
                const isExpanded = expandedMachine === m.id;
                const progress = Math.min(
                  100,
                  (m.fin / Math.max(1, m.plan)) * 100
                );

                return (
                  <div
                    key={m.id}
                    className={`bg-white rounded-[32px] border transition-all ${
                      isExpanded
                        ? "border-blue-500 shadow-xl ring-4 ring-blue-50"
                        : "border-slate-200 hover:border-slate-300 shadow-sm"
                    }`}
                  >
                    <div
                      onClick={() =>
                        setExpandedMachine(isExpanded ? null : m.id)
                      }
                      className="p-6 cursor-pointer flex flex-col gap-4"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl ${
                              m.running > 0
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            <Factory size={18} />
                          </div>
                          <span className="font-black text-lg uppercase italic">
                            {m.id}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-slate-400 uppercase block">
                            Gereed
                          </span>
                          <span className="text-sm font-black text-slate-900">
                            {m.fin} / {Math.round(m.plan)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black uppercase">
                          <span className="text-blue-500 flex items-center gap-1">
                            <Activity size={10} /> {m.running} Actief
                          </span>
                          <span className="text-slate-400">
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div
                            className={`h-full transition-all duration-1000 ${
                              progress === 100
                                ? "bg-emerald-500"
                                : "bg-blue-500"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-6 pb-6 pt-2 border-t border-slate-50 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-2 tracking-widest">
                            <Layers size={12} /> Planning Lijst
                          </h5>
                          <button
                            onClick={(e) => handleEnterStation(e, m.id)} // FIX: Geef m.id door!
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
                          >
                            <Monitor size={12} /> Open Terminal
                          </button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {/* ... Order lijst ... */}
                          {m.orders && m.orders.length > 0 ? (
                            m.orders.slice(0, 5).map((o) => (
                              <div
                                key={o.id}
                                className="text-xs p-2 bg-slate-50 rounded border border-slate-100 flex justify-between"
                              >
                                <span className="font-bold">{o.orderId}</span>
                                <span className="text-slate-500">{o.item}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-slate-400 italic text-center">
                              Geen orders
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-12 bg-white rounded-[32px] border border-dashed border-slate-200 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Geen actieve machines in deze afdeling.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Rechter Kolom */}
        <div className="space-y-6 text-left">
          <div className="space-y-4">
            <h4 className="text-sm font-black uppercase text-slate-800 mb-4 flex items-center gap-2">
              <ChevronRight size={18} className="text-emerald-500" /> Proces
              Flow
            </h4>
            {/* Flow tegels... */}
          </div>
          <RejectionAnalysisTile products={products} />
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
