import React, { useState, useMemo } from "react";
import {
  X,
  Box,
  ClipboardList,
  ChevronRight,
  ChevronDown,
  MapPin,
  Activity,
  ShieldCheck,
  Calendar,
  Factory,
  Ruler,
  Info,
  Search,
  FileText,
  Clock,
  Save,
  Loader2,
  AlertCircle,
  Settings as SettingsIcon,
  Fingerprint,
} from "lucide-react";
import StatusBadge from "../common/StatusBadge";

const DrillDownModal = ({
  isOpen,
  onClose,
  title,
  items = [],
  type = "product",
  onUpdate,
}) => {
  // HOOKS BOVENAAN
  const [expandedId, setExpandedId] = useState(null);
  const [internalSearch, setInternalSearch] = useState("");
  const [isSaving, setIsSaving] = useState(null);
  const [editFields, setEditFields] = useState({});

  const filteredItems = useMemo(() => {
    const q = internalSearch.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (item) =>
        (item.orderId || "").toLowerCase().includes(q) ||
        (item.lotNumber || "").toLowerCase().includes(q) ||
        (item.item || "").toLowerCase().includes(q) ||
        (item.evtCode || "").toLowerCase().includes(q) ||
        (item.project || "").toLowerCase().includes(q)
    );
  }, [items, internalSearch]);

  if (!isOpen) return null;

  const formatExcelDate = (val) => {
    if (!val) return "-";
    if (!isNaN(val) && parseFloat(val) > 30000) {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toLocaleDateString("nl-NL");
    }
    return String(val);
  };

  const handleLocalUpdate = (id, field, value) => {
    setEditFields((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const saveChanges = async (item) => {
    const id = item.id || item.lotNumber;
    setIsSaving(id);
    const updates = editFields[id] || {};
    try {
      if (onUpdate) await onUpdate(item, updates, type);
      setEditFields((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[250] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300 text-left">
      <div className="bg-white w-full max-w-5xl rounded-[45px] shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95">
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4 text-left">
            <div className="p-3 bg-blue-500 rounded-2xl shadow-lg">
              {type === "order" ? (
                <ClipboardList size={24} />
              ) : (
                <Box size={24} />
              )}
            </div>
            <div>
              <h3 className="text-xl font-black italic uppercase leading-none">
                {title}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">
                {filteredItems.length} items
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
              size={18}
            />
            <input
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-500"
              placeholder="Zoek op Lot, Order of EVT-code..."
              value={internalSearch}
              onChange={(e) => setInternalSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30 text-left">
          {filteredItems.map((item) => {
            const itemId = item.id || item.lotNumber;
            const isExpanded = expandedId === itemId;
            const currentEdit = editFields[itemId] || {};
            const isSpoed =
              currentEdit.label === "SPOED" || item.label === "SPOED";
            const isOnHold =
              currentEdit.label === "HOLD" || item.label === "HOLD";

            return (
              <div
                key={itemId}
                className={`bg-white rounded-3xl border-2 transition-all duration-300 overflow-hidden ${
                  isExpanded
                    ? "border-blue-500 shadow-xl ring-4 ring-blue-50/50"
                    : isSpoed
                    ? "border-red-500/50 shadow-md animate-pulse"
                    : "border-slate-100 shadow-sm"
                }`}
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : itemId)}
                  className="p-5 flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                        isSpoed
                          ? "bg-red-500 text-white"
                          : isOnHold
                          ? "bg-amber-500 text-white"
                          : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500"
                      }`}
                    >
                      {isSpoed ? (
                        <AlertCircle size={24} />
                      ) : isOnHold ? (
                        <Clock size={24} />
                      ) : type === "order" ? (
                        <ClipboardList size={24} />
                      ) : (
                        <Box size={24} />
                      )}
                    </div>
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-blue-600 font-black uppercase tracking-tight">
                          {item.orderId || item.lotNumber}
                        </span>
                        {(currentEdit.evtCode || item.evtCode) && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded-lg border border-blue-100">
                            {currentEdit.evtCode || item.evtCode}
                          </span>
                        )}
                        {isSpoed && (
                          <span className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-black rounded uppercase">
                            SPOED
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-black text-slate-900 italic line-clamp-1">
                        {item.item}
                      </h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge statusLabel={item.inspection?.status} />
                    {isExpanded ? (
                      <ChevronDown size={24} className="text-blue-500" />
                    ) : (
                      <ChevronRight size={24} className="text-slate-300" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-8 pt-4 border-t border-slate-50 bg-slate-50/50 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-left">
                      <div className="md:col-span-7 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-left">
                          <div className="bg-white p-5 rounded-3xl border-2 border-blue-50 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                              <Fingerprint size={32} />
                            </div>
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-1">
                              EVT Identificatie
                            </span>
                            <p className="text-lg font-black text-slate-800 tracking-tighter">
                              {currentEdit.evtCode || item.evtCode || ""}
                            </p>
                          </div>
                          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-left">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                              Starttijd
                            </span>
                            <div className="flex items-center gap-2 text-blue-600">
                              <Clock size={14} />
                              <p className="text-sm font-bold text-left">
                                {item.startTime
                                  ? new Date(item.startTime).toLocaleString(
                                      "nl-NL"
                                    )
                                  : "In afwachting"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-6 rounded-[32px] border-2 border-blue-100 shadow-xl text-left">
                          <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 mb-5 italic text-left">
                            <SettingsIcon size={16} /> Beheer & Instructies
                          </h5>
                          <div className="space-y-5 text-left">
                            <div className="space-y-2 text-left">
                              <label className="block text-[9px] font-black text-slate-400 uppercase ml-1">
                                EVT Identificatie
                              </label>
                              <input
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-blue-500 uppercase"
                                placeholder="Voer code in..."
                                value={
                                  currentEdit.evtCode !== undefined
                                    ? currentEdit.evtCode
                                    : item.evtCode || ""
                                }
                                onChange={(e) =>
                                  handleLocalUpdate(
                                    itemId,
                                    "evtCode",
                                    e.target.value.toUpperCase()
                                  )
                                }
                              />
                            </div>
                            <div className="flex gap-2">
                              {["SPOED", "HOLD", "NORMAAL"].map((l) => (
                                <button
                                  key={l}
                                  onClick={() =>
                                    handleLocalUpdate(itemId, "label", l)
                                  }
                                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${
                                    (currentEdit.label ||
                                      item.label ||
                                      "NORMAAL") === l
                                      ? "bg-slate-900 text-white border-slate-900 shadow-md"
                                      : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                                  }`}
                                >
                                  {l}
                                </button>
                              ))}
                            </div>
                            <textarea
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-medium outline-none min-h-[120px]"
                              placeholder="Extra informatie voor operator..."
                              value={
                                currentEdit.notes !== undefined
                                  ? currentEdit.notes
                                  : item.notes || ""
                              }
                              onChange={(e) =>
                                handleLocalUpdate(
                                  itemId,
                                  "notes",
                                  e.target.value
                                )
                              }
                            />
                            <button
                              onClick={() => saveChanges(item)}
                              disabled={
                                isSaving === itemId || !editFields[itemId]
                              }
                              className="w-full py-5 bg-blue-600 text-white rounded-[22px] font-black uppercase text-xs flex items-center justify-center gap-3 hover:bg-blue-700 shadow-2xl transition-all disabled:opacity-50"
                            >
                              {isSaving === itemId ? (
                                <Loader2 className="animate-spin" size={18} />
                              ) : (
                                <Save size={18} />
                              )}{" "}
                              Opslaan & Synchroniseren
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-5 space-y-4 text-left">
                        <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden">
                          <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12">
                            <Ruler size={120} />
                          </div>
                          <span className="text-[10px] font-black text-emerald-400 uppercase block mb-5 italic tracking-widest border-b border-emerald-400/20 pb-2">
                            Technische Specificaties
                          </span>
                          <div className="space-y-4">
                            <div className="flex justify-between border-b border-white/10 pb-2">
                              <span className="text-[10px] text-slate-400 uppercase font-bold text-left text-left">
                                Leverdatum
                              </span>
                              <span className="text-base font-black">
                                {formatExcelDate(item.date)}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-white/10 pb-2">
                              <span className="text-[10px] text-slate-400 uppercase font-bold text-left">
                                Artikelcode
                              </span>
                              <span className="text-base font-black text-blue-300 break-all text-right ml-4">
                                {item.articleCode || "-"}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-white/10 pb-2 text-left">
                              <span className="text-[10px] text-slate-400 uppercase font-bold text-left">
                                Tekening
                              </span>
                              <span className="text-base font-black italic">
                                {item.drawing || "-"}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-white/10 pb-2">
                              <span className="text-[10px] text-slate-400 uppercase font-bold">
                                Project
                              </span>
                              <span className="text-base font-black truncate max-w-[200px]">
                                {item.project || "-"}
                              </span>
                            </div>
                            <div className="flex justify-between pt-1">
                              <span className="text-[10px] text-slate-400 uppercase font-bold">
                                Machine
                              </span>
                              <span className="text-base font-black text-emerald-400 uppercase">
                                {item.machine || item.originMachine}
                              </span>
                            </div>
                          </div>
                        </div>
                        {item.poText && (
                          <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100">
                            <span className="text-[9px] font-black text-blue-400 uppercase block mb-3 tracking-widest">
                              Inkoop Order Memo
                            </span>
                            <p className="text-[11px] font-medium text-blue-900 italic leading-relaxed line-clamp-6 overflow-y-auto max-h-48 custom-scrollbar pr-2 text-left">
                              "{item.poText}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-5 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
          <button
            onClick={onClose}
            className="px-10 py-4 bg-slate-900 text-white rounded-[20px] text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 shadow-xl ml-auto"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrillDownModal;
