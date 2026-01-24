import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom"; // useLocation toegevoegd
import { useAdminAuth } from "../hooks/useAdminAuth";
import {
  LayoutGrid,
  Package,
  Search,
  Calculator,
  Bot,
  Settings,
  LogOut,
  Mail,
  ShieldCheck,
  User,
  Factory,
  Filter, // Nieuw icoon voor de filter knop
} from "lucide-react";

const Sidebar = ({ onToggleCatalogFilters, isCatalogFiltersOpen }) => {
  const { isAdmin, loading, user } = useAdminAuth();
  const location = useLocation(); // We moeten weten op welke pagina we zijn

  const [isExpanded, setIsExpanded] = useState(false);
  const [showName, setShowName] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowName((prev) => !prev);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { path: "/", label: "Portaal", icon: LayoutGrid },
    { path: "/planning", label: "Planning", icon: Factory },
    { path: "/products", label: "Catalogus", icon: Search },
    { path: "/inventory", label: "Gereedschap", icon: Package },
    { path: "/assistant", label: "AI Assistent", icon: Bot },
    { path: "/calculator", label: "Calculator", icon: Calculator },
    {
      path: "/admin/messages",
      label: "Berichten",
      icon: Mail,
      adminOnly: true,
    },
    { path: "/admin", label: "Beheer", icon: Settings, adminOnly: true },
  ];

  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly) return isAdmin;
    return true;
  });

  const badgeText = showName
    ? user?.email || "Onbekende Gebruiker"
    : isAdmin
    ? "ADMINISTRATOR"
    : "OPERATOR";

  return (
    <aside
      className={`bg-slate-900 text-slate-300 flex flex-col fixed left-0 border-r border-slate-800 z-50 hidden md:flex transition-all duration-300 ease-in-out
        ${isExpanded ? "w-64" : "w-16"} 
      `}
      style={{ top: "4rem", height: "calc(100vh - 4rem)" }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <nav className="flex-1 px-2 pt-4 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
        {loading ? (
          <div className="px-2 py-3 text-xs text-slate-500 animate-pulse text-center">
            ...
          </div>
        ) : (
          visibleItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <div key={item.path} className="flex flex-col gap-1">
                {/* Hoofd Item */}
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20"
                        : "hover:bg-slate-800 hover:text-white border border-transparent"
                    } ${isExpanded ? "justify-start" : "justify-center"}`
                  }
                >
                  <item.icon size={20} strokeWidth={2} className="shrink-0" />
                  <span
                    className={`transition-all duration-300 origin-left ${
                      isExpanded
                        ? "opacity-100 w-auto translate-x-0"
                        : "opacity-0 w-0 -translate-x-4 overflow-hidden"
                    }`}
                  >
                    {item.label}
                  </span>
                </NavLink>

                {/* SUB-KNOP: Alleen tonen als we op de Catalogus pagina zijn én bij het item Catalogus */}
                {item.path === "/products" && isActive && (
                  <button
                    onClick={onToggleCatalogFilters}
                    className={`
                      ml-auto mr-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider
                      transition-all duration-300 border
                      ${
                        isCatalogFiltersOpen
                          ? "bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20"
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
                      }
                      ${
                        isExpanded
                          ? "opacity-100 translate-x-0"
                          : "opacity-0 -translate-x-4 hidden"
                      }
                    `}
                    style={{ width: "90%" }} // Iets smaller dan de hoofdknop
                  >
                    <Filter size={14} />
                    <span>
                      {isCatalogFiltersOpen
                        ? "Verberg Filters"
                        : "Toon Filters"}
                    </span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </nav>

      <div className="p-2 border-t border-slate-800">
        {!loading && (
          <div
            className={`mb-2 rounded-lg text-xs font-bold border flex items-center transition-all duration-300 overflow-hidden whitespace-nowrap ${
              isExpanded ? "px-3 py-2 gap-2" : "p-2 justify-center"
            } ${
              isAdmin
                ? "bg-emerald-900/30 text-emerald-400 border-emerald-500/30"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            {isAdmin ? (
              <ShieldCheck size={14} className="shrink-0" />
            ) : (
              <User size={14} className="shrink-0" />
            )}
            <span
              className={`truncate uppercase tracking-wide transition-all duration-300 ${
                isExpanded ? "opacity-100 max-w-[150px]" : "opacity-0 max-w-0"
              }`}
            >
              {badgeText}
            </span>
          </div>
        )}

        <NavLink
          to="/login"
          className={`flex items-center gap-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-colors text-slate-400 whitespace-nowrap ${
            isExpanded ? "px-4 py-3 justify-start" : "p-3 justify-center"
          }`}
          title="Uitloggen"
        >
          <LogOut size={18} className="shrink-0" />
          <span
            className={`text-sm font-medium transition-all duration-300 ${
              isExpanded
                ? "opacity-100 w-auto"
                : "opacity-0 w-0 overflow-hidden"
            }`}
          >
            Uitloggen
          </span>
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
