import React, { useState } from "react";
import { Menu, Search, X, Database } from "lucide-react";

const Header = ({
  searchQuery,
  setSearchQuery,
  toggleSidebar,
  logoUrl,
  appName,
}) => {
  const [showMobileSearch, setShowMobileSearch] = useState(false);

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

        {/* Rechts: Mobiele Zoekknop (Enige icoon dat overblijft) */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="p-2 text-slate-400 hover:bg-white/10 hover:text-white rounded-lg md:hidden"
          >
            <Search size={20} />
          </button>
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
