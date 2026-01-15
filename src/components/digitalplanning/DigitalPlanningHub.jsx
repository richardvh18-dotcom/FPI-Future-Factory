import React, { useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Activity,
  Monitor,
  Layers,
  Wrench,
  Database,
  Users,
} from "lucide-react";

// Imports hersteld: Zonder extensie werkt het betrouwbaarder in deze omgeving
import { useAdminAuth } from "../../hooks/useAdminAuth";
import TeamleaderHub from "./TeamleaderHub";
import WorkstationHub from "./WorkstationHub";

/**
 * DigitalPlanningHub V10.0
 * Het centrale navigatiepunt voor de fabriek.
 */
const DigitalPlanningHub = ({ onBack }) => {
  const { user } = useAdminAuth();

  // State
  const [currentStation, setCurrentStation] = useState(null);
  const [activeDept, setActiveDept] = useState(null); // Start zonder keuze

  const handleExitStation = () => setCurrentStation(null);

  // Functie om naar een station te gaan
  const handleNavigateToStation = (id) => {
    // Als er op Teamlead wordt geklikt zonder dept, pakken we Fittings als default
    if (id === "TEAMLEAD" && !activeDept) {
      setActiveDept("FITTINGS");
    }
    setCurrentStation({ id });
  };

  const DEPARTMENTS = [
    {
      id: "FITTINGS",
      label: "Fittings",
      icon: <Database size={48} />,
      desc: "Wikkelen, CNC & Nabewerking",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      id: "PIPES",
      label: "Pipes",
      icon: <Layers size={48} />,
      desc: "Productielijnen & BM-inspecties",
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      id: "SPOOLS",
      label: "Spools",
      icon: <Users size={48} />,
      desc: "Samenbouw Teams & Engineering",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  const ALL_STATIONS = [
    {
      id: "TEAMLEAD",
      name: "Management Hub",
      type: "master",
      dept: "ALL",
      color: "text-rose-600",
      bg: "bg-rose-50",
      icon: <BarChart3 size={32} />,
    },

    // FITTINGS
    {
      id: "BM01",
      name: "Eindinspectie",
      type: "inspection",
      dept: "FITTINGS",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      icon: <Monitor size={32} />,
    },
    { id: "BH11", name: "Machine 11", type: "machine", dept: "FITTINGS" },
    { id: "BH12", name: "Machine 12", type: "machine", dept: "FITTINGS" },
    { id: "BH15", name: "Machine 15", type: "machine", dept: "FITTINGS" },
    { id: "BH16", name: "Machine 16", type: "machine", dept: "FITTINGS" },
    { id: "BH17", name: "Machine 17", type: "machine", dept: "FITTINGS" },
    { id: "BH18", name: "Machine 18", type: "machine", dept: "FITTINGS" },
    { id: "BH31", name: "Machine 31", type: "machine", dept: "FITTINGS" },
    { id: "Mazak", name: "CNC Mazak", type: "machine", dept: "FITTINGS" },
    {
      id: "Nabewerking",
      name: "Nabewerking",
      type: "machine",
      dept: "FITTINGS",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },

    // PIPES
    {
      id: "PIPE-L1",
      name: "Pipe Line 1",
      type: "machine",
      dept: "PIPES",
      icon: <Layers size={32} />,
    },
    {
      id: "BM-PIPES",
      name: "QC Pipes (BM)",
      type: "inspection",
      dept: "PIPES",
      color: "text-blue-600",
      bg: "bg-blue-50",
      icon: <Monitor size={32} />,
    },

    // SPOOLS
    {
      id: "SPOOL-W1",
      name: "Samenbouw Team 1",
      type: "machine",
      dept: "SPOOLS",
      icon: <Users size={32} />,
    },
    {
      id: "SPOOL-W2",
      name: "Samenbouw Team 2",
      type: "machine",
      dept: "SPOOLS",
      icon: <Users size={32} />,
    },
  ];

  // STAP 1: KIES AFDELING (ALS NOG NIET GEKOZEN)
  if (!activeDept && !currentStation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-6 h-full overflow-y-auto">
        <div className="w-full max-w-5xl animate-in fade-in duration-500 text-center">
          <h1 className="text-4xl font-black text-slate-800 uppercase italic tracking-tighter mb-2">
            FPI <span className="text-blue-600">Technical Hub</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-xs mb-12">
            Selecteer uw afdeling
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setActiveDept(dept.id)}
                className="bg-white rounded-[40px] p-10 border-2 border-slate-100 hover:border-blue-500 hover:shadow-2xl transition-all group flex flex-col items-center gap-6 shadow-sm active:scale-95"
              >
                <div
                  className={`p-6 rounded-3xl ${dept.bg} ${dept.color} group-hover:scale-110 transition-transform`}
                >
                  {dept.icon}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">
                    {dept.label}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase mt-2">
                    {dept.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={onBack}
            className="mt-16 text-slate-400 hover:text-slate-900 font-black uppercase text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft size={16} /> Terug
          </button>
        </div>
      </div>
    );
  }

  // Filter de stations voor de gekozen afdeling
  const filteredStations = ALL_STATIONS.filter(
    (s) => s.dept === "ALL" || s.dept === activeDept
  );

  // STAP 2: KIES STATION (BINNEN AFDELING)
  if (!currentStation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-6 h-full overflow-y-auto">
        <div className="w-full max-w-7xl animate-in fade-in duration-500">
          <div className="mb-12 text-center relative">
            <button
              onClick={() => setActiveDept(null)}
              className="absolute left-0 top-2 p-2 bg-white rounded-full text-slate-400 hover:text-blue-600 border border-slate-200 shadow-sm transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-4xl font-black text-slate-800 uppercase italic tracking-tighter mb-2">
              {DEPARTMENTS.find((d) => d.id === activeDept)?.label}{" "}
              <span className="text-blue-600">Hub</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">
              Kies een werkstation
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {filteredStations.map((s) => (
              <button
                key={s.id}
                onClick={() => handleNavigateToStation(s.id)}
                className="p-6 bg-white rounded-[32px] border-2 border-slate-100 hover:border-blue-500 hover:shadow-xl transition-all shadow-sm active:scale-95 group flex flex-col items-center text-center relative overflow-hidden"
              >
                <div
                  className={`p-4 ${s.bg || "bg-blue-50"} ${
                    s.color || "text-blue-600"
                  } rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300 relative z-10`}
                >
                  {s.icon || <Activity size={32} />}
                </div>
                <h3 className="text-lg font-black uppercase italic text-slate-800 tracking-tighter mb-1 relative z-10">
                  {s.id}
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-60 italic leading-none relative z-10">
                  {s.name}
                </p>
                {/* Achtergrond effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity z-0"></div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // STAP 3: TOON HUB
  if (currentStation.id === "TEAMLEAD") {
    return (
      <TeamleaderHub
        onExit={handleExitStation}
        onEnterWorkstation={handleNavigateToStation}
        defaultDept={activeDept}
      />
    );
  }

  return (
    <WorkstationHub
      initialStationId={currentStation.id}
      department={activeDept}
      isTeamsMode={activeDept === "SPOOLS"}
      onExit={handleExitStation}
    />
  );
};

export default DigitalPlanningHub;
