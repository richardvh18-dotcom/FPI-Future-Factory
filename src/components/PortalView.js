import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import {
  Package,
  Factory,
  LogOut,
  ArrowRight,
  Settings,
  ScanBarcode,
  MessageSquare,
  ShieldCheck,
  CalendarRange,
  Globe,
  Camera,
  Cpu,
} from "lucide-react";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useMessages } from "../hooks/useMessages";

/**
 * PortalView - Het centrale startpunt van de applicatie.
 * Herstelt de 'Productie Hub' (Planning) tegel voor alle rollen.
 */
const PortalView = () => {
  const { user, isAdmin, role } = useAdminAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  // Berichten teller voor de badge in de tegel
  const { messages } = useMessages(user);
  const unreadCount = messages
    ? messages.filter((m) => !m.read && !m.archived).length
    : 0;

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isSmallScreen = window.innerWidth < 1024;
      const isMobileAgent = /android|ipad|iphone|ipod/i.test(userAgent);
      return isMobileAgent || isSmallScreen;
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
    const auth = getAuth();
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Fout bij uitloggen:", error);
    }
  };

  // Autorisatie checks voor specifieke dashboards
  const isTeamleader = role === "teamleader" || isAdmin;
  const isPlanner = role === "planner" || isAdmin;
  const isProduction = [
    "operator",
    "teamleader",
    "planner",
    "admin",
    "engineer",
  ].includes(role?.toLowerCase());

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-cyan-950 to-blue-950 overflow-y-auto">
      <div className="min-h-full w-full flex flex-col items-center justify-center p-4 md:p-6 pb-12">
        {/* WELKOM SECTIE */}
        <div className="text-center mb-8 md:mb-12 mt-4 md:mt-0 animate-in fade-in slide-in-from-top-4 duration-700 shrink-0 select-none">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase italic mb-2">
            Welkom,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 block md:inline">
              {displayName}
            </span>
          </h1>
          <p className="text-cyan-200/60 text-[10px] md:text-xs font-bold uppercase tracking-[0.4em] opacity-80">
            Digital Operations Portal | {role?.toUpperCase()}
          </p>
        </div>

        {/* TEGEL GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-7xl px-2 md:px-0 shrink-0">
          {/* === TEGEL: PRODUCTIE HUB (Planning & Terminals) === */}
          {isProduction && (
            <button
              type="button"
              onClick={() => navigate("/planning")}
              className="group relative bg-emerald-600/10 hover:bg-emerald-600/20 border-2 border-emerald-500/30 rounded-[30px] md:rounded-[40px] p-6 md:p-8 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-900/40 overflow-hidden w-full active:scale-95"
            >
              <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Factory className="text-white w-24 h-24 md:w-32 md:h-32" />
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between min-h-[160px] md:min-h-[200px]">
                <div className="p-3 md:p-4 bg-emerald-500 text-white w-fit rounded-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <Factory size={24} className="md:w-8 md:h-8" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight mb-2">
                    Productie Hub
                  </h2>
                  <p className="text-emerald-100/60 text-xs md:text-sm font-medium leading-relaxed max-w-xs">
                    Bekijk de planning en start productie op de werkstations.
                  </p>
                </div>
                <div className="mt-4 md:mt-6 flex items-center text-emerald-400 font-black text-xs uppercase tracking-widest gap-2 group-hover:gap-4 transition-all">
                  Planning & Terminals <ArrowRight size={16} />
                </div>
              </div>
            </button>
          )}

          {/* === TEGEL: MOBILE SCANNER (Alleen op Mobiel) === */}
          {isMobile && isProduction && (
            <button
              type="button"
              onClick={() => navigate("/scanner")}
              className="group relative bg-blue-600/20 hover:bg-blue-600/30 border-2 border-blue-500/40 rounded-[30px] md:rounded-[40px] p-6 md:p-8 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/50 overflow-hidden w-full active:scale-95"
            >
              <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <ScanBarcode className="text-white w-24 h-24 md:w-32 md:h-32" />
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between min-h-[160px] md:min-h-[200px]">
                <div className="p-3 md:p-4 bg-blue-500 text-white w-fit rounded-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <Camera size={24} className="md:w-8 md:h-8" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight mb-2">
                    Global Scanner
                  </h2>
                  <p className="text-blue-100/60 text-xs md:text-sm font-medium leading-relaxed max-w-xs">
                    Snel orders of lotnummers opzoeken via de camera.
                  </p>
                </div>
                <div className="mt-4 md:mt-6 flex items-center text-blue-400 font-black text-xs uppercase tracking-widest gap-2 group-hover:gap-4 transition-all">
                  Camera Starten <ArrowRight size={16} />
                </div>
              </div>
            </button>
          )}

          {/* === TEGEL: CENTRAL PLANNER (Specialistisch) === */}
          {isPlanner && !isMobile && (
            <button
              type="button"
              onClick={() =>
                navigate("/planning", { state: { initialView: "PLANNER" } })
              }
              className="group relative bg-slate-800/40 hover:bg-slate-800/60 border-2 border-white/10 rounded-[30px] md:rounded-[40px] p-6 md:p-8 text-left transition-all duration-300 hover:shadow-2xl overflow-hidden w-full active:scale-95"
            >
              <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <CalendarRange className="text-white w-24 h-24 md:w-32 md:h-32" />
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between min-h-[160px] md:min-h-[200px]">
                <div className="p-3 md:p-4 bg-blue-600/20 text-blue-400 w-fit rounded-2xl mb-4 border border-blue-500/20">
                  <Globe size={24} className="md:w-8 md:h-8" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight mb-2">
                    Master Planning
                  </h2>
                  <p className="text-slate-400 text-xs md:text-sm font-medium leading-relaxed max-w-xs">
                    Beheer de volledige flow en importeer Infor-LN orders.
                  </p>
                </div>
                <div className="mt-4 md:mt-6 flex items-center text-blue-400 font-black text-xs uppercase tracking-widest gap-2 group-hover:gap-4 transition-all">
                  Regiekamer <ArrowRight size={16} />
                </div>
              </div>
            </button>
          )}

          {/* === TEGEL: CATALOGUS === */}
          <button
            type="button"
            onClick={() => navigate("/products")}
            className="group relative bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-blue-500/50 rounded-[30px] md:rounded-[40px] p-6 md:p-8 text-left transition-all duration-300 hover:shadow-2xl overflow-hidden w-full active:scale-95"
          >
            <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Package className="text-white w-24 h-24 md:w-32 md:h-32" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between min-h-[160px] md:min-h-[200px]">
              <div className="p-3 md:p-4 bg-slate-700/50 w-fit rounded-2xl mb-4 text-white border border-white/10">
                <Package size={24} className="md:w-8 md:h-8" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight mb-2">
                  Catalogus
                </h2>
                <p className="text-slate-400 text-xs md:text-sm font-medium max-w-xs leading-relaxed">
                  Technische specificaties en tekeningen van alle producten.
                </p>
              </div>
              <div className="mt-4 md:mt-6 flex items-center text-slate-400 font-black text-xs uppercase tracking-widest gap-2 group-hover:text-white transition-colors">
                Producten Zoeken <ArrowRight size={16} />
              </div>
            </div>
          </button>

          {/* === TEGEL: BERICHTEN === */}
          <button
            type="button"
            onClick={() => navigate("/admin/messages")}
            className="group relative bg-violet-600/5 hover:bg-violet-600/10 border-2 border-violet-500/20 rounded-[30px] md:rounded-[40px] p-6 md:p-8 text-left transition-all duration-300 hover:shadow-2xl overflow-hidden w-full active:scale-95"
          >
            <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <MessageSquare className="text-white w-24 h-24 md:w-32 md:h-32" />
            </div>
            {unreadCount > 0 && (
              <div className="absolute top-6 right-6 bg-rose-500 text-white font-black text-[10px] px-3 py-1 rounded-full animate-pulse shadow-lg z-20 border border-slate-900 uppercase tracking-widest">
                {unreadCount}
              </div>
            )}
            <div className="relative z-10 flex flex-col h-full justify-between min-h-[160px] md:min-h-[200px]">
              <div className="p-3 md:p-4 bg-violet-500/20 w-fit rounded-2xl mb-4 text-violet-400 border border-violet-500/20">
                <MessageSquare size={24} className="md:w-8 md:h-8" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight mb-2">
                  Berichten
                </h2>
                <p className="text-slate-400 text-xs md:text-sm font-medium max-w-xs leading-relaxed">
                  Interne communicatie en notificaties voor validatie.
                </p>
              </div>
              <div className="mt-4 md:mt-6 flex items-center text-violet-400 font-black text-xs uppercase tracking-widest gap-2">
                Inbox Openen <ArrowRight size={16} />
              </div>
            </div>
          </button>

          {/* === TEGEL: BEHEER (Alleen Admin) === */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="group relative bg-rose-600/5 hover:bg-rose-600/10 border-2 border-rose-500/20 rounded-[30px] md:rounded-[40px] p-6 md:p-8 text-left transition-all duration-300 hover:shadow-2xl overflow-hidden w-full active:scale-95"
            >
              <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Settings className="text-white w-24 h-24 md:w-32 md:h-32" />
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between min-h-[160px] md:min-h-[200px]">
                <div className="p-3 md:p-4 bg-rose-500/20 w-fit rounded-2xl mb-4 text-rose-400 border border-rose-500/20">
                  <Settings size={24} className="md:w-8 md:h-8" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight mb-2">
                    Beheer
                  </h2>
                  <p className="text-slate-400 text-xs md:text-sm font-medium max-w-xs leading-relaxed">
                    Systeemconfiguratie, gebruikers en database beheer.
                  </p>
                </div>
                <div className="mt-4 md:mt-6 flex items-center text-rose-400 font-black text-xs uppercase tracking-widest gap-2">
                  Admin Hub <ArrowRight size={16} />
                </div>
              </div>
            </button>
          )}
        </div>

        {/* FOOTER / LOGOUT */}
        <button
          type="button"
          onClick={handleLogout}
          className="mt-12 flex items-center gap-3 text-slate-500 hover:text-white transition-all text-xs font-bold uppercase tracking-[0.3em] opacity-60 hover:opacity-100 py-4 px-8 rounded-full hover:bg-white/5"
        >
          <LogOut size={16} /> Uitloggen Systeem
        </button>
      </div>
    </div>
  );
};

export default PortalView;
