import React from "react";
import { Package, Factory, LogOut, ArrowRight, Database } from "lucide-react";

const PortalView = ({ user, onSelect, onLogout }) => {
  // AANGEPAST: Gebruik de echte naam (displayName) als die er is, anders de email-naam
  // We splitsen op spatie om alleen de voornaam te tonen (bijv. "Richard" van "Richard van Hout")
  const displayName = user?.displayName
    ? user.displayName.split(" ")[0]
    : user?.email?.split("@")[0] || "Medewerker";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-950 to-blue-950 flex flex-col items-center justify-center p-6">
      {/* Header Info */}
      <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
        {/* Logo Icoon */}
        <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-6 backdrop-blur-sm border border-white/20 shadow-2xl mx-auto">
          <Database className="text-white w-10 h-10" />
        </div>

        {/* App Naam */}
        <div className="mb-8">
          <h2 className="text-3xl font-black text-white tracking-tight uppercase italic mb-1">
            FPI Future Factory
          </h2>
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-[0.3em]">
            Digital Production Hub
          </p>
        </div>

        {/* Welkomsttekst met Voornaam */}
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase italic mb-2">
          Welkom,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            {displayName}
          </span>
        </h1>
        <p className="text-cyan-200/60 text-sm font-bold uppercase tracking-[0.2em]">
          Kies uw werkomgeving
        </p>
      </div>

      {/* Keuze Tegels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {/* Tegel 1: Catalogus */}
        <button
          onClick={() => onSelect("catalog")}
          className="group relative bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-emerald-500/50 rounded-[40px] p-8 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-900/50 hover:-translate-y-1 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Package size={120} className="text-white" />
          </div>

          <div className="relative z-10 flex flex-col h-full justify-between min-h-[200px]">
            <div className="p-4 bg-emerald-500/20 w-fit rounded-2xl mb-4 group-hover:bg-emerald-500 group-hover:text-white transition-colors text-emerald-400">
              <Package size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">
                Product Catalogus
              </h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xs">
                Zoek productspecificaties, bekijk technische tekeningen en
                controleer mof-maten.
              </p>
            </div>
            <div className="mt-6 flex items-center text-emerald-400 font-bold text-xs uppercase tracking-widest gap-2 group-hover:gap-4 transition-all">
              Naar Catalogus <ArrowRight size={16} />
            </div>
          </div>
        </button>

        {/* Tegel 2: Planning */}
        <button
          onClick={() => onSelect("planning")}
          className="group relative bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-blue-500/50 rounded-[40px] p-8 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/50 hover:-translate-y-1 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Factory size={120} className="text-white" />
          </div>

          <div className="relative z-10 flex flex-col h-full justify-between min-h-[200px]">
            <div className="p-4 bg-blue-500/20 w-fit rounded-2xl mb-4 group-hover:bg-blue-500 group-hover:text-white transition-colors text-blue-400">
              <Factory size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">
                Digitale Planning
              </h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xs">
                Beheer productieorders, start werkstations en monitor de
                voortgang real-time.
              </p>
            </div>
            <div className="mt-6 flex items-center text-blue-400 font-bold text-xs uppercase tracking-widest gap-2 group-hover:gap-4 transition-all">
              Naar Planning <ArrowRight size={16} />
            </div>
          </div>
        </button>
      </div>

      {/* Footer / Logout */}
      <button
        onClick={onLogout}
        className="mt-12 flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest opacity-60 hover:opacity-100"
      >
        <LogOut size={16} /> Uitloggen
      </button>
    </div>
  );
};

export default PortalView;
