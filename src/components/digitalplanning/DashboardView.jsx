import React from "react";
import { Zap } from "lucide-react";

const DashboardView = ({ metrics, onStationSelect }) => {
  if (!metrics || !metrics.machineMetrics) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
      {metrics.machineMetrics.map((machine) => (
        <div
          key={machine.id}
          onClick={() => onStationSelect && onStationSelect(machine.id)}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                {machine.id}
              </h4>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {machine.running > 0 ? "Productie Actief" : "Standby"}
              </p>
            </div>
            <div
              className={`p-2 rounded-xl ${
                machine.running > 0
                  ? "bg-green-50 text-green-600 animate-pulse"
                  : "bg-slate-50 text-slate-400"
              }`}
            >
              <Zap
                size={20}
                fill={machine.running > 0 ? "currentColor" : "none"}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                Planning
              </span>
              <span className="block text-xl font-black text-slate-800">
                {Math.round(machine.plan)}
              </span>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
              <span className="block text-[10px] font-black text-blue-400 uppercase mb-1">
                Gereed
              </span>
              <span className="block text-xl font-black text-blue-700">
                {machine.fin}
              </span>
            </div>
          </div>

          <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-1000"
              style={{
                width: `${
                  machine.plan > 0
                    ? Math.min(100, (machine.fin / machine.plan) * 100)
                    : 0
                }%`,
              }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardView;
