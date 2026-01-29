import React, { useState, Suspense } from "react";
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
  Loader2,
  ArrowRightLeft,
  UserCheck,
  Layout,
} from "lucide-react";
import { useAdminAuth } from "../../hooks/useAdminAuth";

// --- LAZY LOAD IMPORTS ---
const AdminProductManager = React.lazy(() => import("./AdminProductManager"));
const AdminLocationsView = React.lazy(() => import("./AdminLocationsView"));
const AdminMatrixManager = React.lazy(() =>
  import("./matrixmanager/AdminMatrixManager")
);
const DigitalPlanningHub = React.lazy(() =>
  import("../digitalplanning/DigitalPlanningHub")
);
const AdminUsersView = React.lazy(() => import("./AdminUsersView"));
const AdminMessagesView = React.lazy(() => import("./AdminMessagesView"));
const AdminSettingsView = React.lazy(() => import("./AdminSettingsView"));
const AdminDatabaseView = React.lazy(() => import("./AdminDatabaseView"));
const ConversionManager = React.lazy(() => import("./ConversionManager"));
const PersonnelManager = React.lazy(() => import("./PersonnelManager"));
const FactoryStructureManager = React.lazy(() =>
  import("./FactoryStructureManager")
);

/**
 * AdminDashboard - Het centrale beheerpaneel.
 * Versie: 2.5 (Structure Manager Update)
 */
