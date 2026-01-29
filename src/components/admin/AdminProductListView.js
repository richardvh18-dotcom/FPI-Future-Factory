import React, { useState, useMemo } from "react";
import {
  Edit2,
  Trash2,
  CheckCircle,
  Search,
  ChevronDown,
  ChevronRight,
  AlertOctagon,
} from "lucide-react";
import { verifyProduct } from "../../utils/productHelpers";
import VerificationBadge from "./VerificationBadge";
import { VERIFICATION_STATUS } from "../../data/constants";

const AdminProductListView = ({ products, onDelete, onEdit, user }) => {
  const [processingId, setProcessingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");

  // State voor open/dichtgeklapte groepen (Standaard leeg = alles dicht)
  const [expandedGroups, setExpandedGroups] = useState({});

  // 1. Eerst filteren we de platte lijst op zoektermen
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    const term = searchTerm.toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        (product.name && product.name.toLowerCase().includes(term)) ||
        (product.displayId && product.displayId.toLowerCase().includes(term)) ||
        (product.type && product.type.toLowerCase().includes(term)) ||
        (product.articleCode &&
          product.articleCode.toLowerCase().includes(term)) ||
        (product.extraCode && product.extraCode.toLowerCase().includes(term));

      const matchesType = filterType === "All" || product.type === filterType;

      return matchesSearch && matchesType;
    });
  }, [products, searchTerm, filterType]);

  // 2. Daarna groeperen we de gefilterde lijst
  const groupedData = useMemo(() => {
    const groups = {};
    const PENDING_KEY = "⚠️ Te Verifiëren";

    filteredProducts.forEach((product) => {
      let groupKey = product.type || "Overige";

      // Als status PENDING is, dwingen we hem in de speciale groep
      // Tenzij we specifiek op een type filteren, dan willen we misschien context behouden?
      // Nee, de gebruiker vroeg expliciet om een categorie "in afwachting".
      if (product.verificationStatus === VERIFICATION_STATUS.PENDING) {
        groupKey = PENDING_KEY;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(product);
    });

    // Sorteren: PENDING_KEY altijd bovenaan, daarna alfabetisch
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === PENDING_KEY) return -1;
      if (b === PENDING_KEY) return 1;
      return a.localeCompare(b);
    });

    return { groups, sortedKeys, PENDING_KEY };
  }, [filteredProducts]);

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const handleVerify = async (product) => {
    if (!user) return alert("Log in.");
    setProcessingId(product.id);
    try {
      const result = await verifyProduct(product.id, user, product);
      if (!result.success) alert(result.message);
    } catch (error) {
      alert("Error.");
    } finally {
      setProcessingId(null);
    }
  };

  const canVerify = (product) => {
    if (product.verificationStatus !== VERIFICATION_STATUS.PENDING)
      return false;
    if (product.lastModifiedBy === user?.uid) return false;
    return true;
  };

  const uniqueTypes = products
    ? ["All", ...new Set(products.map((p) => p.type))].sort()
    : ["All"];

  if (!products) return null;

  return (
    <div className="p-6 animate-in fade-in duration-500 h-full flex flex-col">
      {/* TOOLBAR */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Zoek op ID, Type, of Oude Code..."
            className="pl-10 pr-4 py-2 w-full border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="px-4 py-2 border border-slate-300 rounded-xl text-sm bg-white shadow-sm focus:border-blue-500 outline-none"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* GROEPEN LIJST */}
      <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pb-10">
        {groupedData.sortedKeys.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic font-medium bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            Geen producten gevonden.
          </div>
        ) : (
          groupedData.sortedKeys.map((groupKey) => {
            const isPendingGroup = groupKey === groupedData.PENDING_KEY;
            const items = groupedData.groups[groupKey];
            const isOpen = expandedGroups[groupKey];

            return (
              <div
                key={groupKey}
                className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 ${
                  isPendingGroup
                    ? "border-orange-200 shadow-orange-100"
                    : "border-slate-200"
                }`}
              >
                {/* HEADER (Clickable) */}
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
                    isOpen
                      ? "bg-slate-50/80 border-b border-slate-100"
                      : "hover:bg-slate-50"
                  } ${
                    isPendingGroup ? "bg-orange-50/50 hover:bg-orange-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown size={20} className="text-slate-400" />
                    ) : (
                      <ChevronRight size={20} className="text-slate-400" />
                    )}
                    <span
                      className={`font-black uppercase tracking-wide text-sm ${
                        isPendingGroup ? "text-orange-700" : "text-slate-700"
                      }`}
                    >
                      {groupKey}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        isPendingGroup
                          ? "bg-orange-200 text-orange-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {items.length}
                    </span>
                  </div>
                  {isPendingGroup && (
                    <div className="flex items-center gap-2 text-orange-600 text-xs font-bold uppercase animate-pulse">
                      <AlertOctagon size={16} />
                      Actie Vereist
                    </div>
                  )}
                </button>

                {/* CONTENT (Alleen tonen als isOpen === true) */}
                {isOpen && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b font-black text-slate-500 uppercase tracking-widest">
                        <tr>
                          <th className="px-6 py-3 w-1/4">Naam / ID</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3">Specs</th>
                          <th className="px-6 py-3">Verbinding</th>
                          <th className="px-6 py-3 text-right">Acties</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((p) => (
                          <tr
                            key={p.id}
                            className="hover:bg-blue-50/50 transition-colors group"
                          >
                            <td className="px-6 py-3">
                              <div className="font-bold text-slate-700 text-sm">
                                {p.displayId || p.name || p.id}
                              </div>
                              {p.articleCode && (
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {p.articleCode}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-3">
                              <VerificationBadge
                                status={p.verificationStatus}
                                verifiedBy={p.verifiedBy}
                              />
                            </td>
                            <td className="px-6 py-3 font-mono text-slate-600">
                              {p.dn ? `DN ${p.dn}` : p.diameter}{" "}
                              <span className="text-slate-300 mx-1">|</span>{" "}
                              {p.pn
                                ? `PN ${p.pn}`
                                : p.pressure
                                ? `PN ${p.pressure}`
                                : "-"}
                            </td>
                            <td className="px-6 py-3 text-slate-500">
                              {p.couplingType || p.connection || "-"}
                            </td>

                            <td className="px-6 py-3 text-right">
                              <div className="flex justify-end items-center gap-2">
                                {canVerify(p) && (
                                  <button
                                    onClick={() => handleVerify(p)}
                                    disabled={processingId === p.id}
                                    className="text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 flex items-center hover:bg-green-100 hover:shadow-sm transition-all"
                                  >
                                    {processingId === p.id ? (
                                      <span className="animate-spin h-3 w-3 border-2 border-green-600 rounded-full mr-1"></span>
                                    ) : (
                                      <CheckCircle size={14} className="mr-1" />
                                    )}
                                    <span className="text-[10px] font-bold uppercase">
                                      Verifieer
                                    </span>
                                  </button>
                                )}
                                <button
                                  onClick={() => onEdit && onEdit(p)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => onDelete(p.id)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminProductListView;
