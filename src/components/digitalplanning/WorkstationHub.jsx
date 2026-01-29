import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Cpu,
  UserCircle,
  ChevronRight,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";

import TeamleaderFittingHub from "./TeamleaderFittingHub";
import TeamleaderPipesHub from "./TeamleaderPipesHub";
import TeamleaderSpoolsHub from "./TeamleaderSpoolsHub";
import Terminal from "./Terminal";

/**
 * WorkstationHub - V3.1 (Dynamic Factory Config Path Fix)
 * GEFIXST: Pad naar config aangepast naar even aantal segmenten om Firebase errors te voorkomen.
 */
const WorkstationHub = ({ department, onBack }) => {
  const [factoryConfig, setFactoryConfig] = useState(null);
  const [activeStation, setActiveStation] = useState(null);
  const [view, setView] = useState("selection");
  const [loading, setLoading] = useState(true);

  const appId = typeof __app_id !== "undefined" ? __app_id : "fittings-app-v1";

  // 1. Haal de fabrieksconfiguratie op
  useEffect(() => {
    // PAD FIX: Gebruik 6 segmenten
    const docRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "config",
      "factory_config"
    );

    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          setFactoryConfig(snap.data());
        }
        setLoading(false);
      },
      (err) => {
        console.error("Fout bij laden factory_config:", err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [appId]);

  // 2. Filter de stations op basis van de geselecteerde afdeling slug
  const stations = useMemo(() => {
    if (!factoryConfig || !department) return [];

    const slugMap = {
      FITTINGS: "fittings",
      PIPES: "pipes",
      SPOOLS: "spools",
    };

    const targetSlug = slugMap[department] || department.toLowerCase();
    const deptData = (factoryConfig.departments || []).find(
      (d) => d.slug === targetSlug
    );

    return deptData ? deptData.stations || [] : [];
  }, [factoryConfig, department]);

  if (view === "teamleader") {
    if (department === "FITTINGS")
      return (
        <TeamleaderFittingHub
          onBack={() => setView("selection")}
          onExit={onBack}
        />
      );
    if (department === "PIPES")
      return (
        <TeamleaderPipesHub
          onBack={() => setView("selection")}
          onExit={onBack}
        />
      );
    if (department === "SPOOLS")
      return (
        <TeamleaderSpoolsHub
          onBack={() => setView("selection")}
          onExit={onBack}
        />
      );
    return null;
  }

  if (view === "terminal" && activeStation) {
    return (
      <Terminal
        initialStation={activeStation}
        onBack={() => setView("selection")}
      />
    );
  }

  if (loading)
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col animate-in fade-in duration-500 overflow-hidden text-left">
      <div className="p-6 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all active:scale-90"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
              {department} <span className="text-blue-600">Productions</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Live Terminal Toegang
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-10 text-left">
          <section className="text-left">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-900 text-white rounded-lg shadow-lg">
                <ShieldCheck size={18} />
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase italic tracking-widest text-left">
                Afdelingsregie
              </h3>
            </div>
            <button
              onClick={() => setView("teamleader")}
              className="w-full md:w-1/3 group relative p-8 rounded-[40px] bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xl overflow-hidden text-left active:scale-[0.98] border-4 border-blue-500/20"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <UserCircle size={80} />
              </div>
              <div className="relative z-10">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] block mb-2">
                  Manager Mode
                </span>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2">
                  Teamleider
                </h3>
                <p className="text-xs text-slate-400 font-medium max-w-[200px] leading-relaxed">
                  Planning en bezetting beheren.
                </p>
                <div className="mt-6 flex items-center gap-2 text-blue-400 font-black text-[10px] uppercase tracking-widest group-hover:gap-4 transition-all">
                  Hub Openen <ChevronRight size={14} />
                </div>
              </div>
            </button>
          </section>

          <section className="text-left">
            <div className="flex items-center gap-3 mb-6 text-left">
              <div className="p-2 bg-blue-600 text-white rounded-lg shadow-lg">
                <Cpu size={18} />
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase italic tracking-widest text-left">
                Productie Stations
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {stations.map((station) => (
                <button
                  key={station.id}
                  onClick={() => {
                    setActiveStation(station);
                    setView("terminal");
                  }}
                  className="bg-white p-6 rounded-[30px] border-2 border-slate-100 hover:border-blue-500 hover:shadow-2xl transition-all group flex flex-col text-left active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-slate-50 group-hover:bg-blue-50 rounded-2xl transition-colors text-slate-400 group-hover:text-blue-600">
                      <Cpu size={24} />
                    </div>
                    <div className="bg-slate-100 px-3 py-1 rounded-lg text-[9px] font-black text-slate-400 uppercase italic">
                      Active
                    </div>
                  </div>
                  <div className="text-left">
                    <h4 className="text-lg font-black text-slate-800 uppercase italic tracking-tighter mb-1 leading-none">
                      {station.name}
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">
                      ID: {station.id}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {stations.length === 0 && (
              <div className="py-20 text-center bg-slate-100 rounded-[40px] border-2 border-dashed border-slate-200">
                <p className="text-xs font-black uppercase text-slate-400 tracking-widest italic text-center">
                  Nog geen stations geconfigureerd in de Admin.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default WorkstationHub;
