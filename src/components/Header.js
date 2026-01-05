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
  onNotificationClick, // NIEUW: Functie om naar inbox te gaan
}) => {
  const [showLogout, setShowLogout] = useState(false);

  const safeAppName = appName || "FPI GRE Database";
  const titleParts = safeAppName.split(" ");
  const firstPart = titleParts[0];
  const restParts = titleParts.slice(1).join(" ");

  return (
    <header className="h-20 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-30 relative shadow-md text-white">
      {/* 1. LINKS */}
      <div className="flex items-center gap-4 w-64">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-slate-400 hover:bg-white/10 rounded-lg transition-colors"
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

          <div>
            <h1 className="text-xl font-black tracking-tight leading-none">
              {firstPart} <span className="text-emerald-400">{restParts}</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              Database
            </p>
          </div>
        </div>
      </div>

      {/* 2. MIDDEN */}
      <div className="flex-1 max-w-2xl px-8 hidden md:block">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-inner"
            placeholder="Zoek in catalogus..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 3. RECHTS */}
      <div className="flex items-center justify-end gap-4 w-auto lg:w-auto">
        {/* Notificatie Bel - Nu Klikbaar */}
        <button
          className="relative mr-2 group cursor-pointer focus:outline-none"
          onClick={onNotificationClick}
          title="Naar Inbox"
        >
          <div className="p-2 rounded-xl hover:bg-slate-800 transition-colors text-slate-400 hover:text-white">
            <Bell size={20} />
          </div>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-slate-900 animate-in zoom-in">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}

          {/* Tooltip bij hover */}
          <div className="absolute top-full right-0 mt-2 w-48 bg-white text-slate-800 rounded-xl shadow-xl p-3 text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right border border-slate-200 z-50 pointer-events-none">
            <p className="font-bold border-b border-slate-100 pb-2 mb-2">
              Berichten
            </p>
            {unreadCount > 0 ? (
              <p className="text-blue-600">
                Je hebt {unreadCount} nieuwe berichten.
              </p>
            ) : (
              <p className="text-slate-400">Geen nieuwe berichten.</p>
            )}
            <p className="mt-2 text-[10px] text-slate-300 italic">
              Klik om naar inbox te gaan
            </p>
          </div>
        </button>

        {isAdminMode && (
          <div className="hidden md:flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 h-10 w-40 rounded-xl text-xs font-bold uppercase tracking-wide shadow-sm select-none">
            <ShieldCheck size={16} strokeWidth={2.5} />
            <span>Admin</span>
          </div>
        )}

        <button
          onClick={onLogout}
          onMouseEnter={() => setShowLogout(true)}
          onMouseLeave={() => setShowLogout(false)}
          className={`
                relative h-10 w-40 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 border text-xs font-bold uppercase tracking-wide
                ${
                  showLogout
                    ? "bg-red-500/10 border-red-500/50 text-red-400 shadow-lg shadow-red-900/20"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                }
            `}
          title="Klik om uit te loggen"
        >
          {showLogout ? (
            <>
              <LogOut size={16} />
              <span>Uitloggen</span>
            </>
          ) : (
            <>
              <User size={16} className="text-slate-400" />
              <span className="truncate max-w-[100px]">
                {user.displayName || user.email.split("@")[0]}
              </span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
