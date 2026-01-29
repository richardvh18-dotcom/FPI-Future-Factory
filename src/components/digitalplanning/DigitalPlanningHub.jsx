import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Activity,
  Layers,
  Database,
  CalendarRange,
} from "lucide-react";

import WorkstationHub from "./WorkstationHub";
import PlannerHub from "./PlannerHub";

/**
 * DigitalPlanningHub - De hoofd-entree voor alle productie-gerelateerde hubs.
 * Gefikst: Luistert nu naar 'state' vanuit de router om direct de juiste view te tonen.
 */
const DigitalPlanningHub = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeDept, setActiveDept] = useState(null);

  // --- AUTO-ROUTE LOGICA ---
  // Controleer bij het laden of we vanuit de portal direct naar een specifieke view moeten
  useEffect(() => {
    if (location.state?.initialView) {
      setActiveDept(location.state.initialView);

      // Optioneel: Clean up state zodat een refresh je weer naar het menu brengt indien gewenst
      // window.history.replaceState({}, document.title);
    }
  }, [location]);

  const DEPARTMENTS = [
    {
      id: "FITTINGS",
      title: "Fitting Productions",
      icon: <Layers size={32} />,
      description: "Hulpstukken & Voorbewerking",
      color: "bg-emerald-600",
    },
    {
      id: "PIPES",
      title: "Pipe Productions",
      icon: <Database size={32} />,
      description: "Leidingwerk & Lamineren",
      color: "bg-orange-600",
    },
    {
      id: "SPOOLS",
      title: "Spools Productions",
      icon: <Activity size={32} />,
      description: "Assemblage & Prefab",
      color: "bg-purple-600",
    },
    {
      id: "PLANNER",
      title: "Central Planner",
      icon: <CalendarRange size={32} />,
      description: "Werkvoorbereiding & Planning",
      color: "bg-blue-600",
    },
  ];

  // Toon de Planner Hub (Centrale Planning)
  if (activeDept === "PLANNER") {
    return <PlannerHub onBack={() => setActiveDept(null)} />;
  }

  // Toon de Workstation Hub (Afdelings-specifiek)
  if (activeDept) {
    return (
      <WorkstationHub
        key={activeDept}
        department={activeDept}
        onBack={() => setActiveDept(null)}
      />
    );
  }

  // Toon het hoofdmenu (Productie Hub)
  return (
    <div className="h-full w-full bg-slate-50 flex flex-col p-6 animate-in fade-in overflow-y-auto">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-slate-900 mb-2 uppercase italic tracking-tighter">
            Productie <span className="text-blue-600">Hub</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
            Maak uw keuze
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setActiveDept(dept.id)}
              className="group relative p-8 rounded-[40px] border-2 border-slate-100 bg-white hover:border-transparent hover:shadow-2xl hover:-translate-y-2 text-left transition-all duration-300 overflow-hidden"
            >
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg transition-transform group-hover:scale-110 duration-300 ${dept.color}`}
              >
                {dept.icon}
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2 group-hover:text-blue-600 transition-colors">
                {dept.title}
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                {dept.description}
              </p>
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate("/portal")}
          className="mt-16 mx-auto flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold uppercase text-xs tracking-widest transition-colors"
        >
          <ArrowLeft size={16} /> Terug naar Portal
        </button>
      </div>
    </div>
  );
};

export default DigitalPlanningHub;
