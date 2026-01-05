import React from "react";
import {
  Package,
  Grid,
  MapPin,
  UploadCloud,
  Activity,
  Settings,
  Users,
  MessageSquare,
} from "lucide-react";

const AdminDashboard = ({ navigate }) => {
  const dashboardItems = [
    {
      id: "admin_products",
      title: "Product Beheer",
      desc: "Beheer de catalogus en producten.",
      icon: <Package size={24} className="text-blue-600" />,
      color: "bg-blue-50 border-blue-100 hover:border-blue-300",
    },
    {
      id: "admin_matrix",
      title: "Matrix Manager",
      desc: "Centraal beheer voor Matrix, Maatvoering, Boringen en Templates.",
      icon: <Grid size={24} className="text-emerald-600" />,
      color: "bg-emerald-50 border-emerald-100 hover:border-emerald-300",
    },
    {
      id: "admin_locations",
      title: "Gereedschap & Locaties",
      desc: "Beheer containers en materiaal.",
      icon: <MapPin size={24} className="text-orange-600" />,
      color: "bg-orange-50 border-orange-100 hover:border-orange-300",
    },
    // Tegel Toleranties is verwijderd omdat deze nu onder Matrix Manager valt
    {
      id: "admin_users",
      title: "Gebruikersbeheer",
      desc: "Beheer toegang, rollen en verificaties.",
      icon: <Users size={24} className="text-purple-600" />,
      color: "bg-purple-50 border-purple-100 hover:border-purple-300",
    },
    {
      id: "admin_messages",
      title: "Berichtencentrum",
      desc: "Interne communicatie en meldingen.",
      icon: <MessageSquare size={24} className="text-pink-600" />,
      color: "bg-pink-50 border-pink-100 hover:border-pink-300",
    },
    {
      id: "admin_upload",
      title: "Data Upload",
      desc: "Importeer bulk data (CSV/JSON).",
      icon: <UploadCloud size={24} className="text-cyan-600" />,
      color: "bg-cyan-50 border-cyan-100 hover:border-cyan-300",
    },
    {
      id: "admin_logs",
      title: "Systeem Logs",
      desc: "Bekijk activiteit en foutmeldingen.",
      icon: <Activity size={24} className="text-slate-600" />,
      color: "bg-slate-50 border-slate-200 hover:border-slate-400",
    },
    {
      id: "admin_settings",
      title: "Instellingen",
      desc: "Applicatie naam, logo en thema.",
      icon: <Settings size={24} className="text-gray-700" />,
      color: "bg-gray-100 border-gray-200 hover:border-gray-400",
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800">Admin Dashboard</h2>
        <p className="text-slate-500 font-medium">
          Selecteer een module om te beheren.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={`p-6 rounded-2xl border-2 text-left transition-all transform hover:-translate-y-1 shadow-sm hover:shadow-md ${item.color} group`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-black">
              {item.title}
            </h3>
            <p className="text-sm text-slate-500 font-medium group-hover:text-slate-600">
              {item.desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
