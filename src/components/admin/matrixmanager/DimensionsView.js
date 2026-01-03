import React, { useState, useEffect, Suspense, lazy } from "react";
import {
  Loader2,
  Edit3,
  Trash2,
  FileText,
  Copy,
  Ruler,
  Search,
  Info,
  Filter,
  Layout,
  Settings,
  ChevronRight,
  Plus,
} from "lucide-react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, appId } from "../../../config/firebase";

// Lazy imports voor de sub-modules
const AdminToleranceView = lazy(() => import("../AdminToleranceView"));
const BoreDimensionsManager = lazy(() => import("../BoreDimensionsManager"));

// --- CONFIGURATIE ---
const VIEW_MODES = [
  { id: "bell", label: "Bell (Mof)", icon: <Layout size={18} /> },
  { id: "fitting", label: "Fitting", icon: <Ruler size={18} /> },
  { id: "bore", label: "Bore", icon: <Settings size={18} /> },
  { id: "tolerance", label: "Toleranties", icon: <Info size={18} /> },
];

const SUB_TYPES_BELL = [
  { id: "cb", label: "CB", collection: "cb_dimensions" },
  { id: "tb", label: "TB", collection: "tb_dimensions" },
];

// --- NIEUW: GROUP_CONFIG (Was ontbrekend) ---
// Dit bepaalt de volgorde en styling van de groepen
const GROUP_CONFIG = {
  socket: {
    title: "Mof",
    color: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  dimensions: {
    title: "Afmetingen",
    color: "bg-blue-50 text-blue-700 border-blue-100",
  },
  mounting: {
    title: "Montage",
    color: "bg-amber-50 text-amber-700 border-amber-100",
  },
  other: {
    title: "Overige",
    color: "bg-slate-50 text-slate-700 border-slate-100",
  },
};

// --- NIEUW: MAPPING (Was ontbrekend) ---
// Koppelt veldnamen aan groepen
const FIELD_TO_GROUP_MAP = {
  // Socket
  B1: "socket",
  B2: "socket",
  BA: "socket",
  A1: "socket",
  TWcb: "socket",
  r1: "socket",
  // Dimensions
  BD: "dimensions",
  d: "dimensions",
  W: "dimensions",
  L: "dimensions",
  Z: "dimensions",
  // Mounting
  L1: "mounting",
  L2: "mounting",
  // Other
  alpha: "other",
  k: "other",
  b: "other",
};

const DimensionsView = ({
  libraryData,
  blueprints,
  db,
  appId,
  bellDimensions,
  productRange,
}) => {
  // State
  const [activeMode, setActiveMode] = useState("bell");
  const [bellSubType, setBellSubType] = useState("cb");

  const [dimData, setDimData] = useState([]);
  const [editingDim, setEditingDim] = useState(null);
  const [dimFilters, setDimFilters] = useState({ pn: "", id: "" });

  const [loading, setLoading] = useState(false);
  const [listSearch, setListSearch] = useState("");

  // Bepaal de actieve collectie naam
  const getCollectionName = () => {
    if (activeMode === "fitting") return "fitting_dimensions";
    if (activeMode === "bell")
      return bellSubType === "cb" ? "cb_dimensions" : "tb_dimensions";
    return null;
  };

  // Laad data wanneer mode of subtype verandert
  useEffect(() => {
    if (activeMode === "bell" || activeMode === "fitting") {
      loadData();
    }
  }, [activeMode, bellSubType]);

  const loadData = async () => {
    const colName = getCollectionName();
    if (!colName) return;

    setLoading(true);
    setDimData([]);
    setEditingDim(null);

    try {
      const querySnapshot = await getDocs(
        collection(db, "artifacts", appId, "public", "data", colName)
      );
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Sorteer op ID (numeriek geprobeerd)
      data.sort((a, b) =>
        a.id.localeCompare(b.id, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );
      setDimData(data);
    } catch (error) {
      console.error("Fout bij laden:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGICA VOOR BESCHIKBARE ID's ---
  const getAvailableIDs = () => {
    if (!dimFilters.pn) return [];
    if (!productRange) return libraryData.diameters || [];

    let connKey = "";
    if (activeMode === "bell") {
      connKey = bellSubType.toUpperCase(); // "CB" of "TB"
    } else {
      return libraryData.diameters || [];
    }

    const pnKey = String(dimFilters.pn);
    const rangeForPn = productRange[connKey]?.[pnKey];

    if (!rangeForPn) return [];

    const allIds = new Set();
    Object.values(rangeForPn).forEach((ids) => {
      if (Array.isArray(ids)) ids.forEach((id) => allIds.add(id));
    });

    if (allIds.size === 0) return libraryData.diameters || [];

    return Array.from(allIds).sort((a, b) => a - b);
  };

  // --- TEMPLATE OPZOEKEN ---
  const getActiveBlueprint = () => {
    const connSuffix = activeMode === "bell" ? bellSubType.toUpperCase() : "";

    // Probeer specifieke sleutel (bv. Algemeen_CB/CB)
    let bpKey = `Algemeen_${connSuffix}/${connSuffix}`;

    // Fallbacks
    if (!blueprints[bpKey]) bpKey = `Algemeen_${connSuffix}`;
    if (!blueprints[bpKey]) bpKey = "Algemeen";

    return blueprints[bpKey] || { fields: [] };
  };

  const createNewItem = () => {
    if (!dimFilters.pn || !dimFilters.id) {
      alert("Selecteer eerst een Drukklasse (PN) en Diameter (ID).");
      return;
    }

    let newKey = "";
    if (activeMode === "fitting") {
      newKey = `Fitting_PN${dimFilters.pn}_ID${dimFilters.id}`;
    } else {
      const prefix = bellSubType === "cb" ? "CB" : "TB";
      newKey = `${prefix}_PN${dimFilters.pn}_ID${dimFilters.id}`;
    }

    // 1. Haal velden uit de blauwdruk
    const blueprint = getActiveBlueprint();
    // Fallback velden als er geen blueprint is
    let fields = blueprint.fields;
    if (!fields || fields.length === 0) {
      if (bellSubType === "tb") fields = ["B1", "B2", "BA", "r1"];
      else fields = ["B1", "A1", "L"];
    }

    // 2. Maak object
    const newDoc = { id: newKey };
    fields.forEach((field) => {
      newDoc[field] = ""; // Leeg initialiseren
    });

    setEditingDim(newDoc);
  };

  const saveItem = async () => {
    if (!editingDim || !editingDim.id) return;
    setLoading(true);
    const colName = getCollectionName();
    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", colName, editingDim.id),
        editingDim
      );
      await loadData();
    } catch (e) {
      alert("❌ Fout bij opslaan: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm(`Weet je zeker dat je ${id} wilt verwijderen?`)) return;
    setLoading(true);
    const colName = getCollectionName();
    try {
      await deleteDoc(
        doc(db, "artifacts", appId, "public", "data", colName, id)
      );
      loadData();
    } catch (e) {
      alert("❌ Fout bij verwijderen.");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER LOGICA VOOR VELDEN ---
  const renderFields = () => {
    if (!editingDim) return null;

    // 1. Welke velden moeten we tonen?
    const blueprint = getActiveBlueprint();
    const blueprintFields = new Set(blueprint.fields || []);
    const docFields = Object.keys(editingDim).filter((k) => k !== "id");

    // Combineer database velden en template velden
    const allFields = Array.from(new Set([...blueprintFields, ...docFields]));

    // 2. Sorteer velden in groepen
    const groupedFields = {
      socket: [],
      dimensions: [],
      mounting: [],
      other: [],
      rest: [],
    };

    allFields.forEach((field) => {
      const groupKey = FIELD_TO_GROUP_MAP[field];
      if (groupKey && groupedFields[groupKey]) {
        groupedFields[groupKey].push(field);
      } else {
        groupedFields.rest.push(field);
      }
    });

    // 3. Render de groepen
    return (
      <div className="space-y-6">
        {Object.entries(GROUP_CONFIG).map(([groupKey, config]) => {
          const fields = groupedFields[groupKey];
          if (fields.length === 0) return null;

          return (
            <div
              key={groupKey}
              className={`p-5 rounded-2xl border ${config.color}`}
            >
              <h5 className="font-black text-xs uppercase tracking-widest mb-4 opacity-80 flex items-center gap-2">
                {config.title}
              </h5>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {fields.map((key) => (
                  <div key={key} className="relative">
                    <label className="block text-[10px] font-bold uppercase mb-1 opacity-60">
                      {key}
                    </label>
                    <input
                      className="w-full bg-white/50 border border-current/20 rounded-xl px-3 py-2.5 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-current/20 outline-none transition-all"
                      value={editingDim[key] || ""}
                      onChange={(e) =>
                        setEditingDim({ ...editingDim, [key]: e.target.value })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Restgroep */}
        {groupedFields.rest.length > 0 && (
          <div className="p-5 rounded-2xl border bg-gray-50 border-gray-200">
            <h5 className="font-black text-xs text-gray-500 uppercase tracking-widest mb-4">
              Extra Velden
            </h5>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedFields.rest.map((key) => (
                <div key={key}>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                    {key}
                  </label>
                  <input
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-gray-400"
                    value={editingDim[key]}
                    onChange={(e) =>
                      setEditingDim({ ...editingDim, [key]: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const filteredData = dimData.filter((d) =>
    d.id.toLowerCase().includes(listSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 w-full max-w-7xl mx-auto">
      {/* 1. HOOFDNAVIGATIE */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-wrap gap-2">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                setActiveMode(mode.id);
                setEditingDim(null);
                setDimFilters({ pn: "", id: "" });
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeMode === mode.id
                  ? "bg-slate-900 text-white shadow-md transform scale-105"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {mode.icon}
              {mode.label}
            </button>
          ))}
        </div>

        {activeMode === "bell" && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4 items-center">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">
              Type:
            </span>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {SUB_TYPES_BELL.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => {
                    setBellSubType(sub.id);
                    setEditingDim(null);
                    setDimFilters({ pn: "", id: "" });
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    bellSubType === sub.id
                      ? "bg-white text-emerald-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-full">
        {/* VIEW: BORE & TOLERANCE (Extern) */}
        {activeMode === "bore" && (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm min-h-[500px]">
            <Suspense
              fallback={
                <div className="p-10 text-center">
                  <Loader2 className="animate-spin inline" /> Laden...
                </div>
              }
            >
              <BoreDimensionsManager />
            </Suspense>
          </div>
        )}

        {activeMode === "tolerance" && (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm min-h-[500px]">
            <Suspense
              fallback={
                <div className="p-10 text-center">
                  <Loader2 className="animate-spin inline" /> Laden...
                </div>
              }
            >
              <AdminToleranceView
                bellDimensions={bellDimensions}
                productRange={productRange}
              />
            </Suspense>
          </div>
        )}

        {/* VIEW: EDITOR (BELL & FITTING) */}
        {(activeMode === "bell" || activeMode === "fitting") && (
          <div className="flex flex-col lg:flex-row gap-6 items-start h-[calc(100vh-250px)]">
            {/* LINKER KOLOM: LIJST & CREATIE */}
            <div className="w-full lg:w-1/3 flex flex-col gap-4 h-full">
              {/* Nieuw Item Panel */}
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 shrink-0">
                <h4 className="font-black text-slate-800 mb-3 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Plus size={16} className="text-emerald-500" /> Nieuw Item
                </h4>
                <div className="flex gap-2 mb-3">
                  <select
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold w-1/3 outline-none focus:border-blue-500"
                    onChange={(e) =>
                      setDimFilters({
                        ...dimFilters,
                        pn: e.target.value,
                        id: "",
                      })
                    }
                    value={dimFilters.pn}
                  >
                    <option value="">- PN -</option>
                    {libraryData.pns.map((pn) => (
                      <option key={pn} value={pn}>
                        PN {pn}
                      </option>
                    ))}
                  </select>

                  {/* Slimme ID Dropdown */}
                  <select
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold flex-1 outline-none focus:border-blue-500 disabled:opacity-50"
                    onChange={(e) =>
                      setDimFilters({ ...dimFilters, id: e.target.value })
                    }
                    value={dimFilters.id}
                    disabled={!dimFilters.pn}
                  >
                    <option value="">- ID -</option>
                    {getAvailableIDs().map((id) => (
                      <option key={id} value={id}>
                        ID {id}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={createNewItem}
                  disabled={!dimFilters.pn || !dimFilters.id}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-lg shadow-slate-200 hover:shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Aanmaken
                </button>
              </div>

              {/* Scrollbare Lijst */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="Zoek ID..."
                      value={listSearch}
                      onChange={(e) => setListSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                  {loading && (
                    <div className="p-4 text-center text-slate-400">
                      <Loader2 className="animate-spin inline mx-auto" />
                    </div>
                  )}

                  {!loading && filteredData.length === 0 && (
                    <div className="text-center p-8 text-slate-400 text-xs">
                      Geen items gevonden.
                    </div>
                  )}

                  {filteredData.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => setEditingDim(d)}
                      className={`group p-3 rounded-2xl cursor-pointer transition-all flex justify-between items-center ${
                        editingDim?.id === d.id
                          ? "bg-slate-900 text-white shadow-md"
                          : "hover:bg-slate-50 text-slate-600 border border-transparent hover:border-slate-100"
                      }`}
                    >
                      <span className="text-xs font-bold font-mono">
                        {d.id}
                      </span>
                      <ChevronRight
                        size={14}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                          editingDim?.id === d.id
                            ? "text-emerald-400"
                            : "text-slate-400"
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RECHTER KOLOM: EDITOR */}
            <div className="flex-1 h-full overflow-y-auto custom-scrollbar pr-2">
              {editingDim ? (
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Header Editor */}
                  <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          {activeMode === "bell"
                            ? bellSubType.toUpperCase()
                            : "FITTING"}
                        </span>
                      </div>
                      <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                        {editingDim.id}
                      </h3>
                    </div>
                    <button
                      onClick={() => deleteItem(editingDim.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-3 rounded-xl transition-colors"
                      title="Verwijder item"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  {/* Render dynamisch de velden */}
                  {renderFields()}

                  {/* Nieuw Veld Toevoegen (Dynamisch) */}
                  <div className="flex gap-2 mt-8 pt-6 border-t border-slate-100">
                    <input
                      id="newDimField"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-slate-400"
                      placeholder="Extra veld toevoegen (bijv. X, Y)..."
                    />
                    <button
                      onClick={() => {
                        const f = document.getElementById("newDimField").value;
                        if (f) {
                          setEditingDim({ ...editingDim, [f]: "" });
                          document.getElementById("newDimField").value = "";
                        }
                      }}
                      className="bg-slate-200 text-slate-600 px-6 rounded-xl text-xs font-black hover:bg-slate-300 transition-colors"
                    >
                      + Veld
                    </button>
                  </div>

                  {/* Save Button */}
                  <div className="mt-6">
                    <button
                      onClick={saveItem}
                      disabled={loading}
                      className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-200 transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Edit3 size={18} />
                      )}
                      {loading ? "Opslaan..." : "Wijzigingen Opslaan"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                  <Ruler size={64} className="mb-4 opacity-20" />
                  <p className="font-bold text-lg text-slate-400">
                    Selecteer een item
                  </p>
                  <p className="text-xs text-slate-400">
                    Klik links in de lijst om te bewerken
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
