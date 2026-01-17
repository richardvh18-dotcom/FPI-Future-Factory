import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  Menu,
  Search,
  User,
  LogOut,
  Settings,
  ChevronDown,
  X,
  Database,
  ShieldCheck,
  Briefcase,
  MessageSquarePlus, // NIEUW: Icoon voor nieuw bericht
} from "lucide-react";
import { useAdminAuth } from "../hooks/useAdminAuth";

const Header = ({
  user,
  isAdminMode,
  onLogout,
  searchQuery,
  setSearchQuery,
  toggleSidebar,
  logoUrl,
  appName,
  unreadCount,
  onNotificationClick,
  onNewMessage, // NIEUW: Prop om modal te openen
  onNavigate, // TOEGEVOEGD: Voor profiel navigatie
}) => {
  // Haal auth data op als fallback
  const { user: authUser, role, logout } = useAdminAuth();

  // Gebruik props als ze er zijn, anders de hook data.
  const currentUser = user || authUser;
  // Bepaal admin mode: als prop is meegegeven, gebruik die. Anders check rol.
  const isUserAdmin =
    isAdminMode !== undefined ? isAdminMode : role === "admin";

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showRoleInfo, setShowRoleInfo] = useState(false);

  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowRoleInfo((prev) => !prev);
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const handleLogoutAction = () => {
    if (onLogout) {
      onLogout();
    } else if (logout) {
      logout();
    }
    setShowUserMenu(false);
  };

  const displayName = currentUser?.email?.split("@")[0] || "Gebruiker";

  return (
    <header className="bg-gradient-to-r from-slate-900 via-cyan-950 to-blue-950 border-b border-white/10 sticky top-0 z-40 h-16 shrink-0 text-white shadow-md">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Links: Logo & Toggle */}
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={toggleSidebar}
            className="p-2 -ml-2 text-slate-400 hover:bg-white/10 hover:text-white rounded-lg lg:hidden transition-colors"
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-8 w-auto object-contain bg-white/10 rounded p-0.5"
              />
            ) : (
              <div className="h-8 w-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-500/20 border border-white/10">
                <Database size={20} />
              </div>
            )}
            <div className="hidden sm:block">
              <span className="text-lg font-black text-white tracking-tight block leading-none">
                {appName || "FPI Future Factory"}
              </span>
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest block opacity-80">
                Digital Production Hub
              </span>
            </div>
          </div>
        </div>

        {/* Midden: Zoekbalk */}
        <div className="flex-1 max-w-2xl mx-auto hidden md:block">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-400 transition-colors" />
            </div>
            <input
              type="text"
              value={searchQuery || ""}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-xl leading-5 bg-slate-950/50 text-white placeholder-slate-500 focus:outline-none focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all sm:text-sm"
              placeholder="Zoek op order, lotnummer of item..."
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery && setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Rechts: Acties & User Profiel */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="p-2 text-slate-400 hover:bg-white/10 hover:text-white rounded-lg md:hidden"
          >
            <Search size={20} />
          </button>

          {/* NIEUW: SNEL BERICHT KNOP */}
          <button
            onClick={onNewMessage}
            className="relative p-2 text-slate-400 hover:bg-white/10 hover:text-white rounded-lg transition-colors group"
            title="Nieuw Bericht"
          >
            <MessageSquarePlus
              size={20}
              className="group-hover:text-cyan-400 transition-colors"
            />
          </button>

          {/* Notificaties */}
          <button
            onClick={onNotificationClick}
            className="relative p-2 text-slate-400 hover:bg-white/10 hover:text-white rounded-lg transition-colors group"
          >
            <Bell
              size={20}
              className="group-hover:text-emerald-400 transition-colors"
            />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-slate-900 animate-pulse" />
            )}
          </button>

          {/* DYNAMISCHE USER KNOP */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 w-56 h-12"
            >
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center text-white shadow-sm font-bold border border-white/10 shrink-0 transition-all duration-500 ${
                  showRoleInfo
                    ? "bg-cyan-600"
                    : "bg-gradient-to-br from-emerald-500 to-teal-600"
                }`}
              >
                {showRoleInfo ? (
                  isUserAdmin ? (
                    <ShieldCheck size={18} />
                  ) : (
                    <Briefcase size={18} />
                  )
                ) : (
                  currentUser?.email?.[0].toUpperCase() || <User size={18} />
                )}
              </div>

              <div className="hidden sm:block text-left flex-1 overflow-hidden">
                <div className="transition-all duration-500">
                  <p className="text-sm font-bold text-slate-100 leading-none truncate animate-in fade-in slide-in-from-bottom-1">
                    {showRoleInfo
                      ? isUserAdmin
                        ? "Administrator"
                        : "Operator"
                      : displayName}
                  </p>
                  <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-wide mt-0.5 animate-in fade-in slide-in-from-bottom-1 truncate">
                    {showRoleInfo ? "Huidige Functie" : "Ingelogd Gebruiker"}
                  </p>
                </div>
              </div>
              <ChevronDown
                size={16}
                className={`text-slate-400 transition-transform duration-200 hidden sm:block shrink-0 ${
                  showUserMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1 focus:outline-none transform origin-top-right transition-all animate-in fade-in slide-in-from-top-2 text-slate-800 z-50">
                <div className="px-4 py-3 border-b border-gray-50 sm:hidden">
                  <p className="text-sm font-bold text-gray-900">
                    {currentUser?.email}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {isUserAdmin ? "Admin" : "User"}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    if (onNavigate) onNavigate("profile"); // DEZE REGEL ZORGT VOOR DE WERKING
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-2 transition-colors"
                >
                  <User size={16} /> Profiel
                </button>
                <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-2 transition-colors">
                  <Settings size={16} /> Instellingen
                </button>

                <div className="my-1 border-t border-gray-50" />

                <button
                  onClick={handleLogoutAction}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-medium"
                >
                  <LogOut size={16} /> Uitloggen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="absolute inset-x-0 top-16 bg-slate-900 border-b border-slate-800 p-4 md:hidden animate-in slide-in-from-top-2 z-30 shadow-lg">
          <div className="relative">
            <Search className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500" />
            <input
              type="text"
              autoFocus
              value={searchQuery || ""}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              placeholder="Zoeken..."
            />
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
