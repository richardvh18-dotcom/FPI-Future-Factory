import React from "react";
import {
  Search,
  Sparkles,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Circle,
} from "lucide-react";

const Header = ({
  isAdminMode,
  onAdminToggle,
  user,
  onAskAI,
  onLogout,
  searchQuery,
  setSearchQuery,
}) => {
  const handleAiSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) onAskAI(searchQuery);
  };
  return (
    <header className="bg-slate-900 text-white h-16 flex items-center justify-between px-6 shadow-2xl z-50 border-b border-white/5">
      <div className="flex items-center gap-4">
        <div className="h-10 w-1 flex bg-emerald-500 rounded-full" />
        <div className="hidden sm:block text-left text-white font-black uppercase italic leading-none">
          <h1 className="text-lg">
            Future Pipe <span className="text-emerald-500">Industries</span>
          </h1>
          <p className="text-[9px] text-emerald-400 mt-1 italic">
            GRE Technical Database
          </p>
        </div>
      </div>
      <form onSubmit={handleAiSubmit} className="flex-1 max-w-lg mx-8 relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          size={16}
        />
        <input
          type="text"
          className="w-full bg-slate-800 text-white pl-10 pr-12 py-2 rounded-xl text-xs font-bold outline-none border border-white/5 focus:border-blue-500 transition-all shadow-inner"
          placeholder="Snelzoeken..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all shadow-lg"
        >
          <Sparkles size={12} />
        </button>
      </form>
      <div className="flex items-center gap-4">
        <button
          onClick={onAdminToggle}
          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-2 border ${
            isAdminMode
              ? "bg-emerald-600 border-white/10 text-white shadow-lg"
              : "bg-slate-800 border-white/5 text-slate-500"
          }`}
        >
          {isAdminMode ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}{" "}
          <span>{isAdminMode ? "Admin" : "User"}</span>
        </button>
        <button
          onClick={onLogout}
          className="p-2.5 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};

export default Header;
