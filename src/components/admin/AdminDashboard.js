import React from "react";
import {
  Package,
  Settings,
  ArrowRight,
  Grid,
  UploadCloud,
  Ruler,
  MapPin,
} from "lucide-react";

/**
 * AdminDashboard.js
 * Het hoofdmenu voor beheerders met tegels naar de sub-pagina's.
 */
const AdminDashboard = ({ navigate }) => {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 animate-in fade-in">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
              Beheerders Dashboard
            </h1>
            <p className="text-slate-500 font-medium mt-2">
              Centrale hub voor applicatiebeheer en configuratie.
            </p>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Product Beheer */}
          <div
            onClick={() => navigate("admin_products")}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Package size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              Product Catalogus
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Beheer producten, specificaties, afbeeldingen en documentatie.
            </p>
            <div className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest">
              Openen <ArrowRight size={12} />
            </div>
          </div>

          {/* 2. Matrix Manager */}
          <div
            onClick={() => navigate("admin_matrix")}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-emerald-200 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Grid size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              Matrix Beheer
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Configureer de product range, drukken en beschikbare afmetingen.
            </p>
            <div className="flex items-center gap-2 text-xs font-black text-emerald-600 uppercase tracking-widest">
              Openen <ArrowRight size={12} />
            </div>
          </div>

          {/* 3. Upload Center */}
          <div
            onClick={() => navigate("admin_upload")}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-cyan-200 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              Data Upload
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Bulk import van Excel/CSV data en batch updates.
            </p>
            <div className="flex items-center gap-2 text-xs font-black text-cyan-600 uppercase tracking-widest">
              Openen <ArrowRight size={12} />
            </div>
          </div>

          {/* 4. Toleranties */}
          <div
            onClick={() => navigate("admin_tolerances")}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-orange-200 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Ruler size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              Toleranties
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Beheer maattoleranties en technische standaarden.
            </p>
            <div className="flex items-center gap-2 text-xs font-black text-orange-600 uppercase tracking-widest">
              Openen <ArrowRight size={12} />
            </div>
          </div>

          {/* 5. Locaties */}
          <div
            onClick={() => navigate("admin_locations")}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MapPin size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Locaties</h3>
            <p className="text-sm text-slate-400 mb-4">
              Beheer opslaglocaties en gereedschapsinventaris.
            </p>
            <div className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest">
              Openen <ArrowRight size={12} />
            </div>
          </div>

          {/* 6. Instellingen */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-purple-200 transition-all cursor-pointer group opacity-60 grayscale hover:grayscale-0 hover:opacity-100">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Settings size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              Instellingen
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Gebruikersbeheer en systeemconfiguratie.
            </p>
            <div className="flex items-center gap-2 text-xs font-black text-purple-600 uppercase tracking-widest">
              Binnenkort <ArrowRight size={12} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
