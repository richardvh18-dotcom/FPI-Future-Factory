import React, { useState } from "react";
import {
  Database,
  Activity,
  AlertOctagon,
  CheckCircle2,
  Factory,
  ChevronRight,
  X,
  RotateCcw,
  ChevronDown,
  Layers,
  Package,
  AlertTriangle,
} from "lucide-react";

/**
 * DashboardView V1.4
 * - NIEUW: 'Tijdelijke Afkeur' KPI tegel.
 * - NIEUW: Machine Status kaarten zijn nu uitklapbaar om orders te zien.
 */
const DashboardView = ({
  metrics,
  products,
  onTileClick,
  hasActiveFilters,
  onClearFilters,
}) => {
  const [expandedMachine, setExpandedMachine] = useState(null);

  return (
    <div className="h-full overflow-y-auto space-y-6 custom-scrollbar pr-2 text-left animate-in zoom-in-95 duration-500">
      {hasActiveFilters && (
        <div className="flex items-center justify-between bg-blue-600 text-white p-4 rounded-3xl shadow-lg animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Activity size={18} className="animate-pulse" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-widest leading-none">
                Filters Actief
              </p>
              <p className="text-xs font-bold opacity-80 mt-1">
                Gefilterde data weergave.
              </p>
            </div>
          </div>
          <button
            onClick={onClearFilters}
            className="bg-white text-blue-600 px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 shadow-sm active:scale-95"
          >
            <RotateCcw size={14} /> Wis filters
          </button>
        </div>
      )}

      {/* KPI TEGELS (Nu 5 stuks) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div
          onClick={() => onTileClick("gepland")}
          className="bg-white p-6 rounded-[30px] border border-slate-200 shadow-sm flex flex-col justify-between group cursor-pointer hover:border-blue-400 transition-all text-left"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Plan Totaal
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
              <Database size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-800">
            {metrics.totalPlanned || 0}
          </h3>
        </div>

        <div
          onClick={() => onTileClick("in_proces")}
          className="bg-white p-6 rounded-[30px] border border-slate-200 shadow-sm flex flex-col justify-between group cursor-pointer hover:border-blue-500 transition-all text-left"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Running
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
              <Activity size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-blue-600">
            {metrics.activeCount || 0}
          </h3>
        </div>

        {/* NIEUWE KPI: TIJDELIJKE AFKEUR */}
        <div
          onClick={() => onTileClick("tijdelijke_afkeur")}
          className="bg-white p-6 rounded-[30px] border-2 border-orange-100 shadow-sm flex flex-col justify-between group cursor-pointer hover:border-orange-400 transition-all text-left bg-orange-50/20"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">
              Reparatie
            </span>
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg group-hover:scale-110 transition-transform">
              <AlertTriangle size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-orange-600">
            {metrics.tempRejectedCount || 0}
          </h3>
        </div>

        <div
          onClick={() => onTileClick("def_afkeur")}
          className="bg-white p-6 rounded-[30px] border border-slate-200 shadow-sm flex flex-col justify-between group cursor-pointer hover:border-rose-400 transition-all text-left"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Def. Afkeur
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover:scale-110 transition-transform">
              <AlertOctagon size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-rose-600">
            {metrics.rejectedCount || 0}
          </h3>
        </div>

        <div
          onClick={() => onTileClick("gereed")}
          className="bg-white p-6 rounded-[30px] border border-slate-200 shadow-sm flex flex-col justify-between group cursor-pointer hover:border-emerald-400 transition-all text-left"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Gereed
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-emerald-600">
            {metrics.finishedCount || 0}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
        {/* MACHINE STATUS LIST (Uitklapbaar) */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-sm font-black uppercase text-slate-800 mb-4 flex items-center gap-2">
            <Factory size={18} className="text-blue-500" /> Machine Voortgang
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.machineMetrics?.map((m) => {
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
                    onClick={() => setExpandedMachine(isExpanded ? null : m.id)}
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
                          {m.fin} / {m.plan}
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
                            progress === 100 ? "bg-emerald-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 border-t border-slate-50 animate-in slide-in-from-top-2 duration-300">
                      <h5 className="text-[9px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-widest">
                        <Layers size={12} /> Actieve Orders op {m.id}
                      </h5>
                      <div className="space-y-2">
                        {m.orders.length > 0 ? (
                          m.orders.map((o, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white transition-all"
                            >
                              <div className="flex flex-col">
                                <span className="text-[10px] font-mono font-black text-blue-600">
                                  {o.id}
                                </span>
                                <span className="text-[11px] font-black text-slate-700 truncate max-w-[150px] uppercase italic">
                                  {o.item}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className="text-[8px] font-black text-slate-400 uppercase block">
                                    Fin/Plan
                                  </span>
                                  <span className="text-[11px] font-black">
                                    {o.fin} / {o.plan}
                                  </span>
                                </div>
                                <div className="h-8 w-px bg-slate-200" />
                                <div className="text-right">
                                  <span className="text-[8px] font-black text-orange-400 uppercase block">
                                    To Do
                                  </span>
                                  <span className="text-[11px] font-black text-orange-600">
                                    {o.todo}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-slate-400 italic text-center py-4">
                            Geen actieve orders ingeladen voor deze machine.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* PROCES FLOW COUNTERS */}
        <div className="space-y-4">
          <h4 className="text-sm font-black uppercase text-slate-800 mb-4 flex items-center gap-2">
            <ChevronRight size={18} className="text-emerald-500" /> Proces Flow
          </h4>
          <div className="grid grid-cols-1 gap-3">
            {["Wikkelen", "Lossen", "Nabewerken", "Eindinspectie"].map(
              (step) => (
                <div
                  key={step}
                  className="p-6 bg-white border border-slate-200 rounded-[30px] flex items-center justify-between shadow-sm hover:border-blue-200 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <Package size={16} />
                    </div>
                    <span className="text-xs font-black text-slate-600 uppercase tracking-widest">
                      {step}
                    </span>
                  </div>
                  <span className="text-2xl font-black text-slate-800">
                    {products.filter((p) => p.currentStep === step).length}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
