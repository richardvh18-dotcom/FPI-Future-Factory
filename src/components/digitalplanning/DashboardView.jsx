import React, { useState } from "react";
import {
  Database,
  Activity,
  AlertOctagon,
  CheckCircle2,
  Factory,
  ChevronRight,
  AlertTriangle,
  FileSpreadsheet,
  Calendar as CalIcon,
  LayoutGrid,
  BarChart3,
} from "lucide-react";

/**
 * DashboardView: Bevat KPI's en een toggle tussen Kalender en Machine voortgang.
 */
const DashboardView = ({ metrics, products, onTileClick, onImportClick }) => {
  const [viewMode, setViewMode] = useState("calendar"); // 'calendar' | 'machines'

  const days = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  return (
    <div className="h-full overflow-y-auto space-y-6 custom-scrollbar pr-2 text-left animate-in zoom-in-95 duration-500">
      {/* 1. KPI Grid (Hersteld) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div
          onClick={() => onTileClick("gepland")}
          className="bg-white p-5 rounded-[30px] border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-400 cursor-pointer transition-all"
        >
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
              Gepland
            </p>
            <h3 className="text-3xl font-black text-slate-800 text-left">
              {metrics.totalPlanned || 0}
            </h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
            <Database size={20} />
          </div>
        </div>

        <div
          onClick={() => onTileClick("in_proces")}
          className="bg-white p-5 rounded-[30px] border border-slate-200 shadow-sm flex items-center justify-between group hover:border-emerald-400 cursor-pointer transition-all text-left"
        >
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-600 text-left">
              In Proces
            </p>
            <h3 className="text-3xl font-black text-emerald-600 mt-1 text-left">
              {metrics.activeCount || 0}
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform text-left">
            <Activity size={20} />
          </div>
        </div>

        <div
          onClick={() => onTileClick("tijd_afkeur")}
          className="bg-white p-5 rounded-[30px] border border-orange-200 shadow-sm flex items-center justify-between group hover:border-orange-400 cursor-pointer transition-all text-left"
        >
          <div>
            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest text-left">
              Tijd. Afkeur
            </p>
            <h3 className="text-3xl font-black text-orange-600 mt-1 text-left">
              {metrics.tempRejectedCount || 0}
            </h3>
          </div>
          <div className="p-3 bg-orange-50 text-orange-500 rounded-2xl group-hover:scale-110 transition-transform">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div
          onClick={() => onTileClick("def_afkeur")}
          className="bg-white p-5 rounded-[30px] border border-slate-200 shadow-sm flex items-center justify-between group hover:border-rose-400 cursor-pointer transition-all text-left"
        >
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-rose-600 text-left">
              Def. Afkeur
            </p>
            <h3 className="text-3xl font-black text-rose-600 mt-1 text-left">
              {metrics.rejectedCount || 0}
            </h3>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform">
            <AlertOctagon size={20} />
          </div>
        </div>

        <div
          onClick={() => onTileClick("gereed")}
          className="bg-white p-5 rounded-[30px] border border-slate-200 shadow-sm flex items-center justify-between group hover:border-purple-400 cursor-pointer transition-all text-left"
        >
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-purple-600 text-left">
              Gereed
            </p>
            <h3 className="text-3xl font-black text-purple-600 mt-1 text-left">
              {metrics.finishedCount || 0}
            </h3>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform text-left">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* 2. Toggle & Main Content */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* Header met Toggle */}
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50/30">
          <div className="flex items-center gap-6">
            <div className="flex bg-white p-1 rounded-2xl border shadow-sm shrink-0">
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  viewMode === "calendar"
                    ? "bg-slate-900 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <CalIcon size={14} /> Kalender
              </button>
              <button
                onClick={() => setViewMode("machines")}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  viewMode === "machines"
                    ? "bg-slate-900 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <BarChart3 size={14} /> Machine Load
              </button>
            </div>
            <h4 className="text-sm font-black uppercase text-slate-800 italic">
              {viewMode === "calendar"
                ? "Productie Planning Kalender"
                : "Machine Belasting & Voortgang"}
            </h4>
          </div>

          <button
            onClick={onImportClick}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg active:scale-95"
          >
            <FileSpreadsheet size={16} /> Excel Import
          </button>
        </div>

        {/* Dynamic Content Area */}
        <div className="p-8">
          {viewMode === "calendar" ? (
            <div className="animate-in fade-in duration-500">
              <div className="grid grid-cols-7 gap-2 mb-4">
                {days.map((d) => (
                  <div
                    key={d}
                    className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-3">
                {[...Array(31)].map((_, i) => (
                  <div
                    key={i}
                    className={`aspect-video rounded-2xl border flex flex-col p-3 transition-all hover:border-blue-400 cursor-pointer ${
                      i === 9
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                        : "bg-slate-50 border-slate-100 text-slate-400"
                    }`}
                  >
                    <span className="text-[11px] font-black">{i + 1}</span>
                    <div className="mt-auto flex flex-wrap gap-1">
                      {(i === 12 || i === 15 || i === 9) && (
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm" />
                      )}
                      {(i === 9 || i === 20) && (
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-sm" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-[10px] font-bold text-slate-400 uppercase italic text-center">
                * Selecteer een dag om de dagplanning in te zien (Toekomstige
                update)
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
              {metrics.machineMetrics &&
                metrics.machineMetrics.map((m) => (
                  <div
                    key={m.id}
                    className="bg-slate-50 p-6 rounded-3xl border border-slate-100 group hover:bg-white hover:border-blue-200 transition-all shadow-inner"
                  >
                    <div className="flex justify-between items-end mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white rounded-xl shadow-sm text-blue-600 border border-slate-100">
                          <Factory size={18} />
                        </div>
                        <span className="text-lg font-black text-slate-800 italic uppercase">
                          {m.id}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest">
                          Efficiency
                        </span>
                        <span className="text-sm font-black text-blue-600 font-mono">
                          {Math.round((m.fin / Math.max(1, m.plan)) * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                        <span className="text-slate-400 italic">Voortgang</span>
                        <span className="text-slate-700">
                          {m.fin} / {m.plan} units
                        </span>
                      </div>
                      <div className="h-3 bg-white border border-slate-200 rounded-full overflow-hidden shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                          style={{
                            width: `${(m.fin / Math.max(1, m.plan)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
