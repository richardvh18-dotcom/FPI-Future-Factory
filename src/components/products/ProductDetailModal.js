import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Plus,
  Edit3,
  Loader2,
  Info,
  Image as ImageIcon,
  Upload,
  Search,
  Database,
  Zap,
  CheckCircle2,
  Ruler,
  AlertCircle,
  Tag,
} from "lucide-react";
import {
  doc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, appId, storage } from "../../config/firebase";

/**
 * ProductForm: Slaat alleen de CONFIGURATIE op.
 * De technische maten (B1, L, etc.) worden NIET opgeslagen in het productdocument,
 * zodat ze dynamisch blijven bij wijzigingen in de Matrix.
 */
const ProductForm = ({
  isOpen,
  onClose,
  editingProduct,
  user,
  onSaveSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [fetchingSpecs, setFetchingSpecs] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  const [settings, setSettings] = useState({
    connections: [],
    product_names: [],
    labels: [],
    extraCodes: [],
    pns: [],
    diameters: [],
  });
  const [range, setRange] = useState({});
  const [existingImages, setExistingImages] = useState([]);
  const [showGallery, setShowGallery] = useState(false);

  const initialState = {
    name: "",
    type: "-",
    angle: "-",
    radius: "-",
    connection: "-",
    pressure: "-",
    diameter: "-",
    bore: "-",
    label: "-",
    code: "-",
    extraCode: "-",
    imageUrl: "",
    // Deze velden gebruiken we alleen voor de preview in het formulier
    B1: "",
    B2: "",
    BA: "",
    A1: "",
    r1: "",
    alpha: "",
    L: "",
    Z: "",
    BD: "",
    W: "",
    TWcb: "",
    TWtb: "",
  };

  const [formData, setFormData] = useState(initialState);

  const showNotification = (message, type = "info") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 4000);
  };

  useEffect(() => {
    if (!isOpen) return;
    const fetchMatrixData = async () => {
      setDataLoading(true);
      try {
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
        if (configSnap.exists()) setSettings(configSnap.data());
        const rangeSnap = await getDoc(
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
        if (rangeSnap.exists()) setRange(rangeSnap.data());
        const imagesSnap = await getDocs(
          collection(db, "artifacts", appId, "public", "data", "product_images")
        );
        setExistingImages(
          imagesSnap.docs.map((doc) => ({
            url: doc.data().url,
            name: doc.data().name,
          }))
        );
      } catch (e) {
        showNotification("Fout bij laden matrix.", "error");
      } finally {
        setDataLoading(false);
      }
    };
    fetchMatrixData();
  }, [isOpen]);

  useEffect(() => {
    if (editingProduct && isOpen)
      setFormData({ ...initialState, ...editingProduct });
    else if (isOpen) setFormData(initialState);
  }, [editingProduct, isOpen]);

  // Dynamische Naamgeving
  useEffect(() => {
    if (editingProduct) return;
    let parts = [];
    if (formData.type !== "-") parts.push(formData.type);
    if (formData.type === "Elbow" && formData.angle !== "-")
      parts.push(formData.angle);
    if (formData.connection !== "-") parts.push(formData.connection);
    if (formData.diameter !== "-") parts.push(`ID${formData.diameter}`);
    if (formData.pressure !== "-") parts.push(`PN${formData.pressure}`);
    setFormData((prev) => ({ ...prev, name: parts.join(" ") }));
  }, [
    formData.type,
    formData.angle,
    formData.connection,
    formData.diameter,
    formData.pressure,
  ]);

  // Haal maatvoering op voor PREVIEW
  const fetchTechnicalSpecs = async () => {
    const connKey = formData.connection?.split("/")[0];
    if (!connKey || formData.pressure === "-" || formData.diameter === "-") {
      showNotification("Kies Mof, PN en ID.", "warning");
      return;
    }
    setFetchingSpecs(true);
    try {
      const pnStr = `PN${formData.pressure}`;
      const idStr = `ID${formData.diameter}`;
      const codeSuffix =
        formData.extraCode && formData.extraCode !== "-"
          ? `_${formData.extraCode.toUpperCase()}`
          : "";
      const bellId = `${connKey.toUpperCase()}_${pnStr}_${idStr}${codeSuffix}`;
      const fittingId = `${formData.type.toUpperCase()}_${connKey.toUpperCase()}_${pnStr}_${idStr}${codeSuffix}`;

      let specs = {};
      const bellCol =
        connKey.toLowerCase() === "cb" ? "cb_dimensions" : "tb_dimensions";
      const bSnap = await getDoc(
        doc(db, "artifacts", appId, "public", "data", bellCol, bellId)
      );
      if (bSnap.exists()) specs = { ...specs, ...bSnap.data() };

      const fSnap = await getDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "fitting_specs",
          fittingId
        )
      );
      if (fSnap.exists()) specs = { ...specs, ...fSnap.data() };

      setFormData((prev) => ({ ...prev, ...specs }));
      showNotification("Maten geladen (Preview).", "success");
    } catch (e) {
      showNotification("Fetch mislukt.", "error");
    } finally {
      setFetchingSpecs(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.label === "-")
      return showNotification("Kies een label.", "error");
    setLoading(true);
    try {
      // --- CRUCIAAL: Verwijder technische maten voor opslag ---
      const {
        B1,
        B2,
        BA,
        A1,
        r1,
        alpha,
        L,
        Z,
        BD,
        W,
        TWcb,
        TWtb,
        ...dataToPersist
      } = formData;

      const path = ["artifacts", appId, "public", "data", "products"];
      if (editingProduct) {
        await updateDoc(doc(db, ...path, editingProduct.id), {
          ...dataToPersist,
          updatedAt: serverTimestamp(),
          updatedBy: user?.email,
        });
      } else {
        const extraIdPart =
          formData.extraCode && formData.extraCode !== "-"
            ? `_${formData.extraCode.toUpperCase()}`
            : "";
        const newId = `${formData.type.toUpperCase()}_${
          formData.diameter
        }${extraIdPart}_${Date.now()}`;
        await setDoc(doc(db, ...path, newId), {
          ...dataToPersist,
          id: newId,
          status: "pending_approval",
          createdAt: serverTimestamp(),
          createdBy: user?.email,
        });
      }
      onSaveSuccess && onSaveSuccess();
      onClose();
    } catch (e) {
      showNotification("Fout: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-6xl rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] relative">
        {/* TOAST */}
        {toast.visible && (
          <div className="absolute top-4 left-0 right-0 z-[120] flex justify-center px-4 pointer-events-none animate-in slide-in-from-top-10 duration-300">
            <div
              className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border pointer-events-auto ${
                toast.type === "success"
                  ? "bg-emerald-600 text-white"
                  : "bg-blue-600 text-white"
              }`}
            >
              <CheckCircle2 size={18} />
              <p className="text-[11px] font-black uppercase tracking-wider">
                {toast.message}
              </p>
            </div>
          </div>
        )}

        <div className="bg-slate-900 p-8 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500 rounded-2xl text-slate-900">
              <Plus size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase italic">
                {editingProduct ? "Bewerken" : "Nieuw Product"}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Configuratie-gebaseerde Opslag
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

        {dataLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-slate-400">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="font-black uppercase text-xs">Data inladen...</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-8 lg:p-10 custom-scrollbar text-left"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* KOLOM 1: CONFIG */}
              <div className="space-y-6">
                <section>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">
                    Type
                  </label>
                  <select
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value,
                        diameter: "-",
                      })
                    }
                  >
                    <option value="-">- Type -</option>
                    {settings.product_names?.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </section>
                <div className="grid grid-cols-2 gap-4">
                  <section>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">
                      Mof
                    </label>
                    <select
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-3 text-xs font-bold outline-none"
                      value={formData.connection}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          connection: e.target.value,
                          pressure: "-",
                          diameter: "-",
                        })
                      }
                    >
                      <option value="-">-</option>
                      {settings.connections?.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </section>
                  <section>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">
                      PN
                    </label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-3 text-xs font-bold"
                      value={formData.pressure}
                      onChange={(e) =>
                        setFormData({ ...formData, pressure: e.target.value })
                      }
                    />
                  </section>
                </div>
                <section>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">
                    ID (Diameter)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold"
                    value={formData.diameter}
                    onChange={(e) =>
                      setFormData({ ...formData, diameter: e.target.value })
                    }
                  />
                </section>
                <button
                  type="button"
                  onClick={fetchTechnicalSpecs}
                  disabled={fetchingSpecs}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-3"
                >
                  {fetchingSpecs ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Zap size={16} />
                  )}{" "}
                  Haal maatvoering op (Preview)
                </button>
              </div>

              {/* KOLOM 2: PREVIEW MATEN (NIET PERSISTENT) */}
              <div className="space-y-6 bg-slate-50/50 p-6 rounded-[32px] border border-slate-100">
                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Ruler size={14} /> 2. Preview Maten (mm)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {["B1", "B2", "BA", "A1", "L", "Z", "BD", "W"].map(
                    (field) => (
                      <div key={field}>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">
                          {field}
                        </label>
                        <input
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-blue-400 outline-none"
                          value={formData[field]}
                          readOnly
                        />
                      </div>
                    )
                  )}
                </div>
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 mt-4 opacity-80 italic text-[9px] font-bold text-amber-800 text-center">
                  Let op: Deze maten worden dynamisch ingeladen in de catalogus.
                </div>
              </div>

              {/* KOLOM 3: MEDIA & LABEL */}
              <div className="space-y-6">
                <section className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
                  <label className="block text-[9px] font-black text-emerald-400 uppercase mb-2">
                    Systeem Naam
                  </label>
                  <div className="text-xl font-black italic tracking-tighter leading-tight">
                    {formData.name || "Wachten..."}
                  </div>
                </section>
                <section className="bg-emerald-50 p-6 rounded-[32px] border-2 border-emerald-100 shadow-inner">
                  <label className="block text-[10px] font-black text-emerald-800 uppercase mb-3">
                    Systeem Label (Verplicht)
                  </label>
                  <select
                    className="w-full bg-white border-2 rounded-2xl px-4 py-4 text-sm font-bold"
                    value={formData.label}
                    onChange={(e) =>
                      setFormData({ ...formData, label: e.target.value })
                    }
                    required
                  >
                    <option value="-">- Selecteer Label -</option>
                    {settings.labels?.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </section>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col items-center">
              <button
                type="submit"
                disabled={loading}
                className="w-full max-w-sm bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-xl flex items-center justify-center gap-3"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                <span>Product Opslaan</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProductForm;
