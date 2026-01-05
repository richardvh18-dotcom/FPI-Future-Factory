import React, { useState, useEffect } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db, appId } from "../../config/firebase";
import {
  Save,
  X,
  Settings,
  Database,
  FileText,
  Search,
  Loader2,
  Ruler,
} from "lucide-react";

// Importeer de helpers
import {
  generateProductCode,
  validateProductData,
  formatProductForSave,
} from "../../utils/productHelpers";

const AdminNewProductView = ({ onFinished }) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // State voor opties uit database
  const [configOptions, setConfigOptions] = useState({
    types: [],
    connections: [],
    pns: [],
  });

  const [availableDiameters, setAvailableDiameters] = useState([]);

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
  });

  const isFlange =
    formData.type &&
    ["Flange", "Blind Flange", "Stub Flange"].some((t) =>
      formData.type.includes(t)
    );
  const isElbow = formData.type && formData.type.includes("Elbow");
  const isTee = formData.type && formData.type.includes("Tee");

  // --- 1. CONFIGURATIE LADEN (Opties) ---
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "settings",
          "general_config"
        );
        const snapshot = await getDoc(configRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setConfigOptions({
            types: data.product_names || [],
            connections: data.connections || [],
            pns: (data.pns || []).sort((a, b) => a - b),
          });
        }
      } catch (error) {
        console.error("Config laadfout:", error);
      }
    };
    fetchConfig();
  }, []);

  // --- 2. DIAMETERS UIT MATRIX HALEN ---
  useEffect(() => {
    const fetchValidDiameters = async () => {
      if (!formData.type || !formData.mofType || !formData.pressure) {
        setAvailableDiameters([]);
        return;
      }

      setFetching(true);
      try {
        const rangeRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "settings",
          "product_range"
        );
        const docSnap = await getDoc(rangeRef);

        if (docSnap.exists()) {
          const matrix = docSnap.data();
          const connKey = formData.mofType.split("/")[0].toUpperCase().trim();
          const pnKey = String(formData.pressure);
          const typeKey = formData.type;

          // Zoek op meerdere plekken (Base, Socket, Spiggot)
          const baseRange = matrix?.[connKey]?.[pnKey]?.[typeKey] || [];
          const socketRange =
            matrix?.[connKey]?.[pnKey]?.[`${typeKey}_Socket`] || [];

          const allDiameters = [...new Set([...baseRange, ...socketRange])];

          if (allDiameters.length > 0) {
            setAvailableDiameters(allDiameters.sort((a, b) => a - b));
          } else {
            setAvailableDiameters([]);
          }
        }
      } catch (err) {
        console.error("Matrix fout:", err);
      } finally {
        setFetching(false);
      }
    };

    fetchValidDiameters();
  }, [formData.type, formData.mofType, formData.pressure]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validatie via Helper
    const validation = validateProductData(formData);
    if (!validation.isValid) {
      alert("Let op:\n" + validation.errors.join("\n"));
      setLoading(false);
      return;
    }

    // Formatteren via Helper
    const dataToSave = formatProductForSave(formData);

    try {
      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "products",
          dataToSave.id
        ),
        dataToSave
      );

      alert("✅ Product succesvol toegevoegd aan de hoofddatabase!");
      if (onFinished) onFinished();
    } catch (error) {
      console.error("Error saving:", error);
      alert("Fout bij opslaan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle =
    "w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-300";
  const labelStyle =
    "block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl border border-white/50 overflow-hidden flex flex-col max-h-[90vh]">
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sectie 1: Basis Info */}
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className={labelStyle}>
                  <Settings size={14} className="inline mr-2 mb-0.5" />
                  Type Fitting
                </label>
                <select
                  className={inputStyle}
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  required
                >
                  <option value="">-- Selecteer Type --</option>
                  {/* Filter socket types eruit voor de gebruiker */}
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

              {/* Conditional Fields based on Type */}
              {(isElbow || isTee) && (
                <>
                  <div>
                    <label className={labelStyle}>Mof Type</label>
                    <select
                      className={inputStyle}
                      value={formData.mofType}
                      onChange={(e) =>
                        setFormData({ ...formData, mofType: e.target.value })
                      }
                    >
                      <option value="">-- Select --</option>
                      {configOptions.connections.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Hoek (Graden)</label>
                    <select
                      className={inputStyle}
                      value={formData.angle}
                      onChange={(e) =>
                        setFormData({ ...formData, angle: e.target.value })
                      }
                    >
                      <option value="">-- Select --</option>
                      <option value="90">90°</option>
                      <option value="45">45°</option>
                      <option value="30">30°</option>
                      <option value="22.5">22.5°</option>
                      <option value="11.25">11.25°</option>
                    </select>
                  </div>
                </>
              )}

              {isElbow && (
                <div className="col-span-2">
                  <label className={labelStyle}>Radius (R)</label>
                  <select
                    className={inputStyle}
                    value={formData.radius}
                    onChange={(e) =>
                      setFormData({ ...formData, radius: e.target.value })
                    }
                  >
                    <option value="">-- Select --</option>
                    <option value="1.5D">1.5D</option>
                    <option value="3D">3D</option>
                  </select>
                </div>
              )}
            </div>

            <div className="h-px bg-slate-100 my-4"></div>

            {/* Sectie 2: Specificaties */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className={labelStyle}>
                  <Ruler size={14} className="inline mr-2 mb-0.5" />
                  Drukklasse (PN)
                </label>
                <select
                  className={inputStyle}
                  value={formData.pressure}
                  onChange={(e) =>
                    setFormData({ ...formData, pressure: e.target.value })
                  }
                  required
                >
                  <option value="">-- Select PN --</option>
                  {configOptions.pns.map((pn) => (
                    <option key={pn} value={pn}>
                      PN {pn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelStyle}>
                  <Ruler size={14} className="inline mr-2 mb-0.5" />
                  Diameter (DN)
                </label>
                <div className="relative">
                  <select
                    className={inputStyle}
                    value={formData.diameter}
                    onChange={(e) =>
                      setFormData({ ...formData, diameter: e.target.value })
                    }
                    disabled={!formData.pressure || fetching}
                    required
                  >
                    <option value="">
                      {fetching
                        ? "Laden..."
                        : availableDiameters.length > 0
                        ? "-- Select DN --"
                        : "Geen opties"}
                    </option>
                    {availableDiameters.map((d) => (
                      <option key={d} value={d}>
                        DN {d}
                      </option>
                    ))}
                  </select>
                  {fetching && (
                    <Loader2
                      size={16}
                      className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-500"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100 my-4"></div>

            {/* Sectie 3: Meta Data */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className={labelStyle}>
                  <FileText size={14} className="inline mr-2 mb-0.5" />
                  Tekening Nr.
                </label>
                <input
                  type="text"
                  className={inputStyle}
                  placeholder="bv. 3844-001"
                  value={formData.drawingNr}
                  onChange={(e) =>
                    setFormData({ ...formData, drawingNr: e.target.value })
                  }
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

              <div className="col-span-2">
                <label className={`${labelStyle} text-blue-600`}>
                  <Search size={14} className="inline mr-2 mb-0.5" />
                  Gegenereerde Product Code
                </label>
                <div className="relative">
                  <input
                    readOnly
                    className="w-full bg-blue-50/50 border-2 border-blue-100 rounded-xl px-4 py-4 text-sm font-black text-blue-800 outline-none"
                    placeholder="Wordt automatisch gegenereerd..."
                    value={formData.productCode}
                  />
                </div>
              </div>

              <div>
                <label className={labelStyle}>Voorraad</label>
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
                <label className={labelStyle}>Prijs (€)</label>
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
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-200 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              {loading ? "Opslaan..." : "Opslaan in Database"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminNewProductView;
