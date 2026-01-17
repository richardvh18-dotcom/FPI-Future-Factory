import React, { useState } from "react";
import {
  Package,
  Database,
  Users,
  Settings,
  MessageSquare,
  Grid,
  Factory,
  ArrowRight,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import { useAdminAuth } from "../../hooks/useAdminAuth";

// Importeer alle sub-schermen
import AdminProductManager from "./AdminProductManager";
import AdminLocationsView from "./AdminLocationsView";
import AdminMatrixManager from "./matrixmanager/AdminMatrixManager";

// FIX: Verwijs naar de algemene DigitalPlanningHub (één map omhoog)
import DigitalPlanningHub from "../digitalplanning/DigitalPlanningHub";

import AdminUsersView from "./AdminUsersView";
import AdminMessagesView from "./AdminMessagesView";
import AdminSettingsView from "./AdminSettingsView";
import AdminDatabaseView from "./AdminDatabaseView";

/**
 * AdminDashboard V4.6 (Import Fix & Originele Layout)
 */
const AdminDashboard = ({ onBack }) => {
  const { role } = useAdminAuth();

  // Interne state voor navigatie (voorkomt crashes als 'navigate' prop mist)
  const [activeScreen, setActiveScreen] = useState(null);

  // De lijst met beheer-opties
  const allItems = [
    {
      id: "admin_products",
      title: "Product Manager",
      desc: "Beheer de catalogus en basisinformatie.",
      icon: <Package size={24} className="text-blue-600" />,
      color: "bg-blue-50 border-blue-100",
      roles: ["admin", "engineer", "teamleader"],
      component: AdminProductManager,
    },
    {
      id: "admin_locations",
      title: "Voorraad & Locaties",
      desc: "Real-time inzicht in mof-voorraad.",
      icon: <Database size={24} className="text-amber-600" />,
      color: "bg-amber-50 border-amber-100",
      roles: ["admin", "engineer", "teamleader"],
      component: AdminLocationsView,
    },
    {
      id: "admin_matrix",
      title: "Matrix Manager",
      desc: "Technische specs en mof-maten.",
      icon: <Grid size={24} className="text-purple-600" />,
      color: "bg-purple-50 border-purple-100",
      roles: ["admin", "engineer"],
      component: AdminMatrixManager,
    },
    {
      id: "admin_digital_planning",
      title: "Digital Planning",
      desc: "Infor-LN planning en lotnummers.",
      icon: <Factory size={24} className="text-emerald-600" />,
      color: "bg-emerald-50 border-emerald-100",
      roles: ["admin", "engineer"],
      component: DigitalPlanningHub, // Gebruikt nu de correcte import
    },
    {
      id: "admin_users",
      title: "Gebruikersbeheer",
      desc: "Beheer accounts en rollen.",
      icon: <Users size={24} className="text-indigo-600" />,
      color: "bg-indigo-50 border-indigo-100",
      roles: ["admin"],
      component: AdminUsersView,
    },
    {
      id: "admin_messages",
      title: "Berichten",
      desc: "Interne communicatie.",
      icon: <MessageSquare size={24} className="text-rose-600" />,
      color: "bg-rose-50 border-rose-100",
      roles: ["admin", "engineer", "teamleader"],
      component: AdminMessagesView,
    },
    {
      id: "admin_settings",
      title: "Instellingen",
      desc: "Systeem-brede configuratie.",
      icon: <Settings size={24} className="text-slate-500" />,
      color: "bg-slate-100 border-slate-200",
      roles: ["admin", "engineer"],
      component: AdminSettingsView,
    },
    {
      id: "admin_database",
      title: "Database Beheer",
      desc: "Directe toegang tot ruwe data.",
      icon: <Database size={24} className="text-red-600" />,
      color: "bg-red-50 border-red-100",
      roles: ["admin"],
      component: AdminDatabaseView,
    },
  ];

  const menuItems = allItems.filter((item) => item.roles.includes(role));

  // RENDER: HET ACTIEVE SUB-SCHERM
  if (activeScreen) {
    const activeItem = menuItems.find((i) => i.id === activeScreen);

    // Speciale afhandeling voor DigitalPlanningHub (heeft eigen onBack nodig om interne state te resetten)
    if (activeItem && activeItem.id === "admin_digital_planning") {
      return <DigitalPlanningHub onBack={() => setActiveScreen(null)} />;
    }

    const ActiveComponent =
      activeItem?.component ||
      (() => (
        <div className="p-8 text-center text-red-500">
          <h3 className="font-bold text-lg">Fout: Component niet geladen</h3>
          <p>Kan module '{activeItem?.title}' niet vinden.</p>
          <button
            onClick={() => setActiveScreen(null)}
            className="mt-4 px-4 py-2 bg-slate-200 rounded"
          >
            Terug
          </button>
        </div>
      ));

    return (
      <div className="flex flex-col h-full bg-slate-50 w-full animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveScreen(null)}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors group"
            >
              <ArrowLeft
                size={20}
                className="text-slate-600 group-hover:text-slate-900"
              />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tight flex items-center gap-2">
                {activeItem?.icon} {activeItem?.title}
              </h2>
            </div>
          </div>
          <div className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider hidden sm:block">
            Admin Mode
          </div>
        </div>

        <div className="flex-1 overflow-auto p-0 md:p-6 w-full h-full relative">
          <ActiveComponent />
        </div>
      </div>
    );
  }

  // RENDER: HOOFDMENU (Jouw Originele Layout)
  return (
    <div className="flex flex-col items-center w-full py-10 px-6 animate-in fade-in duration-500 overflow-y-auto custom-scrollbar text-left h-full">
      <div className="w-full max-w-7xl space-y-10">
        <div className="flex flex-col items-center text-center border-b border-slate-200 pb-10 relative">
          {onBack && (
            <button
              onClick={onBack}
              className="absolute left-0 top-2 text-slate-400 hover:text-slate-600 flex items-center gap-2 text-xs font-bold uppercase transition-colors"
            >
              <ArrowLeft size={16} /> Portal
            </button>
          )}
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-5xl font-black text-slate-900 tracking-tight uppercase italic">
              Admin <span className="text-blue-600">Hub</span>
            </h1>
            <div className="bg-slate-900 text-white px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
              <ShieldAlert size={14} className="text-emerald-400" />
              Ingelogd als: {role}
            </div>
          </div>
          <p className="text-slate-500 font-bold text-lg max-w-2xl uppercase tracking-tighter">
            Centrale beheeromgeving voor engineering en productie-instellingen.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)} // Interne navigatie gebruiken
              className={`group flex flex-col p-8 rounded-[40px] border-2 text-left transition-all duration-500 transform hover:-translate-y-2 bg-white ${item.color} border-transparent shadow-sm hover:shadow-2xl hover:border-white`}
            >
              <div className="flex items-start justify-between mb-8 text-left">
                <div className="p-5 bg-white rounded-3xl shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  {item.icon}
                </div>
                <ArrowRight
                  size={20}
                  className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight text-left">
                {item.title}
              </h3>
              <p className="text-sm text-slate-500 font-medium mt-3 leading-relaxed opacity-80 text-left">
                {item.desc}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
