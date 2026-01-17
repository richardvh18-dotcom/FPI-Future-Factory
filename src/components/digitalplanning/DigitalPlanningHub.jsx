import React, { useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Activity,
  Monitor,
  Layers,
  Database,
  Users,
  LogOut,
  CalendarRange, // Icoon voor de Planner
} from "lucide-react";

import { useAdminAuth } from "../../hooks/useAdminAuth";
import TeamleaderHub from "./TeamleaderHub";
import WorkstationHub from "./WorkstationHub";
import PlannerHub from "./PlannerHub";

/**
 * DigitalPlanningHub V10.7 (Layout & Functionaliteit Hersteld)
 * - Layout gecentreerd bovenaan (pt-24)
 * - Master Planner en Spools aanwezig
 */
const DigitalPlanningHub = ({ onBack }) => {
  const { user } = useAdminAuth();

  // State
  const [currentStation, setCurrentStation] = useState(null);
  const [activeDept, setActiveDept] = useState(null); // 'FITTINGS', 'PIPES', 'SPOOLS', 'PLANNER'

  const handleExitStation = () => {
    setCurrentStation(null);
    if (activeDept === "PLANNER") {
      setActiveDept(null);
    }
  };

  // Functie om naar een station te gaan
  const handleNavigateToStation = (id) => {
    // Fallback
    if (id === "TEAMLEAD" && !activeDept) {
      setActiveDept("FITTINGS");
    }
    setCurrentStation({ id });
  };

  // Configuratie Afdelingen
  const DEPARTMENTS = [
    {
      id: "FITTINGS",
      scope: "fitting",
      label: "Fittings",
      icon: <Database size={48} />,
      desc: "Wikkelen, CNC & Nabewerking",
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "hover:border-blue-500",
    },
    {
      id: "PIPES",
      scope: "pipe",
      label: "Pipes",
      icon: <Layers size={48} />,
      desc: "Productielijnen & BM-inspecties",
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "hover:border-orange-500",
    },
    {
      id: "SPOOLS",
      scope: "spool",
      label: "Spools",
      icon: <Users size={48} />,
      desc: "Samenbouw Teams & Engineering",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "hover:border-emerald-500",
    },
  ];

  // Configuratie Stations (Machines)
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
    { id: "BH05", name: "Machine 05", type: "machine", dept: "PIPES" },
    { id: "BH07", name: "Machine 07", type: "machine", dept: "PIPES" },
    { id: "BH08", name: "Machine 08", type: "machine", dept: "PIPES" },
    { id: "BH09", name: "Machine 09", type: "machine", dept: "PIPES" },
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
      <div className="flex flex-col h-screen w-full bg-slate-50 items-center justify-start pt-24 p-6 overflow-hidden">
        <div className="w-full max-w-6xl animate-in fade-in zoom-in duration-500 text-center flex flex-col items-center">
          <h1 className="text-4xl font-black text-slate-800 uppercase italic tracking-tighter mb-2">
            FPI <span className="text-blue-600">Technical Hub</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-xs mb-12">
            Selecteer uw werkgebied
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl">
            {/* MASTER PLANNER TEGEL */}
            <button
              onClick={() => setActiveDept("PLANNER")}
              className="bg-white rounded-[40px] p-8 border-2 border-slate-100 hover:border-purple-500 hover:shadow-2xl transition-all group flex flex-col items-center gap-6 shadow-sm active:scale-95 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <CalendarRange size={100} className="text-purple-600" />
              </div>
              <div className="p-6 rounded-3xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform relative z-10">
                <CalendarRange size={48} />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">
                  Master Planner
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase mt-2">
                  Fabrieksbrede Planning
                </p>
              </div>
            </button>

            {/* AFDELINGEN */}
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setActiveDept(dept.id)}
                className={`bg-white rounded-[40px] p-8 border-2 border-slate-100 ${dept.border} hover:shadow-2xl transition-all group flex flex-col items-center gap-6 shadow-sm active:scale-95`}
              >
                <div
                  className={`p-6 rounded-3xl ${dept.bg} ${dept.color} group-hover:scale-110 transition-transform`}
                >
                  {dept.icon}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">
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
            className="mt-16 bg-white p-4 px-8 rounded-2xl border-2 border-slate-100 hover:border-red-200 hover:bg-red-50 text-slate-400 hover:text-red-600 font-black uppercase text-xs flex items-center justify-center gap-3 transition-all shadow-sm hover:shadow-md active:scale-95 w-full max-w-xs"
          >
            <LogOut size={20} /> Terug naar Portal
          </button>
        </div>

        {/* Footer */}
        <div className="absolute bottom-4 text-center text-slate-300 text-[10px] font-mono uppercase tracking-widest">
          FPi Future Factory • v3.4 • Digital Planning Module
        </div>
      </div>
    );
  }

  // --- NIEUWE ROUTE: MASTER PLANNER ---
  if (activeDept === "PLANNER" && !currentStation) {
    return (
      <PlannerHub
        onExit={handleExitStation}
        onEnterWorkstation={(stationId) => setCurrentStation({ id: stationId })}
      />
    );
  }

  // Filter de stations voor de gekozen afdeling
  const filteredStations = ALL_STATIONS.filter(
    (s) => s.dept === "ALL" || s.dept === activeDept
  );

  // STAP 2: KIES STATION (BINNEN AFDELING)
  if (!currentStation) {
    const deptInfo = DEPARTMENTS.find((d) => d.id === activeDept);

    return (
      <div className="flex flex-col h-screen w-full bg-slate-50 items-center justify-start pt-24 p-6 overflow-hidden">
        <div className="w-full max-w-7xl animate-in fade-in slide-in-from-right-8 duration-500 text-center flex flex-col items-center">
          <div className="mb-12 relative inline-block">
            <h1 className="text-4xl font-black text-slate-800 uppercase italic tracking-tighter mb-2">
              {deptInfo?.label} <span className="text-blue-600">Hub</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">
              Kies een werkstation
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-center w-full">
            {filteredStations.map((s) => (
              <button
                key={s.id}
                onClick={() => handleNavigateToStation(s.id)}
                className={`p-6 bg-white rounded-[32px] border-2 ${
                  s.id === "TEAMLEAD"
                    ? "border-rose-100 hover:border-rose-500"
                    : "border-slate-100 hover:border-blue-500"
                } hover:shadow-xl transition-all shadow-sm active:scale-95 group flex flex-col items-center text-center relative overflow-hidden h-48 justify-center`}
              >
                <div
                  className={`p-4 ${s.bg || "bg-blue-50"} ${
                    s.color || "text-blue-600"
                  } rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300 relative z-10`}
                >
                  {s.icon || <Activity size={32} />}
                </div>
                <h3 className="text-sm font-black uppercase italic text-slate-800 tracking-tight mb-1 relative z-10">
                  {s.name}
                </h3>
                {s.type !== "master" && (
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-60 italic leading-none relative z-10">
                    {s.id}
                  </p>
                )}
                <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity z-0"></div>
              </button>
            ))}
          </div>

          {/* GROTE TERUG KNOP ONDERAAN */}
          <button
            onClick={() => setActiveDept(null)}
            className="mt-12 bg-white p-4 px-8 rounded-2xl border-2 border-slate-100 hover:border-blue-200 hover:bg-blue-50 text-slate-400 hover:text-blue-600 font-black uppercase text-xs flex items-center justify-center gap-3 transition-all shadow-sm hover:shadow-md active:scale-95 w-full max-w-xs"
          >
            <ArrowLeft size={20} />
            Terug naar Afdelings Selectie
          </button>
        </div>
      </div>
    );
  }

  // STAP 3: TOON HUB
  if (currentStation.id === "TEAMLEAD") {
    const scope =
      DEPARTMENTS.find((d) => d.id === activeDept)?.scope || "fitting";
    return (
      <TeamleaderHub
        fixedScope={scope}
        onExit={handleExitStation}
        onEnterWorkstation={(stationId) => handleNavigateToStation(stationId)}
        defaultDept={activeDept}
      />
    );
  }

  // Anders -> WorkstationHub
  return (
    <WorkstationHub
      initialStationId={currentStation.id}
      department={activeDept}
      isTeamsMode={activeDept === "SPOOLS"}
      onExit={handleExitStation}
      operatorName={user?.email || "Operator"}
    />
  );
};

export default DigitalPlanningHub;
