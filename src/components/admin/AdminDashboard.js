import React from "react";
import {
  Package,
  Database,
  Users,
  Settings,
  FileText,
  MessageSquare,
  Grid,
  Factory,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { useAdminAuth } from "../../hooks/useAdminAuth";

/**
 * AdminDashboard: Filtert menu-items op basis van gebruikersrol.
 */
const AdminDashboard = ({ navigate, stats = {} }) => {
  const { role } = useAdminAuth();

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
      id: "admin_upload",
      title: "Bulk Upload",
      desc: "Importeer productdata via CSV.",
      icon: <FileText size={24} className="text-slate-600" />,
      color: "bg-slate-50 border-slate-100",
      roles: ["admin", "engineer"],
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

  // Filter items op basis van de huidige rol
  const menuItems = allItems.filter((item) => item.roles.includes(role));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 w-full">
      <div className="flex flex-col md:items-start border-b border-slate-200 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none uppercase italic">
            Admin <span className="text-blue-600">Hub</span>
          </h1>
          <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert size={12} className="text-emerald-400" />
            Sessie: {role}
          </span>
        </div>
        <p className="text-slate-500 font-medium">
          Toegang verleend op basis van uw functieprofiel.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={`group flex flex-col p-6 rounded-[32px] border-2 text-left transition-all duration-300 transform hover:-translate-y-2 bg-white ${item.color} border-transparent shadow-sm hover:shadow-xl`}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
            </div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              {item.title}
              <ArrowRight
                size={16}
                className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
              />
            </h3>
            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">
              {item.desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
