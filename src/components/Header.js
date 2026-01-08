import React, { useState } from "react";
import {
  Search,
  LogOut,
  ShieldCheck,
  User,
  Menu,
  Database,
  Bell,
} from "lucide-react";

/**
 * Header component: Hersteld om Admin Badge betrouwbaar te tonen.
 */
const Header = ({
  user,
  isAdminMode,
  onLogout,
  searchQuery,
  setSearchQuery,
  toggleSidebar,
  logoUrl,
  appName,
  unreadCount = 0,
  onNotificationClick,
}) => {
  const [showLogout, setShowLogout] = useState(false);

  const safeAppName = appName || "FPI GRE Database";
  const titleParts = safeAppName.split(" ");
  const firstPart = titleParts[0];
  const restParts = titleParts.slice(1).join(" ");

  const getDisplayName = () => {
    if (!user) return "Laden...";
    if (user.isAnonymous) return "Gast (Anoniem)";
    if (user.displayName) return user.displayName;
    if (user.email) return user.email.split("@")[0];
    return "Medewerker";
  };

  return (
    <header className="h-20 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-30 relative shadow-md text-white w-full">
      {/* Logo Sectie */}
      <div className="flex items-center gap-4 w-72">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-slate-400 hover:bg-white/10 rounded-lg"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="h-10 w-10 object-contain bg-white/10 rounded-lg p-1"
            />
          ) : (
            <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Database size={20} strokeWidth={3} />
            </div>
          )}
          <div className="hidden sm:block text-left">
            <h1 className="text-xl font-black tracking-tight leading-none italic uppercase">
              {firstPart} <span className="text-emerald-400">{restParts}</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-0.5">
              FPI Technical Hub
            </p>
          </div>
        </div>
      </div>

      {/* Zoekbalk */}
      <div className="flex-1 max-w-2xl px-8 hidden md:block">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder="Snel zoeken..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Gebruiker & Admin Status */}
      <div className="flex items-center justify-end gap-4 min-w-fit">
        <button
          className="relative p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          onClick={onNotificationClick}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white ring-2 ring-slate-900">
              {unreadCount}
            </span>
          )}
        </button>

        {/* ADMIN BADGE: Nu robuuster getoond op basis van de hook */}
        {isAdminMode && (
          <div className="hidden xl:flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in duration-500 italic shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <ShieldCheck size={14} strokeWidth={3} className="animate-pulse" />
            <span>Authorized Admin</span>
          </div>
        )}

        <button
          onClick={onLogout}
          onMouseEnter={() => setShowLogout(true)}
          onMouseLeave={() => setShowLogout(false)}
          className={`relative h-10 w-48 rounded-xl flex items-center justify-center gap-2 transition-all border text-[10px] font-black uppercase tracking-widest ${
            showLogout
              ? "bg-red-500/10 border-red-500/50 text-red-400 shadow-lg shadow-red-900/20"
              : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
          }`}
        >
          {showLogout ? (
            <>
              <LogOut size={16} />
              <span>Nu Uitloggen</span>
            </>
          ) : (
            <>
              <User
                size={16}
                className={
                  user?.isAnonymous
                    ? "text-amber-500"
                    : isAdminMode
                    ? "text-emerald-400"
                    : "text-slate-500"
                }
              />
              <span className="truncate max-w-[130px] italic">
                {getDisplayName()}
              </span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
