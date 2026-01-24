import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Factory,
  LogOut,
  ArrowRight,
  Settings,
  Monitor,
  ScanBarcode,
} from "lucide-react";
import { useAdminAuth } from "../hooks/useAdminAuth";

const PortalView = () => {
  const { user, logout, isAdmin } = useAdminAuth(); // isAdmin is true als role === 'admin'
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  // Mobiel detectie
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isTouchDevice = /android|ipad|iphone|ipod/i.test(userAgent);
      const isSmallScreen = window.innerWidth < 1024;
      return isTouchDevice || isSmallScreen;
    };

    setIsMobile(checkMobile());

    const handleResize = () => setIsMobile(checkMobile());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const displayName = user?.displayName
    ? user.displayName.split(" ")[0]
    : user?.email?.split("@")[0] || "Medewerker";

  const handleLogout = async () => {
    if (logout) await logout();
    navigate("/login");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-cyan-950 to-blue-950 overflow-y-auto">
      <div className="min-h-full w-full flex flex-col items-center justify-center p-4 md:p-6">
        {/* Welkomsttekst */}
        <div className="text-center mb-8 md:mb-12 mt-4 md:mt-0 animate-in fade-in slide-in-from-top-4 duration-700 shrink-0 select-none">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase italic mb-2">
            Welkom,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 block md:inline">
              {displayName}
            </span>
          </h1>
          <p className="text-cyan-200/60 text-xs md:text-sm font-bold uppercase tracking-[0.2em]">
            Kies uw werkomgeving
          </p>
        </div>

        {/* Keuze Tegels */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-7xl px-2 md:px-0 shrink-0 mb-12">
          {/* Tegel 1: Catalogus (Iedereen) */}
          <button
            type="button"
            onClick={() => navigate("/products")}
            className="group relative bg-white/5 hover:bg-white/10 active:bg-white/15 border-2 border-white/10 hover:border-emerald-500/50 rounded-[30px] md:rounded-[40px] p-6 md:p-8 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-900/50 md:hover:-translate-y-1 overflow-hidden w-full active:scale-95"
          >
            <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              <Package className="text-white w-24 h-24 md:w-32 md:h-32" />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between min-h-[160px] md:min-h-[200px] pointer-events-none">
              <div className="p-3 md:p-4 bg-emerald-500/20 w-fit rounded-2xl mb-4 group-hover:bg-emerald-500 group-hover:text-white transition-colors text-emerald-400">
                <Package size={24} className="md:w-8 md:h-8" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight mb-2">
                  Catalogus
                </h2>
                <p className="text-slate-400 text-xs md:text-sm font-medium leading-relaxed max-w-xs">
                  Zoek productspecificaties en tekeningen.
                </p>
              </div>
              <div className="mt-4 md:mt-6 flex items-center text-emerald-400 font-bold text-xs uppercase tracking-widest gap-2 group-hover:gap-4 transition-all">
                Openen <ArrowRight size={16} />
              </div>
            </div>
          </button>

          {/* Tegel 2: Planning & MES (Iedereen) */}
          <button
            type="button"
            onClick={() => navigate("/planning")}
            className="group relative bg-white/5 hover:bg-white/10 active:bg-white/15 border-2 border-white/10 hover:border-blue-500/50 rounded-[30px] md:rounded-[40px] p-6 md:p-8 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/50 md:hover:-translate-y-1 overflow-hidden w-full active:scale-95"
          >
            <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              <Factory className="text-white w-24 h-24 md:w-32 md:h-32" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between min-h-[160px] md:min-h-[200px] pointer-events-none">
              <div className="p-3 md:p-4 bg-blue-500/20 w-fit rounded-2xl mb-4 group-hover:bg-blue-500 group-hover:text-white transition-colors text-blue-400">
                <Factory size={24} className="md:w-8 md:h-8" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight mb-2">
                  Planning & MES
                </h2>
                <p className="text-slate-400 text-xs md:text-sm font-medium leading-relaxed max-w-xs">
                  Digitale planning en voortgangscontrole.
                </p>
              </div>
              <div className="mt-4 md:mt-6 flex items-center text-blue-400 font-bold text-xs uppercase tracking-widest gap-2 group-hover:gap-4 transition-all">
                Openen <ArrowRight size={16} />
              </div>
            </div>
          </button>

          {/* Tegel 4: Workstation / Terminal (Alleen Mobiel/Tablet) */}
          {isMobile && (
            <button
              type="button"
              onClick={() => navigate("/terminal/MOBILE_SCANNER")}
              className="group relative bg-white/5 hover:bg-white/10 active:bg-white/15 border-2 border-white/10 hover:border-orange-500/50 rounded-[30px] md:rounded-[40px] p-6 md:p-8 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-orange-900/50 md:hover:-translate-y-1 overflow-hidden w-full active:scale-95"
            >
              <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                <ScanBarcode className="text-white w-24 h-24 md:w-32 md:h-32" />
              </div>

              <div className="relative z-10 flex flex-col h-full justify-between min-h-[160px] md:min-h-[200px] pointer-events-none">
                <div className="p-3 md:p-4 bg-orange-500/20 w-fit rounded-2xl mb-4 group-hover:bg-orange-500 group-hover:text-white transition-colors text-orange-400">
                  <Monitor size={24} className="md:w-8 md:h-8" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight mb-2">
                    Workstation
                  </h2>
                  <p className="text-slate-400 text-xs md:text-sm font-medium leading-relaxed max-w-xs">
                    Operator interface voor scanners en tablets op de werkvloer.
                  </p>
                </div>
                <div className="mt-4 md:mt-6 flex items-center text-orange-400 font-bold text-xs uppercase tracking-widest gap-2 group-hover:gap-4 transition-all">
                  Start Scanner <ArrowRight size={16} />
                </div>
              </div>
            </button>
          )}

          {/* Tegel 3: Beheer (Alleen Zichtbaar voor ADMINS) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="group relative bg-white/5 hover:bg-white/10 active:bg-white/15 border-2 border-white/10 hover:border-rose-500/50 rounded-[30px] md:rounded-[40px] p-6 md:p-8 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-rose-900/50 md:hover:-translate-y-1 overflow-hidden w-full active:scale-95"
            >
              <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                <Settings className="text-white w-24 h-24 md:w-32 md:h-32" />
              </div>

              <div className="relative z-10 flex flex-col h-full justify-between min-h-[160px] md:min-h-[200px] pointer-events-none">
                <div className="p-3 md:p-4 bg-rose-500/20 w-fit rounded-2xl mb-4 group-hover:bg-rose-500 group-hover:text-white transition-colors text-rose-400">
                  <Settings size={24} className="md:w-8 md:h-8" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight mb-2">
                    Beheer
                  </h2>
                  <p className="text-slate-400 text-xs md:text-sm font-medium leading-relaxed max-w-xs">
                    Systeembeheer en instellingen.
                  </p>
                </div>
                <div className="mt-4 md:mt-6 flex items-center text-rose-400 font-bold text-xs uppercase tracking-widest gap-2 group-hover:gap-4 transition-all">
                  Openen <ArrowRight size={16} />
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Footer / Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="mt-8 md:mt-12 flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest opacity-60 hover:opacity-100 py-4"
        >
          <LogOut size={16} /> Uitloggen
        </button>
      </div>
    </div>
  );
};

export default PortalView;
