import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useMessages } from "../hooks/useMessages";
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
  Filter,
} from "lucide-react";

/**
 * Sidebar - Global Navigatie Component.
 * GEWIJZIGD: De gebruikersbadge is nu een NavLink naar /profile voor betere routing stabiliteit.
 */
const Sidebar = ({
  onToggleCatalogFilters,
  isCatalogFiltersOpen,
  onLogout,
}) => {
  const { isAdmin, loading, user } = useAdminAuth();

  const { messages } = useMessages(user);
  const unreadCount = messages
    ? messages.filter((m) => !m.read && !m.archived).length
    : 0;

  const location = useLocation();

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
      adminOnly: false,
      badge: unreadCount,
    },
    { path: "/admin", label: "Beheer", icon: Settings, adminOnly: true },
  ];

  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly) return isAdmin;
    return true;
  });

  const badgeText = showName
    ? user?.name || user?.email || "Onbekend"
    : isAdmin
    ? "ADMINISTRATOR"
    : (user?.role || "OPERATOR").toUpperCase();

  return (
    <aside
      className={`bg-slate-900 text-slate-300 flex flex-col fixed left-0 border-r border-slate-800 z-[60] hidden md:flex transition-all duration-300 ease-in-out
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
              <div key={item.path} className="flex flex-col gap-1 text-left">
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 whitespace-nowrap relative ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20"
                        : "hover:bg-slate-800 hover:text-white border border-transparent"
                    } ${isExpanded ? "justify-start" : "justify-center"}`
                  }
                >
                  <div className="relative shrink-0">
                    <item.icon size={20} strokeWidth={2} />
                    {item.badge > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-slate-900 animate-pulse">
                        {item.badge > 9 ? "!" : item.badge}
                      </span>
                    )}
                  </div>

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
                    style={{ width: "90%" }}
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
          <NavLink
            to="/profile"
            className={({ isActive }) => `
              w-full mb-2 rounded-lg text-xs font-bold border flex items-center transition-all duration-300 overflow-hidden whitespace-nowrap group
              ${isExpanded ? "px-3 py-2 gap-2" : "p-2 justify-center"} 
              ${
                isActive
                  ? "bg-blue-600 text-white border-blue-500 shadow-lg"
                  : isAdmin
                  ? "bg-emerald-900/30 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/50"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white"
              }
            `}
          >
            {isAdmin ? (
              <ShieldCheck size={14} className="shrink-0" />
            ) : (
              <User size={14} className="shrink-0" />
            )}
            <span
              className={`truncate uppercase tracking-wide transition-all duration-300 text-left ${
                isExpanded ? "opacity-100 max-w-[150px]" : "opacity-0 max-w-0"
              }`}
            >
              {badgeText}
            </span>
          </NavLink>
        )}

        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-colors text-slate-400 whitespace-nowrap ${
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
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
