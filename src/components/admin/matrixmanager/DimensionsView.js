import React, { useState, useEffect } from "react";
import {
  Loader2,
  Edit3,
  Trash2,
  Ruler,
  Search,
  Layout,
  Settings,
  ChevronRight,
  ChevronDown,
  Plus,
  Box,
  Target,
  Save,
  RefreshCw,
  Layers,
  Database,
} from "lucide-react";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  db as firebaseDb,
  appId as firebaseAppId,
} from "../../../config/firebase";

// --- CONFIGURATIE ---
const VIEW_MODES = [
  { id: "bell", label: "Bell (Mof)", icon: <Layout size={18} /> },
  { id: "fitting", label: "Fitting", icon: <Ruler size={18} /> },
  { id: "bore", label: "Bore", icon: <Target size={18} /> },
  { id: "tolerance", label: "Toleranties", icon: <Settings size={18} /> },
];

const SUB_TYPES_BELL = [
  { id: "cb", label: "CB", collection: "cb_dimensions" },
  { id: "tb", label: "TB", collection: "fitting_specs" },
];

const DIMENSION_LABELS = {
  B1: "B1 (Mofdiepte)",
  B2: "B2 (Insteekdiepte)",
  BA: "BA (Buitendiameter Mof)",
  A1: "A1 (Wanddikte Mof)",
  TWcb: "TWcb (Wanddikte CB)",
  Twtb: "Twtb (Wanddikte TB)",
  r1: "r1 (Radius)",
  BD: "BD (Buitendiameter Body)",
  W: "W (Wanddikte Body)",
  L: "L (Lengte)",
  Z: "Z (Z-maat)",
  alpha: "α (Hoek)",
  TWtbco: "TWtbco (Wanddikte Coupler TB)",
  BDco: "BDco (Buitendiameter Coupler)",
  Wco: "Wco (Wanddikte TB)",
  TWco: "TWco (Wanddikte Coupler CB)",
};

const FIELD_PRIORITY = {
  bell_tb_algemeen: ["B1", "B2", "BA", "r1", "alpha"],
  fitting_tb_standard: ["Twtb", "BD", "W"],
  fitting_tb_coupler: ["TWtbco", "BDco", "Wco"],
  bell_cb_algemeen: ["B1", "B2", "BA", "A1"],
  fitting_cb_standard: ["TWcb", "BD", "W"],
  fitting_cb_coupler: ["TWco", "BDco", "W"],
};

