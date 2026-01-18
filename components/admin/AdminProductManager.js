import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Package,
  Loader2,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { useProductsData } from "../../hooks/useProductsData";
import { useAdminAuth } from "../../hooks/useAdminAuth";
import { db, appId } from "../../config/firebase";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";

/**
 * AdminProductManager: Beheert de productlijst en validaties.
 * Laatste update: Verhoogde stabiliteit en lege-staat afhandeling.
 */
const AdminProductManager = ({ onBack, onAddNew, onEdit }) => {
  const { products, loading } = useProductsData();
  const { user, role } = useAdminAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState({});

  const canApprove = ["admin", "engineer"].includes(role);

  const filteredData = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchesSearch =
        (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.articleCode || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (p.id || "").toLowerCase().includes(searchTerm.toLowerCase());
      if (activeView === "pending")
        return matchesSearch && p.status !== "approved";
      return matchesSearch;
    });
  }, [products, searchTerm, activeView]);

  const groupedProducts = useMemo(() => {
    const groups = filteredData.reduce((acc, product) => {
      const type = product.type || "Overig";
      if (!acc[type]) acc[type] = [];
      acc[type].push(product);
      return acc;
    }, {});
    return Object.keys(groups)
      .sort()
      .reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
      }, {});
  }, [filteredData]);

  const handleApprove = async (product) => {
    if (!product?.id || !appId || !user?.uid) return;
    const currentApprovals = Array.isArray(product.approvals)
      ? product.approvals
      : [];
    if (currentApprovals.includes(user.uid)) return;

    const newApprovals = [...currentApprovals, user.uid];
    const userName =
      user.displayName || user.email?.split("@")[0] || "Beheerder";
    const newApproverNames = [...(product.approverNames || []), userName];
    const isFullyApproved = newApprovals.length >= 2;

    try {
      const productRef = doc(
        db,
        "artifacts",
        String(appId),
        "public",
        "data",
        "products",
        String(product.id)
      );
      await updateDoc(productRef, {
        approvals: newApprovals,
        approverNames: newApproverNames,
        status: isFullyApproved ? "approved" : "pending_approval",
        approvedAt: isFullyApproved ? new Date().toISOString() : null,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    if (!id || !window.confirm("Product definitief verwijderen uit database?"))
      return;
    try {
      await deleteDoc(
        doc(
          db,
          "artifacts",
          String(appId),
          "public",
          "data",
          "products",
          String(id)
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col items-center w-full h-full bg-slate-50 overflow-y-auto custom-scrollbar animate-in fade-in duration-500 text-left">
      <div className="w-full max-w-6xl p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 gap-4">
          <div className="flex items-center gap-4 text-left">
            <button
              onClick={onBack}
              className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-400 transition-all border-none"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="text-left">
              <h2 className="text-3xl font-black text-slate-800 tracking-tighter italic uppercase">
                Product <span className="text-blue-600">Manager</span>
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Database Beheer & Validatie
              </p>
            </div>
          </div>
          <button
            onClick={onAddNew}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 shadow-xl transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Nieuw Product
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm shrink-0">
            <button
              onClick={() => setActiveView("all")}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeView === "all"
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Volledige Lijst
            </button>
            <button
              onClick={() => setActiveView("pending")}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${
                activeView === "pending"
                  ? "bg-orange-500 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Ter Validatie
            </button>
          </div>
          <div className="relative flex-1 w-full text-left">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"
              size={20}
            />
            <input
              className="w-full bg-white border-2 border-slate-100 rounded-[24px] pl-14 pr-6 py-4 text-sm font-bold outline-none focus:border-blue-500 shadow-inner"
              placeholder="Zoek op naam, artikel of ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Product Lijst */}
        <div className="space-y-4 pb-20">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2
                className="animate-spin inline text-blue-500"
                size={40}
              />
            </div>
          ) : Object.keys(groupedProducts).length === 0 ? (
            <div className="bg-white p-20 rounded-[40px] border-2 border-dashed border-slate-100 text-center text-slate-300">
              <AlertCircle size={64} className="mx-auto mb-4 opacity-10" />
              <p className="font-black uppercase tracking-widest text-sm">
                Geen producten gevonden die voldoen aan de filters
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setActiveView("all");
                }}
                className="mt-4 text-blue-600 text-[10px] font-black uppercase underline"
              >
                Herstel filters
              </button>
            </div>
          ) : (
            Object.entries(groupedProducts).map(([type, items]) => (
              <div
                key={type}
                className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedGroups((p) => ({ ...p, [type]: !p[type] }))
                  }
                  className="w-full flex items-center justify-between p-6 bg-slate-50/50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="p-1 bg-white rounded-lg border border-slate-200">
                      {expandedGroups[type] ? (
                        <ChevronDown size={18} className="text-slate-400" />
                      ) : (
                        <ChevronRight size={18} className="text-slate-400" />
                      )}
                    </div>
                    <span className="font-black text-sm uppercase tracking-widest text-slate-700">
                      {type}{" "}
                      <span className="ml-2 text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">
                        {items.length}
                      </span>
                    </span>
                  </div>
                </button>

                {expandedGroups[type] && (
                  <div className="overflow-x-auto border-t border-slate-100">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/30 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                          <th className="px-8 py-4">Product Info</th>
                          <th className="px-8 py-4 text-left">
                            Status / Validatie
                          </th>
                          <th className="px-8 py-4 text-right">Beheer</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {items.map((product) => (
                          <tr
                            key={product.id}
                            className="hover:bg-slate-50/50 group transition-colors"
                          >
                            <td className="px-8 py-6">
                              <p className="text-sm font-black text-slate-800">
                                {product.name}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 font-mono italic">
                                {product.articleCode || product.id}
                              </p>
                            </td>
                            <td className="px-8 py-6 text-left">
                              {product.status === "approved" ? (
                                <div className="text-emerald-500 text-[10px] font-black uppercase italic flex items-center gap-1.5">
                                  <CheckCircle2 size={14} /> Gepubliceerd
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <span className="text-orange-500 text-[10px] font-black uppercase italic flex items-center gap-1.5">
                                    <Clock size={14} />{" "}
                                    {product.approvals?.length || 0}/2
                                  </span>
                                  {canApprove &&
                                    !product.approvals?.includes(user?.uid) && (
                                      <button
                                        onClick={() => handleApprove(product)}
                                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-600 transition-all flex items-center gap-1 shadow-md"
                                      >
                                        Valideren
                                      </button>
                                    )}
                                </div>
                              )}
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => onEdit?.(product)}
                                  className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                  title="Bewerken"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(product.id)}
                                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                  title="Verwijderen"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProductManager;
