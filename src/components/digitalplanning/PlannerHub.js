import React, { useState, useMemo } from "react";
import TeamleaderHub from "./TeamleaderHub";
import {
  Loader2,
  LayoutGrid,
  Layers,
  Database,
  Activity,
  Globe,
  ChevronDown,
} from "lucide-react";

/**
 * PlannerHub - De centrale regiekamer voor de fabrieksplanning.
 * Combineert de functionaliteit van alle Teamleader Hubs met een afdelings-switcher.
 */
const PlannerHub = ({ onBack }) => {
  const [selectedDeptId, setSelectedDeptId] = useState("GLOBAL");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Harde definities van de machine-groepen per afdeling
  const DEPARTMENT_CONFIGS = {
    GLOBAL: {
      id: "GLOBAL",
      name: "Centrale Planning (Totaal)",
      icon: <Globe size={18} className="text-blue-600" />,
      machines: [
        "BM01",
        "BH11",
        "BH12",
        "BH15",
        "BH16",
        "BH17",
        "BH18",
        "BH31",
        "MAZAK",
        "NABEWERKING", // Fittings
        "BH05",
        "BH07",
        "BH08",
        "BH09", // Pipes
        "LAMINEREN_1",
        "LAMINEREN_2",
        "SPOOL_ASSY", // Spools
      ],
      scope: "all",
    },
    FITTINGS: {
      id: "FITTINGS",
      name: "Fitting Productions",
      icon: <Layers size={18} className="text-emerald-600" />,
      machines: [
        "BM01",
        "BH11",
        "BH12",
        "BH15",
        "BH16",
        "BH17",
        "BH18",
        "BH31",
        "MAZAK",
        "NABEWERKING",
      ],
      scope: "fittings",
    },
    PIPES: {
      id: "PIPES",
      name: "Pipe Productions",
      icon: <Database size={18} className="text-orange-600" />,
      machines: ["BH05", "BH07", "BH08", "BH09"],
      scope: "pipe",
    },
    SPOOLS: {
      id: "SPOOLS",
      name: "Spools Productions",
      icon: <Activity size={18} className="text-purple-600" />,
      machines: ["LAMINEREN_1", "LAMINEREN_2", "SPOOL_ASSY"],
      scope: "spools",
    },
  };

  const currentConfig =
    DEPARTMENT_CONFIGS[selectedDeptId] || DEPARTMENT_CONFIGS.GLOBAL;

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col overflow-hidden relative">
      {/* AFDELINGS SWITCHER OVERLAY (Floating menu boven de Hub) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-full shadow-2xl border border-white/10 flex items-center gap-3 hover:bg-slate-800 transition-all active:scale-95"
        >
          <div className="p-1.5 bg-white/10 rounded-lg">
            {currentConfig.icon}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">
            {currentConfig.name}
          </span>
          <ChevronDown
            size={16}
            className={`transition-transform duration-300 ${
              isMenuOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isMenuOpen && (
          <div className="mt-2 w-64 bg-white rounded-3xl shadow-2xl border border-slate-200 p-2 animate-in zoom-in-95 duration-200">
            {Object.values(DEPARTMENT_CONFIGS).map((dept) => (
              <button
                key={dept.id}
                onClick={() => {
                  setSelectedDeptId(dept.id);
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left group ${
                  selectedDeptId === dept.id
                    ? "bg-blue-50 text-blue-700"
                    : "hover:bg-slate-50 text-slate-500"
                }`}
              >
                <div
                  className={`p-2 rounded-xl transition-colors ${
                    selectedDeptId === dept.id
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 group-hover:bg-white"
                  }`}
                >
                  {dept.icon}
                </div>
                <span className="text-xs font-black uppercase tracking-tight">
                  {dept.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* DE TEAMLEADER HUB (Maar dan met de scope van de planner) */}
      <TeamleaderHub
        key={selectedDeptId} // Forceert een re-mount bij switch voor schone data-init
        onBack={onBack}
        departmentName={currentConfig.name}
        fixedScope={currentConfig.scope}
        allowedMachines={currentConfig.machines}
      />

      {/* Extra hint voor de planner */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
        <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200 shadow-lg flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
            Master Planning Mode
          </span>
        </div>
      </div>
    </div>
  );
};

export default PlannerHub;
