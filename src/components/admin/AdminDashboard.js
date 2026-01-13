import React from "react";
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
} from "lucide-react";
import { useAdminAuth } from "../../hooks/useAdminAuth";

/**
 * AdminDashboard: Filtert menu-items op basis van gebruikersrol.
 * UPDATE: Bulk Upload knop verwijderd uit het hoofddashboard.
 */
const AdminDashboard = ({ navigate, stats = {} }) => {
  const { role } = useAdminAuth();

  // De lijst met beheer-opties zonder de Bulk Upload tegel
  const allItems = [
    {
      id: "admin_products",
      title: "Product Manager",
      desc: "Beheer de catalogus en basisinformatie.",
      icon: <Package size={24} className="text-blue-600" />,
      color: "bg-blue-50 border-blue-100",
      roles: ["admin", "engineer", "teamleader"],
    },
    {
      id: "admin_locations",
      title: "Voorraad & Locaties",
      desc: "Real-time inzicht in mof-voorraad.",
      icon: <Database size={24} className="text-amber-600" />,
      color: "bg-amber-50 border-amber-100",
      roles: ["admin", "engineer", "teamleader"],
    },
    {
      id: "admin_matrix",
      title: "Matrix Manager",
      desc: "Technische specs en mof-maten.",
      icon: <Grid size={24} className="text-purple-600" />,
      color: "bg-purple-50 border-purple-100",
      roles: ["admin", "engineer"],
    },
    {
      id: "admin_digital_planning",
      title: "Digital Planning",
      desc: "Infor-LN planning en lotnummers.",
      icon: <Factory size={24} className="text-emerald-600" />,
      color: "bg-emerald-50 border-emerald-100",
      roles: ["admin", "engineer"],
    },
    {
      id: "admin_users",
      title: "Gebruikersbeheer",
      desc: "Beheer accounts en rollen.",
      icon: <Users size={24} className="text-indigo-600" />,
      color: "bg-indigo-50 border-indigo-100",
      roles: ["admin"],
    },
    {
      id: "admin_messages",
      title: "Berichten",
      desc: "Interne communicatie.",
      icon: <MessageSquare size={24} className="text-rose-600" />,
      color: "bg-rose-50 border-rose-100",
      roles: ["admin", "engineer", "teamleader"],
    },
    {
      id: "admin_settings",
      title: "Instellingen",
      desc: "Systeem-brede configuratie.",
      icon: <Settings size={24} className="text-slate-500" />,
      color: "bg-slate-100 border-slate-200",
      roles: ["admin", "engineer"],
    },
  ];

  // Filter items op basis van de huidige rol van de gebruiker
  const menuItems = allItems.filter((item) => item.roles.includes(role));

  return (
    <div className="flex flex-col items-center w-full py-10 px-6 animate-in fade-in duration-500 overflow-y-auto custom-scrollbar text-left">
      <div className="w-full max-w-7xl space-y-10">
        {/* Header - Gecentreerd */}
        <div className="flex flex-col items-center text-center border-b border-slate-200 pb-10">
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

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
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
