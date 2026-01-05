import React, { useState, useEffect, useMemo } from "react";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  limit,
} from "firebase/firestore";
import { db, appId, auth } from "../../config/firebase";
import {
  Save,
  X,
  Settings,
  Database,
  FileText,
  Search,
  Loader2,
  Ruler,
  Copy,
} from "lucide-react";

import {
  generateProductCode,
  validateProductData,
  formatProductForSave,
} from "../../utils/productHelpers";

const AdminNewProductView = ({ onFinished }) => {
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  // Data States
  const [configOptions, setConfigOptions] = useState({
    types: [],
    connections: [],
    pns: [],
  });
  const [matrixData, setMatrixData] = useState(null);
  const [templates, setTemplates] = useState({}); // NIEUW: Templates laden

  const [formData, setFormData] = useState({
    type: "",
    mofType: "",
    angle: "",
    radius: "",
    pressure: "",
    diameter: "",
    drilling: "",
    drawingNr: "",
    label: "",
    extraCode: "",
    productCode: "",
    stock: 0,
    price: 0,
    // Extra dimensie velden
    TW: "",
    TWtb: "",
    TWcb: "",
    BD: "",
    W: "",
    L: "",
    Z: "",
    B1: "",
  });

  const isFlange =
    formData.type &&
    ["Flange", "Blind Flange", "Stub Flange"].some((t) =>
      formData.type.includes(t)
    );
  const isElbow = formData.type && formData.type.includes("Elbow");
  const isTee = formData.type && formData.type.includes("Tee");

  // --- 0. LAAD CONFIG & MATRIX & TEMPLATES ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Config
        const configSnap = await getDoc(
          doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "settings",
            "general_config"
          )
        );
        if (configSnap.exists()) {
          const data = configSnap.data();
          setConfigOptions({
            types: data.product_names || [],
            connections: data.connections || [],
            pns: (data.pns || []).sort((a, b) => a - b),
          });
        }

        // Matrix
        const matrixSnap = await getDoc(
          doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "settings",
            "product_range"
          )
        );
        if (matrixSnap.exists()) {
          setMatrixData(matrixSnap.data());
        }

        // Templates (Blauwdrukken)
        const templateSnap = await getDoc(
          doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "settings",
            "product_templates"
          )
        );
        if (templateSnap.exists()) {
          setTemplates(templateSnap.data());
        }
      } catch (error) {
        console.error("Fout bij laden data:", error);
      }
    };
    fetchData();
  }, []);

  // --- 2. SLIMME DROPDOWN LOGICA (Matrix check) ---
  const availablePNs = useMemo(() => {
    if (!matrixData || !formData.type || !formData.mofType)
      return configOptions.pns;

    const connKey = formData.mofType.split("/")[0].toUpperCase().trim();
    const typeKey = formData.type;
    const pns = new Set();

    // Check zowel basis als socket varianten in de matrix
    const rangeForConn =
      matrixData[connKey] || matrixData[`${connKey}/${connKey}`]; // Fallback voor TB/TB keys

    if (rangeForConn) {
      Object.keys(rangeForConn).forEach((pn) => {
        const rangeForPn = rangeForConn[pn];
        if (
          (rangeForPn[typeKey] && rangeForPn[typeKey].length > 0) ||
          (rangeForPn[`${typeKey}_Socket`] &&
            rangeForPn[`${typeKey}_Socket`].length > 0)
        ) {
          pns.add(Number(pn));
        }
      });
    }
    return pns.size > 0
      ? Array.from(pns).sort((a, b) => a - b)
      : configOptions.pns;
  }, [matrixData, formData.type, formData.mofType, configOptions.pns]);

  const availableDiameters = useMemo(() => {
    if (
      !matrixData ||
      !formData.type ||
      !formData.mofType ||
      !formData.pressure
    )
      return [];

    const connKey = formData.mofType.split("/")[0].toUpperCase().trim();
    const pnKey = String(formData.pressure);
    const typeKey = formData.type;

    const rangeForConn =
      matrixData[connKey] || matrixData[`${connKey}/${connKey}`];
    const rangeForPn = rangeForConn?.[pnKey];

    if (!rangeForPn) return [];

    const diameters = new Set();
    // Check basis en socket/spiggot varianten
    [typeKey, `${typeKey}_Socket`, `${typeKey}_Spiggot`].forEach((key) => {
      if (rangeForPn[key])
        rangeForPn[key].forEach((d) => diameters.add(Number(d)));
    });

    return Array.from(diameters).sort((a, b) => a - b);
  }, [matrixData, formData.type, formData.mofType, formData.pressure]);

  // --- 3. AUTO CODE GENERATOR ---
  useEffect(() => {
    const newCode = generateProductCode(formData);
    if (newCode !== formData.productCode) {
      setFormData((prev) => ({ ...prev, productCode: newCode }));
    }
  }, [
    formData.type,
    formData.mofType,
    formData.angle,
    formData.pressure,
    formData.diameter,
    formData.drilling,
    formData.label,
  ]);

  // --- 4. DETAILS SYNCEN & TEMPLATE LOGICA ---
  const fetchDefaultData = async () => {
    if (!formData.diameter || !formData.pressure || !formData.type) return;

    setFetchingDetails(true);
    try {
      let updatedData = {};
      const numericDiameter = Number(formData.diameter);
      const numericPressure = Number(formData.pressure);

      // 1. Zoek bijpassende Blauwdruk (Template)
      const connSuffix = formData.mofType.toUpperCase().split("/")[0];
      let templateKey = `${formData.type}_${connSuffix}`;

      let activeTemplate = templates[templateKey];
      if (!activeTemplate)
        activeTemplate =
          templates[`${formData.type}_${connSuffix}/${connSuffix}`];

      console.log("Template gevonden:", templateKey, activeTemplate);

      // 2. Haal data op uit standard_fitting_specs
      const specQueryBase = query(
        collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "standard_fitting_specs"
        ),
        where("type", "==", formData.type),
        where("diameter", "==", numericDiameter),
        where("pressure", "==", numericPressure),
        limit(1)
      );
      const specQuerySocket = query(
        collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "standard_fitting_specs"
        ),
        where("type", "==", `${formData.type}_Socket`),
        where("diameter", "==", numericDiameter),
        where("pressure", "==", numericPressure),
        limit(1)
      );

      const [snapBase, snapSocket] = await Promise.all([
        getDocs(specQueryBase),
        getDocs(specQuerySocket),
      ]);

      if (!snapBase.empty) {
        const d = snapBase.docs[0].data();
        if (d.drawingNr) updatedData.drawingNr = d.drawingNr;
        if (d.radius) updatedData.radius = d.radius;
        if (d.angle) updatedData.angle = d.angle;
        // Neem basis maten over (L, Z)
        if (d.L) updatedData.L = d.L;
        if (d.Z) updatedData.Z = d.Z;
      }

      if (!snapSocket.empty) {
        const dSocket = snapSocket.docs[0].data();
        // Merge socket specifieke data (TW, BD, W)
        const { id, type, diameter, pressure, ...socketProps } = dSocket;
        updatedData = { ...updatedData, ...socketProps };
      }

      // 3. Flens Data
      if (isFlange) {
        const boreQuery = query(
          collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "bore_dimensions"
          ),
          where("dn", "==", numericDiameter),
          where("pn", "==", numericPressure),
          limit(1)
        );
        const boreSnap = await getDocs(boreQuery);
        if (!boreSnap.empty) {
          const b = boreSnap.docs[0].data();
          updatedData.drilling = `PCD ${b.pcd} / ${b.holes} x M${
            b.thread || b.bolt
          }`;
        }
      }

      setFormData((prev) => ({ ...prev, ...updatedData }));
    } catch (err) {
      console.error("Fout bij ophalen details:", err);
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const validation = validateProductData(formData);
    if (!validation.isValid) {
      alert("Let op:\n" + validation.errors.join("\n"));
      setLoading(false);
      return;
    }

    const productToSave = formatProductForSave(formData);

    try {
      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "products",
          productToSave.id
        ),
        productToSave
      );
      alert("✅ Product succesvol aangemaakt!");
      onFinished();
    } catch (err) {
      alert("Fout bij opslaan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle =
    "w-full p-2 bg-white border border-slate-300 rounded-sm text-sm outline-none focus:border-blue-600 appearance-none font-medium";
  const labelStyle =
    "block text-[11px] font-black text-slate-500 uppercase mb-1 tracking-tight";

  // Render extra velden gebaseerd op data
  const renderExtraFields = () => {
    // Welke velden hebben we gevuld uit de specs?
    const extraKeys = ["L", "Z", "BD", "W", "TWcb", "TWtb", "B1"];
    // Filter keys die data hebben
    const activeKeys = extraKeys.filter((k) => formData[k]);

    if (activeKeys.length === 0) return null;

    return (
      <div className="col-span-1 md:col-span-3 bg-blue-50 border border-blue-100 p-4 rounded-xl mt-4">
        <h4 className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center gap-2">
          <Ruler size={14} /> Technische Specificaties (Auto-filled)
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {activeKeys.map((key) => (
            <div key={key}>
              <label className="block text-[10px] font-bold text-blue-400 uppercase">
                {key}
              </label>
              <input
                className="w-full bg-white border border-blue-200 rounded p-1.5 text-xs font-mono font-bold text-blue-800"
                value={formData[key]}
                onChange={(e) =>
                  setFormData({ ...formData, [key]: e.target.value })
                }
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-5xl rounded-[2rem] shadow-2xl border border-white/50 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Database className="text-blue-600" />
              Nieuw Product
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              Toevoegen aan hoofddatabase
            </p>
          </div>
          <button
            onClick={onFinished}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* KOLOM 1 */}
            <div className="bg-white border border-slate-200 p-6 space-y-4 shadow-sm rounded-xl">
              <div className="text-[10px] font-black text-blue-600 uppercase border-b pb-2 mb-4 tracking-widest flex items-center gap-2">
                <Database size={14} /> Specification Source
              </div>

              <div>
                <label className={labelStyle}>Product Type</label>
                <select
                  required
                  className={inputStyle}
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value,
                      diameter: "",
                    })
                  }
                >
                  <option value="">-- Choose Type --</option>
                  {configOptions.types
                    .filter(
                      (t) => !t.includes("_Socket") && !t.includes("_Spiggot")
                    )
                    .map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className={labelStyle}>Mof Type</label>
                <select
                  required
                  className={inputStyle}
                  value={formData.mofType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mofType: e.target.value,
                      diameter: "",
                    })
                  }
                >
                  <option value="">-- Choose Mof --</option>
                  {configOptions.connections.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelStyle}>Pressure (PN)</label>
                <select
                  required
                  className={inputStyle}
                  value={formData.pressure}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pressure: e.target.value,
                      diameter: "",
                    })
                  }
                >
                  <option value="">-- Choose PN --</option>
                  {availablePNs.map((pn) => (
                    <option key={pn} value={pn}>
                      PN {pn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* KOLOM 2 */}
            <div className="bg-white border border-slate-200 p-6 space-y-4 shadow-sm rounded-xl">
              <div className="text-[10px] font-black text-blue-600 uppercase border-b pb-2 mb-4 tracking-widest flex items-center gap-2">
                <Search size={14} /> Validated Options
              </div>

              <div>
                <label className={labelStyle}>Available Diameters</label>
                <div className="relative">
                  <select
                    required
                    className={`${inputStyle} ${
                      availableDiameters.length > 0
                        ? "border-blue-500 bg-blue-50/20"
                        : ""
                    }`}
                    value={formData.diameter}
                    onChange={(e) =>
                      setFormData({ ...formData, diameter: e.target.value })
                    }
                    disabled={availableDiameters.length === 0}
                  >
                    <option value="">
                      {fetchingDetails
                        ? "Checking Matrix..."
                        : availableDiameters.length > 0
                        ? "-- Select DN --"
                        : "Not in Matrix"}
                    </option>
                    {availableDiameters.map((d) => (
                      <option key={d} value={d}>
                        DN {d} mm
                      </option>
                    ))}
                  </select>
                  {fetchingDetails && (
                    <Loader2
                      size={16}
                      className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-500"
                    />
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={fetchDefaultData}
                disabled={fetchingDetails || !formData.diameter}
                className="w-full bg-slate-800 text-white py-3 text-[10px] font-black uppercase hover:bg-blue-600 transition-all flex items-center justify-center gap-2 rounded-lg"
              >
                {fetchingDetails ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Database size={14} />
                )}{" "}
                Sync Details
              </button>

              {(isElbow || isTee) && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className={labelStyle}>Angle</label>
                    <select
                      className={inputStyle}
                      value={formData.angle}
                      onChange={(e) =>
                        setFormData({ ...formData, angle: e.target.value })
                      }
                    >
                      <option value="">-- Angle --</option>
                      <option value="90">90°</option>
                      <option value="45">45°</option>
                      <option value="30">30°</option>
                      <option value="22.5">22.5°</option>
                      <option value="11.25">11.25°</option>
                    </select>
                  </div>
                  {isElbow && (
                    <div>
                      <label className={labelStyle}>Radius</label>
                      <select
                        className={inputStyle}
                        value={formData.radius}
                        onChange={(e) =>
                          setFormData({ ...formData, radius: e.target.value })
                        }
                      >
                        <option value="">-- R --</option>
                        <option value="1.5D">1.5D</option>
                        <option value="3D">3D</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
              {isFlange && (
                <div className="pt-2">
                  <label className={labelStyle + " text-blue-600"}>
                    Bore Dimensions (Ref)
                  </label>
                  <div className="p-2 bg-blue-50 border border-blue-100 text-[11px] font-mono text-blue-800 rounded-sm min-h-[36px] flex items-center">
                    {formData.drilling || "No Bore Data Loaded"}
                  </div>
                </div>
              )}
            </div>

            {/* KOLOM 3 */}
            <div className="bg-white border border-slate-200 p-6 space-y-4 shadow-sm rounded-xl">
              <div className="text-[10px] font-black text-blue-600 uppercase border-b pb-2 mb-4 tracking-widest flex items-center gap-2">
                <FileText size={14} /> Final Registration
              </div>
              <div>
                <label className={labelStyle}>Drawing Reference</label>
                <input
                  className={inputStyle}
                  value={formData.drawingNr}
                  onChange={(e) =>
                    setFormData({ ...formData, drawingNr: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className={labelStyle}>Label</label>
                <select
                  className={inputStyle}
                  value={formData.label}
                  onChange={(e) =>
                    setFormData({ ...formData, label: e.target.value })
                  }
                >
                  <option value="">-- Select Label --</option>
                  <option value="Wavistrong Standard">
                    Wavistrong Standard
                  </option>
                  <option value="Wavistrong-H">Wavistrong-H</option>
                </select>
              </div>
              <div>
                <label className={labelStyle + " text-orange-600"}>
                  Final Product Code
                </label>
                <div className="relative">
                  <input
                    readOnly
                    className="w-full bg-orange-50 border border-orange-200 rounded-lg px-3 py-3 text-sm font-black text-orange-800 outline-none"
                    placeholder="ID..."
                    value={formData.productCode}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>Stock</label>
                  <input
                    type="number"
                    className={inputStyle}
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelStyle}>Price</label>
                  <input
                    type="number"
                    className={inputStyle}
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-blue-700 hover:bg-blue-800 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50"
              >
                <Save size={18} /> Save to Main Database
              </button>
            </div>

            {/* EXTRA TECH SPECS ROW */}
            {renderExtraFields()}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminNewProductView;
