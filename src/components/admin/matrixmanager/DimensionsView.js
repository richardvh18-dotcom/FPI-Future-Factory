import React, { useState, useEffect, Suspense, lazy } from "react";
import {
  Loader2,
  Edit3,
  Trash2,
  Ruler,
  Search,
  Info,
  Layout,
  Settings,
  ChevronRight,
  Plus,
  Copy,
  Box,
} from "lucide-react";
import {
  collection,
  getDocs,
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
  { id: "tb", label: "TB", collection: "fitting_specs" },
];

// Uitgebreide label mapping voor betere leesbaarheid
const DIMENSION_LABELS = {
  B1: "B1 (Mofdiepte)",
  B2: "B2 (Insteek)",
  BA: "BA",
  A1: "A1",
  TWcb: "TW (Wanddikte CB)",
  TWtb: "TW (Wanddikte TB)",
  r1: "r1 (Radius)",
  BD: "BD (Buitendiameter)",
  W: "W (Wanddikte)",
  L: "L (Lengte)",
  Z: "Z (Z-maat)",
  L1: "L1",
  L2: "L2",
  alpha: "Hoek (α)",
  d: "d (Diameter)",
  k: "k",
  b: "b",
};

const DimensionsView = ({
  libraryData,
  blueprints,
  db: propDb,
  appId: propAppId,
  bellDimensions,
  boreDimensions,
  productRange,
}) => {
  const db = propDb || firebaseDb;
  const appId = propAppId || firebaseAppId;

  const [activeMode, setActiveMode] = useState("bell");
  const [bellSubType, setBellSubType] = useState("cb");

  const [dimData, setDimData] = useState([]);
  const [editingDim, setEditingDim] = useState(null);

  const [dimFilters, setDimFilters] = useState({
    pn: "",
    id: "",
    extraCode: "",
    type: "",
  });
  const [templateSource, setTemplateSource] = useState({
    type: "Algemeen",
    conn: "",
  });

  const [loading, setLoading] = useState(false);
  const [listSearch, setListSearch] = useState("");

  const getCollectionName = () => {
    if (activeMode === "fitting") return "standard_fitting_specs";
    if (activeMode === "bell") {
      return bellSubType === "cb" ? "cb_dimensions" : "fitting_specs";
    }
    return null;
  };

  useEffect(() => {
    if (activeMode === "bell" || activeMode === "fitting") {
      loadData();
    }
  }, [activeMode, bellSubType, appId]);

  const loadData = async () => {
    const colName = getCollectionName();
    if (!colName || !appId) return;
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

      let filtered = data;
      if (activeMode === "fitting") {
        const variant = bellSubType.toUpperCase();
        filtered = data.filter(
          (item) => item.id && item.id.includes(`_${variant}_`)
        );
      }

      filtered.sort((a, b) =>
        a.id.localeCompare(b.id, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );
      setDimData(filtered);
    } catch (error) {
      console.error("Fout bij laden:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailablePNs = () => {
    if (!productRange || Object.keys(productRange).length === 0)
      return libraryData?.pns || [];

    const pns = new Set();
    const connKey = bellSubType.toUpperCase();
    const rangeForConn =
      productRange[connKey] || productRange[`${connKey}/${connKey}`];

    if (rangeForConn) {
      Object.keys(rangeForConn).forEach((pn) => {
        if (!isNaN(Number(pn))) pns.add(Number(pn));
      });
    }

    if (pns.size === 0) return libraryData?.pns || [];
    return Array.from(pns).sort((a, b) => a - b);
  };

  const getAvailableIDs = () => {
    if (!dimFilters.pn) return [];
    if (!productRange || Object.keys(productRange).length === 0)
      return libraryData?.diameters || [];

    const pnKey = String(dimFilters.pn);
    const connKey = bellSubType.toUpperCase();
    const allIds = new Set();
    const rangeForConn =
      productRange[connKey] || productRange[`${connKey}/${connKey}`];
    const rangeForPN = rangeForConn?.[pnKey];

    if (rangeForPN) {
      if (activeMode === "fitting" && dimFilters.type) {
        const typeKey = dimFilters.type;
        const baseType = typeKey.split("_")[0];
        const keysToCheck = [
          typeKey,
          baseType,
          `${baseType}_Socket`,
          `${baseType}_Spiggot`,
        ];

        keysToCheck.forEach((key) => {
          if (rangeForPN[key] && Array.isArray(rangeForPN[key])) {
            rangeForPN[key].forEach((id) => allIds.add(Number(id)));
          }
        });
      } else {
        Object.values(rangeForPN).forEach((ids) => {
          if (Array.isArray(ids)) ids.forEach((id) => allIds.add(Number(id)));
        });
      }
    }

    if (allIds.size === 0 && libraryData?.diameters)
      return libraryData.diameters;
    return Array.from(allIds).sort((a, b) => a - b);
  };

  const getActiveBlueprint = (connSuffix, extraCode, productType) => {
    if (productType) {
      const typeVariations = [
        productType,
        `${productType}_Socket`,
        productType.split("_")[0],
      ];

      for (const type of typeVariations) {
        if (extraCode) {
          let key = `${type}_${connSuffix}_${extraCode}`;
          if (blueprints[key]) return blueprints[key];
        }
        let keyDouble = `${type}_${connSuffix}/${connSuffix}`;
        if (blueprints[keyDouble]) return blueprints[keyDouble];
        let keySingle = `${type}_${connSuffix}`;
        if (blueprints[keySingle]) return blueprints[keySingle];
      }
    }

    if (extraCode) {
      let keyWithCode = `Algemeen_${connSuffix}_${extraCode}`;
      if (blueprints[keyWithCode]) return blueprints[keyWithCode];
    }

    let bpKeyDouble = `Algemeen_${connSuffix}/${connSuffix}`;
    if (blueprints[bpKeyDouble]) return blueprints[bpKeyDouble];

    let bpKey = `Algemeen_${connSuffix}`;
    if (blueprints[bpKey]) return blueprints[bpKey];

    return blueprints["Algemeen"] || { fields: [] };
  };

  const createNewItem = () => {
    if (!dimFilters.pn || !dimFilters.id) {
      alert("Selecteer eerst een Drukklasse (PN) en Diameter (ID).");
      return;
    }

    let newKey = "";
    const variantUpper = bellSubType.toUpperCase();
    let selectedType = null;

    if (activeMode === "fitting") {
      if (!dimFilters.type) {
        alert("Selecteer een Product Type (bijv. Elbow).");
        return;
      }
      selectedType = dimFilters.type;
      newKey = `${selectedType.toUpperCase()}_${variantUpper}_PN${
        dimFilters.pn
      }_ID${dimFilters.id}`;
    } else {
      newKey = `${variantUpper}_PN${dimFilters.pn}_ID${dimFilters.id}`;
    }

    if (dimFilters.extraCode) {
      newKey += `_${dimFilters.extraCode.toUpperCase()}`;
    }

    const blueprint = getActiveBlueprint(
      variantUpper,
      dimFilters.extraCode,
      selectedType
    );
    let fields = blueprint.fields || [];

    // Fallbacks
    if (fields.length === 0) {
      if (activeMode === "bell") {
        if (bellSubType === "tb") fields = ["B1", "B2", "BA", "r1", "alpha"];
        else fields = ["B1", "B2", "BA", "A1"];
      } else {
        fields = ["L", "Z", "BD", "W"];
        if (bellSubType === "cb") fields.push("TWcb");
        if (bellSubType === "tb") fields.push("TWtb");
      }
    }

    const newDoc = {
      id: newKey,
      type: activeMode === "fitting" ? dimFilters.type : "Bell",
      pressure: Number(dimFilters.pn),
      diameter: Number(dimFilters.id),
    };

    fields.forEach((field) => {
      newDoc[field] = "";
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

  // --- AANGEPASTE RENDER FUNCTIE MET STRIKTE VOLGORDE ---
  const renderFields = () => {
    if (!editingDim) return null;

    // De velden die daadwerkelijk in het document zitten
    const docFields = Object.keys(editingDim).filter(
      (k) => !["id", "type", "pressure", "diameter"].includes(k)
    );

    let blueprintFields = [];

    // Probeer de blauwdruk te achterhalen
    if (editingDim.id) {
      const parts = editingDim.id.split("_");
      let type = activeMode === "fitting" ? parts[0] : null;
      if (!type && activeMode === "bell") type = null;

      const conn = bellSubType.toUpperCase();
      let extraCode = dimFilters.extraCode || "";

      const bp = getActiveBlueprint(conn, extraCode, type);
      if (bp && bp.fields) {
        blueprintFields = bp.fields;
      }
    }

    // --- CRUCIALE SORTERING ---
    // We willen de volgorde van blueprintFields aanhouden.
    // Velden die in het document zitten maar niet in de blauwdruk, komen erachteraan.

    const sortedFields = docFields.sort((a, b) => {
      const indexA = blueprintFields.indexOf(a);
      const indexB = blueprintFields.indexOf(b);

      // Als beide in de blauwdruk staan, gebruik de volgorde van de blauwdruk
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      // Als A in blauwdruk staat (en B niet), komt A eerst
      if (indexA !== -1) return -1;

      // Als B in blauwdruk staat (en A niet), komt B eerst
      if (indexB !== -1) return 1;

      // Als geen van beide in de blauwdruk staat, alfabetisch sorteren
      return a.localeCompare(b);
    });

    return (
      <div className="space-y-6">
        <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
          <h5 className="font-black text-sm uppercase tracking-widest mb-6 opacity-70 flex items-center gap-2 text-slate-600">
            <Box size={18} />
            Specificaties & Afmetingen
          </h5>

          <div className="grid grid-cols-2 gap-x-6 gap-y-6">
            {sortedFields.map((key) => (
              <div key={key} className="relative group">
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5 transition-colors group-focus-within:text-blue-600">
                  {DIMENSION_LABELS[key] || key}
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300"
                    placeholder="-"
                    value={editingDim[key] || ""}
                    onChange={(e) =>
                      setEditingDim({ ...editingDim, [key]: e.target.value })
                    }
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-300 pointer-events-none">
                    mm
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
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
                setDimFilters({ pn: "", id: "", extraCode: "", type: "" });
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

        {(activeMode === "bell" || activeMode === "fitting") && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4 items-center">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">
              Variant:
            </span>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {SUB_TYPES_BELL.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => {
                    setBellSubType(sub.id);
                    setEditingDim(null);
                    setDimFilters({ pn: "", id: "", extraCode: "", type: "" });
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
        {activeMode === "bore" && (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm min-h-[500px]">
            <Suspense
              fallback={
                <div className="p-10 text-center">
                  <Loader2 className="animate-spin inline" /> Laden...
                </div>
              }
            >
              <BoreDimensionsManager boreDimensions={boreDimensions} />
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

        {(activeMode === "bell" || activeMode === "fitting") && (
          <div className="flex flex-col lg:flex-row gap-6 items-start h-[calc(100vh-250px)]">
            <div className="w-full lg:w-1/3 flex flex-col gap-4 h-full">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 shrink-0">
                <h4 className="font-black text-slate-800 mb-3 text-xs uppercase tracking-wider">
                  Nieuw Item
                </h4>
                <div className="flex flex-col gap-2 mb-3">
                  {activeMode === "fitting" && (
                    <select
                      className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold w-full outline-none focus:border-blue-500"
                      value={dimFilters.type}
                      onChange={(e) =>
                        setDimFilters({
                          ...dimFilters,
                          type: e.target.value,
                          id: "",
                        })
                      }
                    >
                      <option value="">- Kies Fitting Type -</option>
                      {(libraryData?.product_names || [])
                        .filter((t) => t !== "Algemeen")
                        .map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                    </select>
                  )}

                  <div className="flex gap-2">
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
                      {getAvailablePNs().map((pn) => (
                        <option key={pn} value={pn}>
                          PN {pn}
                        </option>
                      ))}
                    </select>

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

                  <select
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold outline-none focus:border-blue-500"
                    value={dimFilters.extraCode}
                    onChange={(e) =>
                      setDimFilters({
                        ...dimFilters,
                        extraCode: e.target.value,
                      })
                    }
                  >
                    <option value="">- Geen Extra Code -</option>
                    {(libraryData?.extraCodes || []).map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={createNewItem}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-lg shadow-slate-200 hover:shadow-emerald-200"
                >
                  + Aanmaken
                </button>
              </div>

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
                      Geen items gevonden in {getCollectionName()}.
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

            <div className="flex-1 h-full overflow-y-auto custom-scrollbar pr-2">
              {editingDim ? (
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          {activeMode === "bell" ? "Bell" : "Fitting"} •{" "}
                          {bellSubType.toUpperCase()}
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

                  {/* FORMULIER VELDEN */}
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