const AdminDashboard = ({ onBack }) => {
  const { role } = useAdminAuth();
  const [activeScreen, setActiveScreen] = useState(null);

  // Configuratie van alle beschikbare admin modules
  const allItems = [
    {
      id: "admin_products",
      title: "Product Manager",
      desc: "Beheer de catalogus en basisinformatie van producten.",
      icon: <Package size={24} className="text-blue-600" />,
      color: "bg-blue-50 border-blue-100",
      roles: ["admin", "engineer", "teamleader"],
      component: AdminProductManager,
    },
    {
      id: "admin_factory_config",
      title: "Fabrieksstructuur",
      desc: "Beheer afdelingen en werkstations voor alle Hubs (Fittings, Spools, Pipes).",
      icon: <Layout size={24} className="text-blue-600" />,
      color: "bg-blue-50 border-blue-100",
      roles: ["admin"],
      component: FactoryStructureManager,
    },
    {
      id: "admin_personnel",
      title: "Personeel & Bezetting",
      desc: "Beheer medewerkers, ploegendiensten en live machine-bezetting.",
      icon: <UserCheck size={24} className="text-indigo-600" />,
      color: "bg-indigo-50 border-indigo-100",
      roles: ["admin", "teamleader", "engineer"],
      component: PersonnelManager,
    },
    {
      id: "admin_conversions",
      title: "Conversie Matrix",
      desc: "Beheer de koppeling tussen Planning Codes (Old) en Tekening Codes (New).",
      icon: <ArrowRightLeft size={24} className="text-teal-600" />,
      color: "bg-teal-50 border-teal-100",
      roles: ["admin", "engineer"],
      component: ConversionManager,
    },
    {
      id: "admin_locations",
      title: "Voorraad & Locaties",
      desc: "Real-time inzicht in mof-voorraad en opslaglocaties.",
      icon: <Database size={24} className="text-amber-600" />,
      color: "bg-amber-50 border-amber-100",
      roles: ["admin", "engineer", "teamleader"],
      component: AdminLocationsView,
    },
    {
      id: "admin_matrix",
      title: "Matrix Manager",
      desc: "Beheer technische specificaties, toleranties en mof-maten.",
      icon: <Grid size={24} className="text-purple-600" />,
      color: "bg-purple-50 border-purple-100",
      roles: ["admin", "engineer"],
      component: AdminMatrixManager,
    },
    {
      id: "admin_digital_planning",
      title: "Digital Planning",
      desc: "Infor-LN planning import en lotnummer-registratie.",
      icon: <Factory size={24} className="text-emerald-600" />,
      color: "bg-emerald-50 border-emerald-100",
      roles: ["admin", "engineer"],
      component: DigitalPlanningHub,
    },
    {
      id: "admin_users",
      title: "Gebruikersbeheer",
      desc: "Beheer accounts, rollen en specifieke module-bevoegdheden.",
      icon: <Users size={24} className="text-indigo-600" />,
      color: "bg-indigo-50 border-indigo-100",
      roles: ["admin"],
      component: AdminUsersView,
    },
    {
      id: "admin_messages",
      title: "Berichten",
      desc: "Interne communicatie en systeem-alerts voor validatie.",
      icon: <MessageSquare size={24} className="text-rose-600" />,
      color: "bg-rose-50 border-rose-100",
      roles: ["admin", "engineer", "teamleader"],
      component: AdminMessagesView,
    },
    {
      id: "admin_settings",
      title: "Instellingen",
      desc: "Algemene systeemconfiguratie en applicatie-instellingen.",
      icon: <Settings size={24} className="text-slate-500" />,
      color: "bg-slate-100 border-slate-200",
      roles: ["admin", "engineer"],
      component: AdminSettingsView,
    },
    {
      id: "admin_database",
      title: "Database Beheer",
      desc: "Ruwe datatoegang voor systeembeheerders (Gebruik met zorg).",
      icon: <Database size={24} className="text-red-600" />,
      color: "bg-red-50 border-red-100",
      roles: ["admin"],
      component: AdminDatabaseView,
    },
  ];

  // Filter de menu-items op basis van de rol van de ingelogde gebruiker
  const menuItems = allItems.filter((item) => item.roles.includes(role));

  // --- RENDERING VAN ACTIEVE MODULE ---
  if (activeScreen) {
    const activeItem = allItems.find((i) => i.id === activeScreen);

    // Speciale handling voor Digital Planning Hub (omdat deze zijn eigen routing heeft)
    if (activeItem && activeItem.id === "admin_digital_planning") {
      return (
        <Suspense
          fallback={
            <div className="h-screen flex flex-col items-center justify-center text-slate-400 bg-slate-50">
              <Loader2 className="animate-spin mb-4" size={48} />
              <p className="text-xs font-black uppercase tracking-widest">
                Planning laden...
              </p>
            </div>
          }
        >
          <DigitalPlanningHub onBack={() => setActiveScreen(null)} />
        </Suspense>
      );
    }

    const ActiveComponent = activeItem?.component;

    return (
      <div className="flex flex-col h-[100dvh] bg-slate-50 w-full animate-in fade-in zoom-in-95 duration-300 overflow-hidden text-left">
        <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-20">
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
            <div className="text-left">
              <h2 className="text-lg md:text-xl font-black text-slate-800 uppercase italic tracking-tight flex items-center gap-3">
                {activeItem?.icon} {activeItem?.title}
              </h2>
            </div>
          </div>
          <div className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest hidden sm:flex items-center gap-2">
            <ShieldAlert size={12} className="text-blue-400" /> Admin Mode
          </div>
        </div>

        <div className="flex-1 overflow-auto p-0 md:p-6 w-full h-full relative text-left">
          <Suspense
            fallback={
              <div className="flex h-full flex-col items-center justify-center text-slate-400">
                <Loader2 className="animate-spin mb-4" size={48} />
                <p className="text-xs font-black uppercase tracking-widest">
                  Module laden...
                </p>
              </div>
            }
          >
            {ActiveComponent ? (
              <ActiveComponent />
            ) : (
              <div className="p-8 text-center text-red-500 font-bold">
                Fout: Component niet gevonden of niet geautoriseerd.
              </div>
            )}
          </Suspense>
        </div>
      </div>
    );
  }

  // --- RENDERING VAN HET HOOFDMENU ---
  return (
    <div className="flex flex-col items-center w-full h-[100dvh] py-6 md:py-10 px-4 md:px-6 animate-in fade-in duration-500 overflow-y-auto custom-scrollbar text-left bg-slate-50">
      <div className="w-full max-w-7xl space-y-8 md:space-y-10">
        {/* Header Sectie */}
        <div className="flex flex-col items-center text-center border-b border-slate-200 pb-10 relative">
          {onBack && (
            <button
              onClick={onBack}
              className="absolute left-0 top-1 text-slate-400 hover:text-slate-600 flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors"
            >
              <ArrowLeft size={16} /> Portal
            </button>
          )}
          <div className="flex items-center gap-4 mb-2 md:mb-4 mt-6 md:mt-0">
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight uppercase italic">
              Admin <span className="text-blue-600">Hub</span>
            </h1>
            <div className="bg-slate-900 text-white px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hidden sm:flex border border-white/10">
              <ShieldAlert size={14} className="text-blue-400" />
              Systeemrol: {role}
            </div>
          </div>
          <p className="text-slate-400 font-bold text-sm md:text-lg max-w-2xl uppercase tracking-tighter italic">
            Centrale beheeromgeving voor engineering, productie en
            systeemconfiguratie.
          </p>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pb-32">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`group flex flex-col p-6 md:p-8 rounded-[40px] border-2 text-left transition-all duration-500 transform hover:-translate-y-2 bg-white ${item.color} border-transparent shadow-sm hover:shadow-2xl hover:border-white active:scale-95`}
            >
              <div className="flex items-start justify-between mb-8">
                <div className="p-4 md:p-5 bg-white rounded-3xl shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border border-slate-50">
                  {item.icon}
                </div>
                <div className="p-2 bg-slate-50 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                  <ArrowRight size={20} className="text-blue-600" />
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight italic">
                {item.title}
              </h3>
              <p className="text-xs md:text-sm text-slate-500 font-medium mt-3 leading-relaxed opacity-80">
                {item.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="fixed bottom-6 text-center opacity-20 pointer-events-none">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
          Future Factory MES | Admin Core v2.5
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