const DimensionsView = ({
  libraryData,
  blueprints,
  db: propDb,
  appId: propAppId,
  productRange,
}) => {
  const db = propDb || firebaseDb;
  const appId = propAppId || firebaseAppId;

  const [activeMode, setActiveMode] = useState("bell");
  const [bellSubType, setBellSubType] = useState("cb");
  const [dimData, setDimData] = useState([]);
  const [editingDim, setEditingDim] = useState(null);
  const [loading, setLoading] = useState(false);
  const [listSearch, setListSearch] = useState("");

  const [localBore, setLocalBore] = useState({});
  const [localTols, setLocalTols] = useState({});
  const [expandedTols, setExpandedTols] = useState({});
  const [selectedTolPath, setSelectedTolPath] = useState(null);
  const [dimFilters, setDimFilters] = useState({
    pn: "",
    id: "",
    extraCode: "",
    type: "",
  });

  // --- DATA SYNC MET FIX VOOR OVEN SEGMENTEN ---
  useEffect(() => {
    const fetchMaster = async () => {
      if (activeMode === "bore" || activeMode === "tolerance") {
        setLoading(true);
        // FIX: Bore dimensions moet ook onder de 'settings' collectie vallen of een doc-id hebben
        const colPath =
          activeMode === "bore"
            ? "settings/bore_dimensions"
            : "settings/tolerances_master";
        try {
          const snap = await getDoc(
            doc(db, "artifacts", appId, "public", "data", ...colPath.split("/"))
          );
          if (snap.exists()) {
            if (activeMode === "bore") setLocalBore(snap.data());
            else setLocalTols(snap.data());
          }
        } catch (e) {
          console.error("Fout bij ophalen master data:", e);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchMaster();
  }, [activeMode, appId, db]);

  useEffect(() => {
    if (activeMode === "bell" || activeMode === "fitting") {
      const loadList = async () => {
        const colName =
          activeMode === "fitting"
            ? "standard_fitting_specs"
            : bellSubType === "cb"
            ? "cb_dimensions"
            : "fitting_specs";
        setLoading(true);
        try {
          const querySnapshot = await getDocs(
            collection(db, "artifacts", appId, "public", "data", colName)
          );
          const data = querySnapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          let filtered = data;
          if (activeMode === "fitting") {
            const variant = bellSubType.toUpperCase();
            filtered = data.filter((item) => item.id?.includes(`_${variant}_`));
          }
          setDimData(
            filtered.sort((a, b) =>
              a.id.localeCompare(b.id, undefined, { numeric: true })
            )
          );
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      loadList();
    }
  }, [activeMode, bellSubType, appId, db]);

  const getSortedFields = (keys) => {
    let priority = [];
    const isTB = bellSubType === "tb";
    const type = editingDim?.type?.toLowerCase() || "";
    if (activeMode === "bell")
      priority = isTB
        ? FIELD_PRIORITY.bell_tb_algemeen
        : FIELD_PRIORITY.bell_cb_algemeen;
    else {
      if (type.includes("coupler"))
        priority = isTB
          ? FIELD_PRIORITY.fitting_tb_coupler
          : FIELD_PRIORITY.fitting_cb_coupler;
      else
        priority = isTB
          ? FIELD_PRIORITY.fitting_tb_standard
          : FIELD_PRIORITY.fitting_cb_standard;
    }
    return [...keys].sort((a, b) => {
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  };

  const saveItem = async () => {
    if (!editingDim) return;
    setLoading(true);
    const colName =
      activeMode === "fitting"
        ? "standard_fitting_specs"
        : bellSubType === "cb"
        ? "cb_dimensions"
        : "fitting_specs";
    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", colName, editingDim.id),
        editingDim
      );
      alert("✅ Product opgeslagen");
    } catch (e) {
      alert("❌ Fout: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveMasterData = async (type) => {
    setLoading(true);
    try {
      // FIX: Zorg dat het pad naar een document wijst (even aantal segmenten)
      const path =
        type === "bore"
          ? [
              "artifacts",
              appId,
              "public",
              "data",
              "settings",
              "bore_dimensions",
            ]
          : [
              "artifacts",
              appId,
              "public",
              "data",
              "settings",
              "tolerances_master",
            ];
      await setDoc(doc(db, ...path), type === "bore" ? localBore : localTols, {
        merge: true,
      });
      alert("✅ Master data bijgewerkt!");
    } catch (e) {
      alert("❌ Fout: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const createNewItem = () => {
    if (!dimFilters.pn || !dimFilters.id) return alert("Selecteer PN en ID.");
    const variant = bellSubType.toUpperCase();
    const typeLabel = activeMode === "fitting" ? dimFilters.type : "Bell";
    const id =
      activeMode === "fitting"
        ? `${typeLabel.toUpperCase()}_${variant}_PN${dimFilters.pn}_ID${
            dimFilters.id
          }${dimFilters.extraCode ? "_" + dimFilters.extraCode : ""}`
        : `${variant}_PN${dimFilters.pn}_ID${dimFilters.id}${
            dimFilters.extraCode ? "_" + dimFilters.extraCode : ""
          }`;
    const newDoc = {
      id,
      type: typeLabel,
      pressure: Number(dimFilters.pn),
      diameter: Number(dimFilters.id),
    };
    let fields = [];
    const isTB = bellSubType === "tb";
    if (activeMode === "bell")
      fields = isTB
        ? FIELD_PRIORITY.bell_tb_algemeen
        : FIELD_PRIORITY.bell_cb_algemeen;
    else {
      if (typeLabel.toLowerCase() === "coupler")
        fields = isTB
          ? FIELD_PRIORITY.fitting_tb_coupler
          : FIELD_PRIORITY.fitting_cb_coupler;
      else
        fields = isTB
          ? FIELD_PRIORITY.fitting_tb_standard
          : FIELD_PRIORITY.fitting_cb_standard;
    }
    fields.forEach((f) => (newDoc[f] = ""));
    setEditingDim(newDoc);
  };

  const filteredData = (dimData || []).filter((d) =>
    d.id.toLowerCase().includes(listSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      <div className="bg-white p-3 rounded-[28px] shadow-sm border border-slate-200 flex justify-between items-center shrink-0">
        <div className="flex gap-2">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                setActiveMode(mode.id);
                setEditingDim(null);
                setSelectedTolPath(null);
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                activeMode === mode.id
                  ? "bg-slate-900 text-white shadow-lg"
                  : "bg-slate-50 text-slate-400 hover:text-slate-600"
              }`}
            >
              {mode.icon} {mode.label}
            </button>
          ))}
        </div>
        {(activeMode === "bell" || activeMode === "fitting") && (
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {SUB_TYPES_BELL.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setBellSubType(sub.id)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  bellSubType === sub.id
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-400"
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeMode === "tolerance" && (
          <div className="flex gap-6 h-full items-start overflow-hidden">
            <div className="w-1/3 h-full bg-white rounded-[32px] shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-3">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                  Tolerantie Groepen
                </h3>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                    size={14}
                  />
                  <input
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                    placeholder="Zoek..."
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2">
                {Object.entries(localTols)
                  .sort()
                  .map(([type, subtypes]) => (
                    <div key={type} className="space-y-1">
                      <button
                        onClick={() =>
                          setExpandedTols((p) => ({ ...p, [type]: !p[type] }))
                        }
                        className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ${
                          expandedTols[type]
                            ? "bg-slate-900 text-white shadow-md"
                            : "bg-slate-50 text-slate-600"
                        }`}
                      >
                        <span className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                          <Box size={14} /> {type}
                        </span>
                        {expandedTols[type] ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </button>
                      {expandedTols[type] && (
                        <div className="pl-4 py-1 space-y-1 border-l-2 border-slate-100 ml-4">
                          {Object.entries(subtypes).map(([sub, pns]) => (
                            <div key={sub}>
                              <button
                                onClick={() =>
                                  setExpandedTols((p) => ({
                                    ...p,
                                    [type + "_" + sub]: !p[type + "_" + sub],
                                  }))
                                }
                                className="w-full text-left p-2 text-xs font-bold text-slate-500 hover:text-blue-600 flex justify-between"
                              >
                                <span>{sub}</span>
                                {expandedTols[type + "_" + sub] ? (
                                  <ChevronDown size={12} />
                                ) : (
                                  <ChevronRight size={12} />
                                )}
                              </button>
                              {expandedTols[type + "_" + sub] && (
                                <div className="pl-4 space-y-2 pb-2">
                                  {Object.entries(pns).map(([pn, ids]) => (
                                    <div key={pn}>
                                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">
                                        PN {pn}
                                      </p>
                                      <div className="grid grid-cols-2 gap-1">
                                        {Object.keys(ids)
                                          .sort((a, b) => Number(a) - Number(b))
                                          .map((id) => (
                                            <button
                                              key={id}
                                              onClick={() =>
                                                setSelectedTolPath({
                                                  type,
                                                  sub,
                                                  pn,
                                                  id,
                                                })
                                              }
                                              className={`p-1.5 rounded-lg text-[10px] font-bold border ${
                                                selectedTolPath?.id === id &&
                                                selectedTolPath?.pn === pn
                                                  ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                                  : "bg-white text-slate-500 border-slate-100 hover:border-blue-200"
                                              }`}
                                            >
                                              ID {id}
                                            </button>
                                          ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
            <div className="flex-1 h-full overflow-hidden">
              {selectedTolPath ? (
                <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-500">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic">
                        ID {selectedTolPath.id}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {selectedTolPath.type} &gt; {selectedTolPath.sub} &gt;
                        PN{selectedTolPath.pn}
                      </p>
                    </div>
                    <button
                      onClick={() => saveMasterData("tol")}
                      className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-xl flex items-center gap-2"
                    >
                      <Save size={18} /> Opslaan
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-8 max-w-3xl">
                      {getSortedFields(
                        Object.keys(
                          localTols[selectedTolPath.type][selectedTolPath.sub][
                            selectedTolPath.pn
                          ][selectedTolPath.id] || {}
                        )
                      ).map((key) => (
                        <div key={key} className="group">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-blue-500">
                            {DIMENSION_LABELS[key] || key}
                          </label>
                          <div className="relative">
                            <input
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                              value={
                                localTols[selectedTolPath.type][
                                  selectedTolPath.sub
                                ][selectedTolPath.pn][selectedTolPath.id][key]
                              }
                              onChange={(e) => {
                                const updated = { ...localTols };
                                updated[selectedTolPath.type][
                                  selectedTolPath.sub
                                ][selectedTolPath.pn][selectedTolPath.id][key] =
                                  e.target.value;
                                setLocalTols(updated);
                              }}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">
                              mm
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-100 rounded-[50px] bg-white/50">
                  <Layers size={80} className="mb-6 opacity-10" />
                  <p className="font-black text-xl uppercase tracking-widest text-slate-400">
                    Selecteer item
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeMode === "bore" && (
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden animate-in zoom-in-95 duration-300 max-w-4xl mx-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                Bore Dimensions
              </h3>
              <button
                onClick={() => saveMasterData("bore")}
                className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase flex items-center gap-2 hover:bg-emerald-700 shadow-lg"
              >
                <Save size={16} /> Opslaan
              </button>
            </div>
            <div className="overflow-x-auto max-h-[calc(100vh-350px)] custom-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-4">DN</th>
                    <th className="px-8 py-4">Target (mm)</th>
                    <th className="px-8 py-4">Min (mm)</th>
                    <th className="px-8 py-4">Max (mm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {Object.entries(localBore)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([dn, vals]) => (
                      <tr key={dn} className="hover:bg-slate-50/50">
                        <td className="px-8 py-4 font-black text-slate-700">
                          ID {dn}
                        </td>
                        <td className="px-8 py-4">
                          <input
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold w-24 focus:bg-white outline-none"
                            value={vals?.target || 0}
                            onChange={(e) =>
                              setLocalBore({
                                ...localBore,
                                [dn]: {
                                  ...vals,
                                  target: Number(e.target.value),
                                },
                              })
                            }
                          />
                        </td>
                        <td className="px-8 py-4">
                          <input
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold w-24 focus:bg-white outline-none"
                            value={vals?.min || 0}
                            onChange={(e) =>
                              setLocalBore({
                                ...localBore,
                                [dn]: { ...vals, min: Number(e.target.value) },
                              })
                            }
                          />
                        </td>
                        <td className="px-8 py-4">
                          <input
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold w-24 focus:bg-white outline-none"
                            value={vals?.max || 0}
                            onChange={(e) =>
                              setLocalBore({
                                ...localBore,
                                [dn]: { ...vals, max: Number(e.target.value) },
                              })
                            }
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(activeMode === "bell" || activeMode === "fitting") && (
          <div className="flex gap-6 h-full items-start overflow-hidden">
            <div className="w-1/3 h-full flex flex-col gap-4 overflow-hidden">
              <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-200 shrink-0 space-y-4">
                <h4 className="font-black text-slate-800 text-[10px] uppercase tracking-widest italic">
                  Nieuw Item Aanmaken
                </h4>
                <div className="space-y-2">
                  {activeMode === "fitting" && (
                    <select
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs font-bold outline-none"
                      value={dimFilters.type}
                      onChange={(e) =>
                        setDimFilters({ ...dimFilters, type: e.target.value })
                      }
                    >
                      <option value="">- Kies Fitting Type -</option>
                      {libraryData?.product_names
                        ?.filter((t) => t !== "Algemeen")
                        .map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                    </select>
                  )}
                  <div className="flex gap-2">
                    <select
                      className="w-1/3 bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs font-bold"
                      value={dimFilters.pn}
                      onChange={(e) =>
                        setDimFilters({
                          ...dimFilters,
                          pn: e.target.value,
                          id: "",
                        })
                      }
                    >
                      <option value="">PN</option>
                      {libraryData?.pns?.map((pn) => (
                        <option key={pn} value={pn}>
                          PN{pn}
                        </option>
                      ))}
                    </select>
                    <select
                      className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs font-bold"
                      value={dimFilters.id}
                      onChange={(e) =>
                        setDimFilters({ ...dimFilters, id: e.target.value })
                      }
                      disabled={!dimFilters.pn}
                    >
                      <option value="">ID</option>
                      {libraryData?.diameters?.map((id) => (
                        <option key={id} value={id}>
                          ID{id}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={createNewItem}
                  className="w-full bg-slate-900 text-white py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-xl"
                >
                  + Toevoegen
                </button>
              </div>
              <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 flex flex-1 flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="relative">
                    <Search
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                      size={16}
                    />
                    <input
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                      placeholder="Zoek ID..."
                      value={listSearch}
                      onChange={(e) => setListSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {loading ? (
                    <div className="p-8 text-center">
                      <Loader2 className="animate-spin inline text-blue-500" />
                    </div>
                  ) : (
                    (dimData || [])
                      .filter((d) =>
                        d.id.toLowerCase().includes(listSearch.toLowerCase())
                      )
                      .map((d) => (
                        <div
                          key={d.id}
                          onClick={() => setEditingDim(d)}
                          className={`group p-3.5 rounded-2xl cursor-pointer transition-all flex justify-between items-center ${
                            editingDim?.id === d.id
                              ? "bg-slate-900 text-white shadow-xl"
                              : "hover:bg-slate-50 text-slate-600"
                          }`}
                        >
                          <span className="text-[11px] font-bold font-mono tracking-tighter">
                            {d.id}
                          </span>
                          <ChevronRight
                            size={14}
                            className={
                              editingDim?.id === d.id
                                ? "text-blue-400"
                                : "opacity-0 group-hover:opacity-100"
                            }
                          />
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 h-full overflow-y-auto custom-scrollbar pr-2">
              {editingDim ? (
                <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100 relative mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-start mb-10 pb-8 border-b border-slate-100">
                    <div>
                      <span className="px-3 py-1 bg-blue-50 rounded-full text-[9px] font-black text-blue-600 uppercase tracking-widest mb-3 inline-block italic">
                        {bellSubType.toUpperCase()} Spec Editor
                      </span>
                      <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic">
                        {editingDim.id}
                      </h3>
                    </div>
                    <button
                      onClick={saveItem}
                      disabled={loading}
                      className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl transition-all flex items-center gap-2"
                    >
                      {loading ? (
                        <RefreshCw className="animate-spin" size={16} />
                      ) : (
                        <Save size={16} />
                      )}{" "}
                      Opslaan
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    {getSortedFields(
                      Object.keys(editingDim).filter(
                        (k) =>
                          !["id", "type", "pressure", "diameter"].includes(k)
                      )
                    ).map((key) => (
                      <div key={key} className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {DIMENSION_LABELS[key] || key}
                        </label>
                        <div className="relative">
                          <input
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                            value={editingDim[key] || ""}
                            onChange={(e) =>
                              setEditingDim({
                                ...editingDim,
                                [key]: e.target.value,
                              })
                            }
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">
                            mm
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-100 rounded-[50px] bg-white/50">
                  <Box size={80} className="mb-6 opacity-10" />
                  <p className="font-black text-xl uppercase tracking-widest text-slate-400">
                    Selecteer item
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DimensionsView;
