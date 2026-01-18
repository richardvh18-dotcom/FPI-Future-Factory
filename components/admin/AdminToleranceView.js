import React, { useState, useEffect, useMemo } from "react";
import {
  Ruler,
  Save,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Filter,
  Layers,
  Package,
  Hash,
  Activity,
  Info,
  RotateCcw,
} from "lucide-react";
import {
  collection,
  getDocs,
  doc,
  writeBatch,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db, appId } from "../../config/firebase";
import { STANDARD_PRESSURES } from "../../data/constants";

/**
 * AdminToleranceView.js - v6.1 (Short Labels)
 * Beheert toleranties met korte parameter-labels.
 *
 * UPDATE:
 * - Labels in SCHEMA ingekort naar alleen de afkorting (bijv. "Lo" ipv "Lengte Over Alles").
 */
const AdminToleranceView = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });

  // Dropdown opties
  const [options, setOptions] = useState({
    product_names: [],
    connections: [],
    diameters: [],
  });

  // Matrix data
  const [productRange, setProductRange] = useState({});

  // Selectie State
  const [selCat, setSelCat] = useState("Algemeen");
  const [selConn, setSelConn] = useState("");
  const [selPN, setSelPN] = useState("");
  const [selID, setSelID] = useState("");

  // Huidige data
  const [currentSpecs, setCurrentSpecs] = useState({});

  // SCHEMA: Labels ingekort naar technische afkortingen
  const SCHEMA = {
    Algemeen: [
      { param: "L", label: "L", defaultUnit: "mm" },
      { param: "TW", label: "TW", defaultUnit: "mm" },
      { param: "ID", label: "ID", defaultUnit: "mm" },
      { param: "Weight", label: "Weight", defaultUnit: "%" },
    ],
    Algemeen_CB: [
      { param: "B1", label: "B1", defaultUnit: "mm" },
      { param: "B2", label: "B2", defaultUnit: "mm" },
      { param: "BA", label: "BA", defaultUnit: "mm" },
      { param: "A1", label: "A1", defaultUnit: "mm" },
      { param: "TWcb", label: "TWcb", defaultUnit: "mm" },
      { param: "BD", label: "BD", defaultUnit: "mm" },
      { param: "W", label: "W", defaultUnit: "mm" },
      { param: "ID", label: "ID", defaultUnit: "mm" },
    ],
    Algemeen_TB: [
      { param: "L1", label: "L1", defaultUnit: "mm" },
      { param: "L2", label: "L2", defaultUnit: "mm" },
      { param: "alpha", label: "α", defaultUnit: "graad" },
      { param: "ID", label: "ID", defaultUnit: "mm" },
    ],
    Fitting: [
      { param: "TW", label: "TW", defaultUnit: "mm" },
      { param: "L", label: "L", defaultUnit: "mm" },
      { param: "Lo", label: "Lo", defaultUnit: "mm" },
      { param: "Ba", label: "Ba", defaultUnit: "mm" },
      { param: "W", label: "W", defaultUnit: "mm" },
      { param: "Z", label: "Z", defaultUnit: "mm" },
    ],
    Flange: [
      { param: "DBC", label: "DBC", defaultUnit: "mm" },
      { param: "DU", label: "DU", defaultUnit: "mm" },
      { param: "HOD", label: "HOD", defaultUnit: "mm" },
      { param: "TW", label: "TW", defaultUnit: "mm" },
    ],
    Pipe: [
      { param: "L", label: "L", defaultUnit: "mm" },
      { param: "OD", label: "OD", defaultUnit: "mm" },
    ],
  };

  const normalizeConnection = (conn) => {
    if (!conn || conn === "All") return conn;
    const c = conn.toUpperCase();
    if (c.includes("CB") && c.includes("/")) return "CB";
    if (c.includes("TB") && c.includes("/")) return "TB";
    return conn;
  };

  // 1. Initial Data Load
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const settingsSnap = await getDocs(
          collection(db, "artifacts", appId, "public", "data", "settings")
        );
        settingsSnap.forEach((doc) => {
          if (doc.id === "general_config")
            setOptions((prev) => ({ ...prev, ...doc.data() }));
          if (doc.id === "product_range") setProductRange(doc.data());
        });
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // 2. Laad specifieke data
  useEffect(() => {
    if (!selCat) return;
    if (selCat !== "Algemeen" && (!selConn || !selPN)) {
      setCurrentSpecs({});
      return;
    }

    loadSpecificTolerance();
  }, [selCat, selConn, selPN, selID]);

  const getDocID = () => {
    const catPart = selCat;
    const connPart = normalizeConnection(selConn) || "All";
    const pnPart = selPN || "All";
    let idPart = "All";
    if (selID && selID !== "All") idPart = `ID${selID}`;

    return `${catPart}_${connPart}_${pnPart}_${idPart}`;
  };

  const loadSpecificTolerance = async () => {
    setLoading(true);
    const docId = getDocID();
    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "tolerance_settings",
        docId
      );
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCurrentSpecs(docSnap.data().specs || {});
      } else {
        setCurrentSpecs({});
      }
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpecChange = (param, field, value) => {
    setCurrentSpecs((prev) => ({
      ...prev,
      [param]: {
        ...prev[param],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const docId = getDocID();

    try {
      const specsToSave = {};
      Object.keys(currentSpecs).forEach((key) => {
        const item = currentSpecs[key];
        if (item.min || item.max || item.tolerance) {
          let displayTol = item.tolerance;
          if (!displayTol) {
            if (item.min && item.max) {
              if (
                item.min.startsWith("-") &&
                item.max.startsWith("+") &&
                Math.abs(parseFloat(item.min)) === parseFloat(item.max)
              ) {
                displayTol = `+/- ${parseFloat(item.max)} ${item.unit || "mm"}`;
              } else {
                displayTol = `${item.max} / ${item.min} ${item.unit || "mm"}`;
              }
            } else if (item.min === "0" && item.max) {
              displayTol = `+${item.max} / -0 ${item.unit || "mm"}`;
            } else if (item.min) {
              displayTol = `min ${item.min} ${item.unit || "mm"}`;
            }
          }

          specsToSave[key] = {
            ...item,
            tolerance: displayTol,
            unit: item.unit || "mm",
          };
        }
      });

      const docData = {
        id: docId,
        category: selCat,
        connection: normalizeConnection(selConn) || "All",
        pn: selPN || "All",
        diameterID: selID && selID !== "All" ? selID : "All",
        updatedAt: new Date().toISOString(),
        specs: specsToSave,
      };

      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "tolerance_settings",
          docId
        ),
        docData
      );
      setStatus({ type: "success", msg: "Instellingen opgeslagen!" });
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", msg: "Opslaan mislukt." });
    } finally {
      setSaving(false);
      setTimeout(() => setStatus({ type: "", msg: "" }), 3000);
    }
  };

  const getActiveFields = () => {
    if (selCat === "Algemeen") {
      const normConn = normalizeConnection(selConn);
      if (normConn === "CB") return SCHEMA.Algemeen_CB;
      if (normConn === "TB") return SCHEMA.Algemeen_TB;
      return SCHEMA.Algemeen;
    }
    if (selCat.includes("Flange") || selCat.includes("Flens"))
      return SCHEMA.Flange;
    if (selCat.includes("Pipe") || selCat.includes("Buis")) return SCHEMA.Pipe;
    return SCHEMA.Fitting;
  };

  const availableIDs = useMemo(() => {
    if (selPN === "All" || !selPN) return options.diameters || [];

    const normConn = normalizeConnection(selConn);
    const cleanPN = selPN.replace("PN", "");

    if (selCat === "Algemeen") return options.diameters || [];

    const ids = productRange[normConn]?.[cleanPN]?.[selCat];
    return Array.isArray(ids) ? ids.sort((a, b) => Number(a) - Number(b)) : [];
  }, [selCat, selConn, selPN, productRange, options.diameters]);

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full p-8 overflow-y-auto custom-scrollbar">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-3 bg-white hover:bg-slate-100 rounded-2xl text-slate-500 transition-colors shadow-sm border border-slate-100"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Ruler className="text-orange-500" /> Tolerantie Manager
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              Gecentraliseerd Beheer
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {status.msg && (
            <div
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                status.type === "error"
                  ? "bg-red-50 text-red-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {status.type === "error" ? (
                <AlertTriangle size={14} />
              ) : (
                <CheckCircle size={14} />
              )}{" "}
              {status.msg}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving || (selCat !== "Algemeen" && (!selConn || !selPN))}
            className="bg-orange-500 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            Opslaan
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full pb-20 space-y-6">
        {/* 1. SELECTIE BALK */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <Filter size={16} className="text-slate-400" />
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
              Configuratie Selectie
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CATEGORIE */}
            <div className="relative group">
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                1. Categorie
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer"
                value={selCat}
                onChange={(e) => {
                  setSelCat(e.target.value);
                  setSelConn("");
                  setSelPN("");
                  setSelID("");
                }}
              >
                <option value="Algemeen">Algemeen</option>
                {(options.product_names || []).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <Package
                className="absolute right-4 top-8 text-slate-400 pointer-events-none"
                size={16}
              />
            </div>

            {selCat !== "Global" && (
              <>
                {/* MOF */}
                <div className="relative group animate-in fade-in slide-in-from-left-2">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                    2. Verbinding
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer"
                    value={selConn}
                    onChange={(e) => {
                      setSelConn(e.target.value);
                      setSelPN("");
                      setSelID("");
                    }}
                  >
                    <option value="">- Kies (Optioneel voor Algemeen) -</option>
                    {(options.connections || []).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <Layers
                    className="absolute right-4 top-8 text-slate-400 pointer-events-none"
                    size={16}
                  />
                </div>

                {/* PN */}
                <div className="relative group animate-in fade-in slide-in-from-left-2">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                    3. Drukklasse
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer"
                    value={selPN}
                    disabled={!selConn && selCat !== "Algemeen"}
                    onChange={(e) => {
                      setSelPN(e.target.value);
                      setSelID("");
                    }}
                  >
                    <option value="">- Kies -</option>
                    <option
                      value="All"
                      className="font-black bg-orange-50 text-orange-700"
                    >
                      Alle Drukklassen (Universeel)
                    </option>
                    {STANDARD_PRESSURES.map((p) => (
                      <option key={p} value={`PN${p}`}>
                        PN {p}
                      </option>
                    ))}
                  </select>
                  <Activity
                    className="absolute right-4 top-8 text-slate-400 pointer-events-none"
                    size={16}
                  />
                </div>

                {/* ID */}
                <div className="relative group animate-in fade-in slide-in-from-left-2">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                    4. Diameter (ID)
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer"
                    value={selID}
                    disabled={!selPN}
                    onChange={(e) => setSelID(e.target.value)}
                  >
                    <option value="">- Kies (Optioneel) -</option>
                    <option
                      value="All"
                      className="font-black bg-orange-50 text-orange-700"
                    >
                      Alle Diameters (Universeel)
                    </option>
                    {availableIDs.map((id) => (
                      <option key={id} value={id}>
                        ID {id}
                      </option>
                    ))}
                  </select>
                  <Hash
                    className="absolute right-4 top-8 text-slate-400 pointer-events-none"
                    size={16}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* 2. INVUL FORMULIER */}
        {selCat === "Algemeen" || (selConn && selPN) ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-6 bg-orange-500 rounded-full"></div>
                <div>
                  <h3 className="font-black text-slate-800 uppercase tracking-wider">
                    {selCat} Instellingen
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Scope: {selConn ? normalizeConnection(selConn) : "ALLE"} •{" "}
                    {selPN === "All" ? "ALLE PN" : selPN || "ALLE"} •{" "}
                    {selID === "All"
                      ? "ALLE ID"
                      : selID
                      ? `ID${selID}`
                      : "ALLE"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCurrentSpecs({})}
                className="text-xs text-red-400 hover:text-red-600 font-bold flex items-center gap-1"
              >
                <RotateCcw size={12} /> Wis velden
              </button>
            </div>

            {loading ? (
              <div className="p-10 text-center text-slate-400">
                <Loader2 className="animate-spin mx-auto mb-2" /> Laden...
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-12 gap-4 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                  <div className="col-span-3">Parameter</div>
                  <div className="col-span-2">Min</div>
                  <div className="col-span-2">Max</div>
                  <div className="col-span-1">Unit</div>
                  <div className="col-span-4">Resultaat (Tekst)</div>
                </div>

                {getActiveFields().map((field) => {
                  const item = currentSpecs[field.param] || {
                    min: "",
                    max: "",
                    unit: field.defaultUnit,
                    tolerance: "",
                  };

                  return (
                    <div
                      key={field.param}
                      className="grid grid-cols-12 gap-4 items-center py-3 px-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors rounded-lg group"
                    >
                      <div className="col-span-3 font-bold text-sm text-slate-700 flex flex-col">
                        <span>{field.label}</span>
                        <span className="text-[9px] text-slate-300 font-mono group-hover:text-orange-300 transition-colors">
                          {field.param}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <input
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 outline-none transition-all focus:ring-2 focus:ring-orange-100 placeholder:text-slate-300"
                          placeholder="Min"
                          value={item.min || ""}
                          onChange={(e) =>
                            handleSpecChange(field.param, "min", e.target.value)
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 outline-none transition-all focus:ring-2 focus:ring-orange-100 placeholder:text-slate-300"
                          placeholder="Max"
                          value={item.max || ""}
                          onChange={(e) =>
                            handleSpecChange(field.param, "max", e.target.value)
                          }
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm text-center focus:border-orange-500 outline-none placeholder:text-slate-300"
                          placeholder={field.defaultUnit}
                          value={item.unit || field.defaultUnit}
                          onChange={(e) =>
                            handleSpecChange(
                              field.param,
                              "unit",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 focus:border-orange-500 outline-none placeholder:text-slate-300"
                          placeholder="Auto (bv +/- 5mm)..."
                          value={item.tolerance || ""}
                          onChange={(e) =>
                            handleSpecChange(
                              field.param,
                              "tolerance",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
            <Info className="mx-auto mb-2 opacity-50" size={48} />
            <p className="font-bold text-lg">Maak een selectie</p>
            <p className="text-sm">
              Kies Categorie, Verbinding en Drukklasse om te beginnen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminToleranceView;
