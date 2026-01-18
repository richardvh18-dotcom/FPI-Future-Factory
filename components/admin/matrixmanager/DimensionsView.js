import React, { useState, useEffect, useMemo, Suspense, lazy } from "react";
import {
  Loader2,
  Edit3,
  Trash2,
  Ruler,
  Search,
  Layout,
  Settings,
  ChevronRight,
  Plus,
  Box,
  Target,
  Save,
  RefreshCw,
  Layers,
  Database,
  AlertCircle,
  Info,
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

// Lazy imports voor sub-componenten
const AdminToleranceView = lazy(() => import("../AdminToleranceView"));

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
  B1: "B1",
  B2: "B2",
  BA: "BA",
  A: "A",
  TW: "TW",
  TWcb: "TWcb",
  TWtb: "TWtb",
  Twtb: "TWtb",
  r1: "r1",
  BD: "BD",
  W: "W",
  L: "L",
  Lo: "Lo",
  Z: "Z",
  R: "R",
  alpha: "alpha",
  Weight: "Weight",
  k: "k",
  d: "d",
  n: "n",
  b: "b",
};

const FITTING_ORDER = ["TW", "L", "Lo", "R", "Weight"];
const DEFAULT_BORE_FIELDS = ["k", "d", "n", "b"];

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
  const [dimFilters, setDimFilters] = useState({
    pn: "",
    id: "",
    extraCode: "",
    type: "",
    drilling: "",
  });

  /**
   * getCollectionForType: Bepaalt de collectie op basis van het type (Standaard vs Socket).
   */
  const getCollectionForType = (type) => {
    if (!type) return "standard_fitting_specs";
    return type.toLowerCase().endsWith("_socket")
      ? "standard_socket_specs"
      : "standard_fitting_specs";
  };

  const getCollectionName = () => {
    if (activeMode === "fitting") return getCollectionForType(dimFilters.type);
    if (activeMode === "bell")
      return bellSubType === "cb" ? "cb_dimensions" : "fitting_specs";
    if (activeMode === "bore") return "bore_dimensions";
    return null;
  };

  useEffect(() => {
    if (["bell", "fitting", "bore"].includes(activeMode)) {
      loadList();
    }
  }, [activeMode, bellSubType, dimFilters.type, appId]);

  const loadList = async () => {
    const colName = getCollectionName();
    if (!colName) return;
    setLoading(true);
    try {
      const querySnapshot = await getDocs(
        collection(db, "artifacts", appId, "public", "data", colName)
      );
      const data = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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
      console.error("Data laadfout:", e);
    } finally {
      setLoading(false);
    }
  };

  // --- MATRIX KOPPELING MET FALLBACK ---
  const getAvailablePNs = () => {
    const masterPNs = libraryData?.pns || [];
    if (!productRange) return masterPNs;
    const pns = new Set();
    const currentMof = bellSubType.toUpperCase();
    const matrixEntry =
      productRange[currentMof] || productRange[`${currentMof}/${currentMof}`];
    if (matrixEntry) {
      Object.keys(matrixEntry).forEach((pn) => pns.add(Number(pn)));
    }
    return pns.size === 0 ? masterPNs : Array.from(pns).sort((a, b) => a - b);
  };

  const getAvailableIDs = () => {
    const masterIDs = libraryData?.diameters || [];
    if (activeMode === "bore") return masterIDs;
    if (!dimFilters.pn) return [];
    if (!productRange) return masterIDs;

    const currentMof = bellSubType.toUpperCase();
    const pnKey = String(dimFilters.pn);
    const matrixEntry =
      productRange[currentMof] || productRange[`${currentMof}/${currentMof}`];

    if (matrixEntry && matrixEntry[pnKey]) {
      const pnData = matrixEntry[pnKey];
      if (activeMode === "fitting" && dimFilters.type) {
        const typeIds = pnData[dimFilters.type] || pnData["Algemeen"];
        if (typeIds && Array.isArray(typeIds) && typeIds.length > 0)
          return [...typeIds].sort((a, b) => a - b);
        return masterIDs;
      } else {
        const allIds = new Set();
        Object.values(pnData).forEach((ids) => {
          if (Array.isArray(ids)) ids.forEach((id) => allIds.add(Number(id)));
        });
        return allIds.size === 0
          ? masterIDs
          : Array.from(allIds).sort((a, b) => a - b);
      }
    }
    return masterIDs;
  };

  /**
   * lookupBlueprintFields: Zoekt de juiste velden op basis van hiërarchie.
   * FIX: Ondersteunt nu Type_Mof/Mof notatie.
   */
  const lookupBlueprintFields = (type, mof, extraCode) => {
    if (!blueprints) return null;

    const possibleKeys = [
      `${type}_${mof}/${mof}`, // Bijv: Elbow_Socket_CB/CB
      `${type}_${mof}_${extraCode}`, // Bijv: Elbow_Socket_CB_Extra
      `${type}_${mof}`, // Bijv: Elbow_Socket_CB
      `Algemeen_${mof}/${mof}`, // Bijv: Algemeen_CB/CB
      `Algemeen_${mof}`, // Bijv: Algemeen_CB
    ];

    for (const key of possibleKeys) {
      if (blueprints[key] && Array.isArray(blueprints[key].fields)) {
        return blueprints[key].fields;
      }
    }
    return null;
  };

  // --- ACTIES ---
  const createNewItem = () => {
    if (activeMode === "bore") {
      if (!dimFilters.drilling || !dimFilters.id)
        return alert("Kies Boring en ID.");
      const id = `${dimFilters.drilling.replace(/\s+/g, "_")}_ID${
        dimFilters.id
      }`.toUpperCase();
      const newDoc = {
        id,
        drilling: dimFilters.drilling,
        diameter: Number(dimFilters.id),
      };
      (
        blueprints?.[`BORE_${dimFilters.drilling}`]?.fields ||
        DEFAULT_BORE_FIELDS
      ).forEach((f) => (newDoc[f] = ""));
      setEditingDim(newDoc);
      return;
    }

    if (!dimFilters.pn || !dimFilters.id) return alert("Selecteer PN en ID.");

    const variant = bellSubType.toUpperCase();
    const selectedType = activeMode === "fitting" ? dimFilters.type : "Bell";
    if (activeMode === "fitting" && !selectedType)
      return alert("Selecteer een type.");

    const id =
      activeMode === "fitting"
        ? `${selectedType.toUpperCase()}_${variant}_PN${dimFilters.pn}_ID${
            dimFilters.id
          }${
            dimFilters.extraCode ? "_" + dimFilters.extraCode.toUpperCase() : ""
          }`
        : `${variant}_PN${dimFilters.pn}_ID${dimFilters.id}${
            dimFilters.extraCode ? "_" + dimFilters.extraCode.toUpperCase() : ""
          }`;

    const newDoc = {
      id,
      type: selectedType,
      pressure: Number(dimFilters.pn),
      diameter: Number(dimFilters.id),
    };

    // --- TEMPLATE LOOKUP (V4.4 FIX) ---
    let fields = lookupBlueprintFields(
      selectedType,
      variant,
      dimFilters.extraCode
    );

    if (!fields) {
      fields =
        activeMode === "bell"
          ? variant === "TB"
            ? ["B1", "B2", "BA", "r1", "alpha"]
            : ["B1", "B2", "BA", "A"]
          : FITTING_ORDER;
    }

    fields.forEach((f) => (newDoc[f] = ""));
    setEditingDim(newDoc);
  };

  const saveItem = async () => {
    if (!editingDim) return;
    setLoading(true);
    const colName =
      editingDim.type === "Bell"
        ? bellSubType === "cb"
          ? "cb_dimensions"
          : "fitting_specs"
        : getCollectionForType(editingDim.type);

    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", colName, editingDim.id),
        editingDim
      );
      alert("✅ Opgeslagen!");
      loadList();
    } catch (e) {
      alert("❌ Fout: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const getSortedFields = (docItem) => {
    const keys = Object.keys(docItem).filter(
      (k) =>
        ![
          "id",
          "type",
          "pressure",
          "diameter",
          "drilling",
          "lastUpdated",
          "timestamp",
        ].includes(k)
    );
    if (activeMode === "bore") return keys;
    return keys.sort((a, b) => {
      const normA = a === "TWcb" || a === "TWtb" || a === "Twtb" ? "TW" : a;
      const normB = b === "TWcb" || b === "TWtb" || b === "Twtb" ? "TW" : b;
      const indexA = FITTING_ORDER.indexOf(normA);
      const indexB = FITTING_ORDER.indexOf(normB);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      return a.localeCompare(b);
    });
  };

  const filteredData = (dimData || []).filter((d) =>
    d.id.toLowerCase().includes(listSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col text-left">
      {/* 1. BOVEN-NAVIGATIE */}
      <div className="bg-white p-3 rounded-[28px] shadow-sm border border-slate-200 flex justify-between items-center shrink-0">
        <div className="flex gap-2 text-left">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                setActiveMode(mode.id);
                setEditingDim(null);
                setDimFilters({
                  pn: "",
                  id: "",
                  extraCode: "",
                  type: "",
                  drilling: "",
                });
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
                onClick={() => {
                  setBellSubType(sub.id);
                  setEditingDim(null);
                }}
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

      <div className="flex-1 flex gap-6 overflow-hidden">
        {activeMode !== "tolerance" ? (
          <>
            {/* LINKER KOLOM: SELECTIE & LIJST */}
            <div className="w-1/3 h-full flex flex-col gap-4 overflow-hidden text-left">
              <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-200 shrink-0 space-y-4">
                <h4 className="font-black text-slate-800 text-[10px] uppercase tracking-widest italic text-left">
                  Nieuw Item ({activeMode.toUpperCase()})
                </h4>
                <div className="space-y-3">
                  {activeMode === "fitting" && (
                    <select
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-2.5 text-xs font-black text-slate-700 outline-none focus:border-blue-500 shadow-sm"
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
                  {activeMode === "bore" && (
                    <select
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-2.5 text-xs font-black text-slate-700 outline-none focus:border-blue-500 shadow-sm"
                      value={dimFilters.drilling}
                      onChange={(e) =>
                        setDimFilters({
                          ...dimFilters,
                          drilling: e.target.value,
                        })
                      }
                    >
                      <option value="">- Kies Boring Type -</option>
                      {libraryData?.borings?.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="flex gap-2">
                    <select
                      className="w-1/3 bg-slate-50 border-2 border-slate-100 rounded-xl p-2.5 text-xs font-black text-slate-700 shadow-sm"
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
                      {getAvailablePNs().map((pn) => (
                        <option key={pn} value={pn}>
                          PN{pn}
                        </option>
                      ))}
                    </select>
                    <select
                      className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl p-2.5 text-xs font-black text-slate-700 shadow-sm"
                      value={dimFilters.id}
                      onChange={(e) =>
                        setDimFilters({ ...dimFilters, id: e.target.value })
                      }
                    >
                      <option value="">ID (Diameter)</option>
                      {getAvailableIDs().map((id) => (
                        <option key={id} value={id}>
                          ID{id}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={createNewItem}
                  className="w-full bg-slate-900 text-white py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-xl disabled:opacity-30"
                  disabled={!dimFilters.id}
                >
                  + Toevoegen aan Lijst
                </button>
              </div>

              <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden text-left">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 text-left">
                  <div className="relative text-left">
                    <Search
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                      size={16}
                    />
                    <input
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-400 transition-all"
                      placeholder={`Zoek in ${activeMode}...`}
                      value={listSearch}
                      onChange={(e) => setListSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar text-left">
                  {loading ? (
                    <div className="p-8 text-center">
                      <Loader2 className="animate-spin inline text-blue-500" />
                    </div>
                  ) : filteredData.length === 0 ? (
                    <div className="p-8 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest italic">
                      Geen items gevonden
                    </div>
                  ) : (
                    filteredData.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => setEditingDim(d)}
                        className={`group p-3.5 rounded-2xl cursor-pointer transition-all flex justify-between items-center ${
                          editingDim?.id === d.id
                            ? "bg-slate-900 text-white shadow-xl scale-[1.02]"
                            : "hover:bg-slate-50 text-slate-600 hover:border-slate-200 border border-transparent"
                        }`}
                      >
                        <span className="text-[11px] font-bold font-mono truncate mr-2">
                          {d.id}
                        </span>
                        <ChevronRight
                          size={14}
                          className={
                            editingDim?.id === d.id
                              ? "text-emerald-400"
                              : "opacity-0 group-hover:opacity-100"
                          }
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RECHTER KOLOM: EDITOR */}
            <div className="flex-1 h-full overflow-y-auto custom-scrollbar pr-2 text-left">
              {editingDim ? (
                <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100 relative mb-10 animate-in fade-in slide-in-from-bottom-4 duration-300 text-left">
                  <div className="flex justify-between items-start mb-10 pb-8 border-b border-slate-100 text-left">
                    <div className="text-left">
                      <span className="px-3 py-1 bg-blue-50 rounded-full text-[9px] font-black text-blue-600 uppercase tracking-widest mb-3 inline-block italic border border-blue-100 shadow-sm">
                        {editingDim.type?.endsWith("_Socket")
                          ? "SOCKET VARIANT"
                          : activeMode.toUpperCase()}
                      </span>
                      <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase text-left">
                        {editingDim.id}
                      </h3>
                    </div>
                    <button
                      onClick={saveItem}
                      disabled={loading}
                      className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      {loading ? (
                        <RefreshCw className="animate-spin" size={16} />
                      ) : (
                        <Save size={16} />
                      )}{" "}
                      Opslaan
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                    {getSortedFields(editingDim).map((key) => (
                      <div key={key} className="space-y-1 text-left">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          {DIMENSION_LABELS[key] || key}
                        </label>
                        <div className="relative text-left">
                          <input
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-inner"
                            value={editingDim[key] || ""}
                            onChange={(e) =>
                              setEditingDim({
                                ...editingDim,
                                [key]: e.target.value,
                              })
                            }
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 pointer-events-none">
                            {key.toLowerCase().includes("weight")
                              ? "kg"
                              : key === "n" || key.includes("holes")
                              ? "st"
                              : "mm"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-100 rounded-[50px] bg-white/50 p-20 text-center text-left">
                  <Box size={80} className="mb-6 opacity-10" />
                  <p className="font-black text-xl uppercase tracking-widest text-slate-400 max-w-sm">
                    Selecteer een item of start een nieuwe maatvoering
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm relative text-left">
            <Suspense
              fallback={
                <div className="p-20 text-center">
                  <Loader2
                    className="animate-spin inline text-blue-500"
                    size={40}
                  />
                </div>
              }
            >
              <AdminToleranceView
                bellDimensions={null}
                productRange={productRange}
              />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
};

export default DimensionsView;
