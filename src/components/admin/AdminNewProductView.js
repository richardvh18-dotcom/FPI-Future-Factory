import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Save,
  Loader2,
  Package,
  Ruler,
  Settings,
  Tag,
  AlertCircle,
  ChevronRight,
  FileText,
  Plus,
  X,
  Upload,
  Database,
  Fingerprint,
  Paperclip,
  UserCheck,
  GraduationCap,
  Search,
  Target,
  Zap,
  ChevronDown,
  Image as ImageIcon,
  Grid,
} from "lucide-react";
import { db } from "../../config/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";

/**
 * AdminNewProductView V2.6: Engineering Flow met Image Library
 * - Nieuw: Afbeelding gallerij & upload onder Registratie.
 * - Nieuw: PDF opslagpad naar /public/data/library_drawings.
 * - Fix: Layout stabiliteit behouden.
 */
const AdminNewProductView = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [specsVisible, setSpecsVisible] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);

  const targetAppId = "fittings-app-v1";

  // Data van de server
  const [library, setLibrary] = useState({
    connections: [],
    product_names: [],
    labels: [],
    pns: [],
    diameters: [],
    angles: [],
    borings: [],
    extraCodes: [],
  });
  const [engineers, setEngineers] = useState([]);
  const [productRange, setProductRange] = useState({});
  const [existingImages, setExistingImages] = useState([]);

  // Formulier State
  const [formData, setFormData] = useState({
    extraCode: "-",
    type: "-",
    angle: "-",
    radius: "-",
    drilling: "-",
    connection: "-",
    pressure: "-",
    diameter: "-",
    name: "",
    articleCode: "",
    drawing: "",
    manualDrawing: "",
    description: "",
    label: "-",
    assignedEngineer: "",
    imageUrl: "",
    specs: {},
  });

  const [pdfs, setPdfs] = useState([{ id: Date.now(), name: "", url: "" }]);
  const [specsStatus, setSpecsStatus] = useState("idle");
  const [newImageLabel, setNewImageLabel] = useState("");

  // --- 1. DATA LADEN ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configSnap, rangeSnap, usersSnap, imagesSnap] =
          await Promise.all([
            getDoc(
              doc(
                db,
                "artifacts",
                targetAppId,
                "public",
                "data",
                "settings",
                "general_config"
              )
            ),
            getDoc(
              doc(
                db,
                "artifacts",
                targetAppId,
                "public",
                "data",
                "settings",
                "product_range"
              )
            ),
            getDocs(
              collection(
                db,
                "artifacts",
                targetAppId,
                "public",
                "data",
                "user_roles"
              )
            ),
            getDocs(
              collection(
                db,
                "artifacts",
                targetAppId,
                "public",
                "data",
                "product_images"
              )
            ),
          ]);

        if (configSnap.exists()) {
          const data = configSnap.data();
          setLibrary({
            connections: data.connections || [],
            product_names: data.product_names || [],
            labels: data.labels || [],
            pns: data.pns || [],
            diameters: data.diameters || [],
            angles: data.angles || [],
            borings: data.borings || data.extraCodes || [],
            extraCodes: data.extraCodes || [],
          });
        }
        if (rangeSnap.exists()) setProductRange(rangeSnap.data());

        const engList = usersSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.role === "engineer" || u.role === "admin");
        setEngineers(engList);

        setExistingImages(
          imagesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
      } catch (err) {
        console.error("Data laden mislukt:", err);
      } finally {
        setConfigLoading(false);
      }
    };
    fetchData();
  }, []);

  // Naamgeving Logica
  useEffect(() => {
    let parts = [];
    if (formData.type !== "-") parts.push(formData.type);
    if (formData.type === "Elbow" && formData.angle !== "-")
      parts.push(`${formData.angle}°`);
    if (formData.radius !== "-" && formData.radius !== "")
      parts.push(formData.radius);
    if (formData.drilling !== "-") parts.push(formData.drilling);
    if (formData.connection !== "-") parts.push(formData.connection);
    if (formData.diameter !== "-") parts.push(`ID${formData.diameter}`);
    if (formData.pressure !== "-") parts.push(`PN${formData.pressure}`);
    if (formData.extraCode !== "-" && formData.extraCode !== "")
      parts.push(`(${formData.extraCode})`);
    setFormData((prev) => ({ ...prev, name: parts.join(" ") }));
  }, [
    formData.type,
    formData.angle,
    formData.radius,
    formData.drilling,
    formData.connection,
    formData.diameter,
    formData.pressure,
    formData.extraCode,
  ]);

  const availableIDs = useMemo(() => {
    if (formData.connection === "-" || formData.pressure === "-") return [];
    const connKey = formData.connection.split("/")[0].toUpperCase();
    const pnKey = String(formData.pressure);
    const matrix =
      productRange[connKey] || productRange[`${connKey}/${connKey}`];
    if (matrix && matrix[pnKey]) {
      return (
        matrix[pnKey].Algemeen ||
        matrix[pnKey][formData.type] ||
        library.diameters ||
        []
      );
    }
    return [];
  }, [
    formData.connection,
    formData.pressure,
    formData.type,
    productRange,
    library.diameters,
  ]);

  // --- HANDMATIGE DATA FETCH ---
  const handleFetchSpecs = async () => {
    if (
      formData.type === "-" ||
      formData.connection === "-" ||
      formData.pressure === "-" ||
      formData.diameter === "-"
    )
      return;
    setSpecsStatus("fetching");
    try {
      const connPrefix = formData.connection.split("/")[0].toUpperCase();
      const pnPart = `PN${formData.pressure}`;
      const idPart = `ID${formData.diameter}`;
      const bellCol =
        connPrefix.toLowerCase() === "cb" ? "cb_dimensions" : "fitting_specs";
      const bellId = `${connPrefix}_${pnPart}_${idPart}`;
      const fitId = `${formData.type.toUpperCase()}_${connPrefix}_${pnPart}_${idPart}`;

      const [bSnap, fSnap] = await Promise.all([
        getDoc(
          doc(db, "artifacts", targetAppId, "public", "data", bellCol, bellId)
        ),
        getDoc(
          doc(
            db,
            "artifacts",
            targetAppId,
            "public",
            "data",
            "standard_fitting_specs",
            fitId
          )
        ),
      ]);

      let mergedSpecs = {};
      if (bSnap.exists()) mergedSpecs = { ...mergedSpecs, ...bSnap.data() };
      if (fSnap.exists()) mergedSpecs = { ...mergedSpecs, ...fSnap.data() };

      const techSpecs = Object.fromEntries(
        Object.entries(mergedSpecs).filter(
          ([k]) => !["id", "pressure", "diameter", "type"].includes(k)
        )
      );

      setFormData((prev) => ({ ...prev, specs: techSpecs }));
      setSpecsStatus(Object.keys(techSpecs).length > 0 ? "found" : "not_found");
      setSpecsVisible(true);
    } catch (err) {
      setSpecsStatus("not_found");
    }
  };

  // --- OPSLAAN LOGICA ---
  const handleSaveConcept = async (e) => {
    e.preventDefault();
    if (formData.label === "-") return alert("Systeem Label is verplicht.");
    setLoading(true);
    try {
      // 1. Sla PDF metadata op in library_drawings indien gewenst
      for (const pdf of pdfs.filter((p) => p.url)) {
        const drawingId = pdf.name.replace(/\s+/g, "_") || `DRAW_${Date.now()}`;
        await setDoc(
          doc(
            db,
            "artifacts",
            targetAppId,
            "public",
            "data",
            "library_drawings",
            drawingId
          ),
          {
            ...pdf,
            associatedProduct: formData.name,
            timestamp: serverTimestamp(),
          }
        );
      }

      // 2. Sla het product op
      const productData = {
        ...formData,
        sourcePdfs: pdfs.filter((p) => p.name || p.url),
        status: "pending_approval",
        isConcept: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await addDoc(
        collection(db, "artifacts", targetAppId, "public", "data", "products"),
        productData
      );

      alert("Product en documentatie succesvol opgeslagen.");
      onBack();
    } catch (err) {
      alert("Fout bij opslaan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- IMAGE UPLOAD SIMULATIE & OPSLAG ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !newImageLabel)
      return alert("Voer eerst een naam in voor de afbeelding.");

    // In deze omgeving simuleren we de upload en slaan metadata op
    // In productie zou hier Firebase Storage logica staan
    const dummyUrl =
      "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400";

    try {
      const imgRef = doc(
        collection(
          db,
          "artifacts",
          targetAppId,
          "public",
          "data",
          "product_images"
        )
      );
      await setDoc(imgRef, {
        name: newImageLabel,
        url: dummyUrl,
        type: formData.type,
        createdAt: serverTimestamp(),
      });

      setFormData((prev) => ({ ...prev, imageUrl: dummyUrl }));
      setNewImageLabel("");
      setShowImageGallery(false);
      // Refresh gallery
      const snap = await getDocs(
        collection(
          db,
          "artifacts",
          targetAppId,
          "public",
          "data",
          "product_images"
        )
      );
      setExistingImages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      alert("Fout bij registreren afbeelding.");
    }
  };

  const addPdfRow = () =>
    setPdfs([...pdfs, { id: Date.now(), name: "", url: "" }]);
  const removePdfRow = (id) => setPdfs(pdfs.filter((p) => p.id !== id));

  if (configLoading)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );

  const isElbow = formData.type === "Elbow";
  const isFlange =
    formData.type.toLowerCase().includes("flange") ||
    formData.type.toLowerCase().includes("flens");
  const canFetch =
    formData.connection !== "-" &&
    formData.pressure !== "-" &&
    formData.diameter !== "-";

  return (
    <div className="w-full max-w-6xl mx-auto h-full flex flex-col overflow-hidden text-left animate-in fade-in duration-500 px-4">
      {/* Header */}
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 flex justify-between items-center shrink-0 mb-6 mt-4">
        <div className="flex items-center gap-6">
          <button
            onClick={onBack}
            className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-400 transition-all text-left"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
              Product <span className="text-blue-600">Configurator</span>
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic text-left">
              Gevalideerde Invoer V2.6
            </p>
          </div>
        </div>
        <div className="bg-blue-50 text-blue-600 p-4 rounded-3xl">
          <GraduationCap size={32} />
        </div>
      </div>

      <div className="flex-1 overflow-y-scroll custom-scrollbar pb-20 pr-2">
        <form
          onSubmit={handleSaveConcept}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
        >
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-10 rounded-[45px] shadow-xl border border-slate-100 space-y-10">
              {/* STAP 1: BASIS CONFIGURATIE */}
              <section className="space-y-6">
                <h3 className="text-xs font-black uppercase text-blue-500 tracking-[0.2em] flex items-center gap-2 italic text-left">
                  <Settings size={16} /> 1. Basis Configuratie
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 text-left">
                      Extra Code
                    </label>
                    <select
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-blue-500"
                      value={formData.extraCode}
                      onChange={(e) =>
                        setFormData({ ...formData, extraCode: e.target.value })
                      }
                    >
                      <option value="-">- Geen Code -</option>
                      {library.extraCodes?.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 text-left">
                      Product Type
                    </label>
                    <select
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-blue-500"
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                    >
                      <option value="-">- Selecteer Type -</option>
                      {library.product_names
                        ?.filter((n) => n !== "Algemeen")
                        .map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                    </select>
                  </div>

                  {isElbow && (
                    <div className="animate-in slide-in-from-left duration-300">
                      <label className="block text-[10px] font-black text-blue-600 uppercase mb-2 ml-1">
                        Hoek (Graden)
                      </label>
                      <select
                        className="w-full bg-blue-50 border-2 border-blue-100 rounded-2xl px-6 py-4 text-sm font-black"
                        value={formData.angle}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            angle: e.target.value,
                            radius: e.target.value === "90" ? "-" : "1.5D",
                          })
                        }
                      >
                        <option value="-">- Kies Hoek -</option>
                        {library.angles?.map((angle) => (
                          <option key={angle} value={angle}>
                            {angle}°
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {isElbow && formData.angle === "90" && (
                    <div className="animate-in zoom-in duration-300 col-span-2">
                      <label className="block text-[10px] font-black text-orange-600 uppercase mb-3 ml-1">
                        Radius (90°)
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        {["1.0D", "1.5D"].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, radius: r })
                            }
                            className={`py-4 rounded-2xl text-sm font-black uppercase transition-all border-2 ${
                              formData.radius === r
                                ? "bg-orange-500 border-orange-500 text-white shadow-lg"
                                : "bg-slate-50 border-slate-100 text-slate-400 hover:border-orange-200"
                            }`}
                          >
                            {r} Radius
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isFlange && (
                    <div className="animate-in slide-in-from-left duration-300">
                      <label className="block text-[10px] font-black text-purple-600 uppercase mb-2 ml-1">
                        Drilling / Boring
                      </label>
                      <select
                        className="w-full bg-purple-50 border-2 border-purple-100 rounded-2xl px-6 py-4 text-sm font-black"
                        value={formData.drilling}
                        onChange={(e) =>
                          setFormData({ ...formData, drilling: e.target.value })
                        }
                      >
                        <option value="-">- Kies Boring -</option>
                        {library.borings?.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </section>

              {/* STAP 2: MATRIX PARAMETERS */}
              <section className="space-y-6 pt-10 border-t border-slate-50">
                <h3 className="text-xs font-black uppercase text-emerald-500 tracking-[0.2em] flex items-center gap-2 italic text-left">
                  <Database size={16} /> 2. Matrix Parameters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
                      Mof Verbinding
                    </label>
                    <select
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-500"
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
                      <option value="-">- Mof -</option>
                      {library.connections?.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
                      Druk (PN)
                    </label>
                    <select
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-500"
                      value={formData.pressure}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pressure: e.target.value,
                          diameter: "-",
                        })
                      }
                    >
                      <option value="-">- PN -</option>
                      {library.pns?.map((pn) => (
                        <option key={pn} value={pn}>
                          PN{pn}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
                      Diameter (ID)
                    </label>
                    <select
                      disabled={formData.pressure === "-"}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-500 disabled:opacity-30"
                      value={formData.diameter}
                      onChange={(e) =>
                        setFormData({ ...formData, diameter: e.target.value })
                      }
                    >
                      <option value="-">- ID -</option>
                      {availableIDs.map((id) => (
                        <option key={id} value={id}>
                          ID{id}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    disabled={!canFetch || loading}
                    onClick={handleFetchSpecs}
                    className={`w-full py-6 rounded-[28px] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl ${
                      canFetch
                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
                        : "bg-slate-100 text-slate-300 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {specsStatus === "fetching" ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Zap size={20} />
                    )}
                    Haal Matrix Gegevens Op
                  </button>
                </div>

                {specsVisible && (
                  <div className="bg-slate-50 rounded-3xl p-8 border-2 border-blue-100 space-y-6 animate-in slide-in-from-top-4">
                    <div className="flex justify-between items-center text-left">
                      <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 italic">
                        <Ruler size={14} /> Gekoppelde Technische Maten (mm)
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                      {Object.keys(formData.specs).length > 0 ? (
                        Object.entries(formData.specs).map(([key, val]) => (
                          <div key={key}>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">
                              {key}
                            </label>
                            <input
                              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-black text-slate-700 focus:border-blue-500 outline-none"
                              value={val}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  specs: {
                                    ...formData.specs,
                                    [key]: e.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full py-6 text-center text-slate-400 italic text-xs">
                          Geen maten gevonden.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* STAP 3: REGISTRATIE & AFBEELDING */}
              <section className="space-y-6 pt-10 border-t border-slate-50">
                <h3 className="text-xs font-black uppercase text-purple-500 tracking-[0.2em] flex items-center gap-2 italic text-left">
                  <FileText size={16} /> 3. Registratie & Bron
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
                      Artikelcode (ERP)
                    </label>
                    <input
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-purple-500 font-mono"
                      placeholder="bijv. ART-12345"
                      value={formData.articleCode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          articleCode: e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 text-left">
                      Tekening Nummer
                    </label>
                    <input
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-purple-500"
                      placeholder="bijv. DRAW-800-01"
                      value={formData.manualDrawing}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          manualDrawing: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* AFBEELDING SELECTIE & UPLOAD */}
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                  <div className="flex justify-between items-center text-left">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 italic">
                      <ImageIcon size={14} /> Product Afbeelding
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowImageGallery(!showImageGallery)}
                      className="text-[9px] font-black text-purple-600 bg-purple-50 px-4 py-2 rounded-xl border border-purple-100 hover:bg-purple-100 transition-all flex items-center gap-2"
                    >
                      <Grid size={12} />{" "}
                      {showImageGallery ? "Verberg Gallerij" : "Open Gallerij"}
                    </button>
                  </div>

                  {showImageGallery ? (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {existingImages.map((img) => (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, imageUrl: img.url });
                              setShowImageGallery(false);
                            }}
                            className={`group relative aspect-square bg-white rounded-xl border-2 overflow-hidden transition-all ${
                              formData.imageUrl === img.url
                                ? "border-emerald-500 shadow-md scale-95"
                                : "border-slate-100 hover:border-blue-300"
                            }`}
                          >
                            <img
                              src={img.url}
                              className="w-full h-full object-cover"
                              alt={img.name}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[8px] font-black text-white uppercase text-center px-1">
                                {img.name}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="pt-4 border-t border-slate-200">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-3 text-left italic">
                          Of upload een nieuwe afbeelding:
                        </p>
                        <div className="flex gap-2">
                          <input
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none"
                            placeholder="Label (bijv. Elbow 90 TB)..."
                            value={newImageLabel}
                            onChange={(e) => setNewImageLabel(e.target.value)}
                          />
                          <label
                            className={`cursor-pointer px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 transition-all ${
                              newImageLabel
                                ? "bg-slate-900 text-white hover:bg-emerald-600"
                                : "bg-slate-100 text-slate-300 cursor-not-allowed"
                            }`}
                          >
                            <Upload size={12} /> Selecteer Bestand
                            <input
                              type="file"
                              className="hidden"
                              disabled={!newImageLabel}
                              onChange={handleImageUpload}
                              accept="image/*"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 text-left">
                      {formData.imageUrl ? (
                        <div className="w-16 h-16 rounded-xl border-2 border-emerald-500 overflow-hidden shadow-sm shrink-0">
                          <img
                            src={formData.imageUrl}
                            className="w-full h-full object-cover"
                            alt="Geselecteerd"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 shrink-0">
                          <ImageIcon size={24} />
                        </div>
                      )}
                      <p className="text-[10px] font-bold text-slate-500 italic uppercase">
                        {formData.imageUrl
                          ? "Afbeelding gekoppeld uit database."
                          : "Geen afbeelding geselecteerd. Gebruik de gallerij knop."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-4 text-left">
                  <div className="flex justify-between items-center text-left">
                    <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-widest flex items-center gap-2 italic">
                      <Paperclip size={14} /> Bronvermelding (Opslag:
                      /library_drawings)
                    </h4>
                    <button
                      type="button"
                      onClick={addPdfRow}
                      className="text-[9px] font-black text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 flex items-center gap-1 hover:bg-amber-100 transition-all"
                    >
                      + PDF
                    </button>
                  </div>
                  <div className="space-y-3 text-left">
                    {pdfs.map((pdf, idx) => (
                      <div
                        key={pdf.id}
                        className="flex gap-3 animate-in slide-in-from-right-4 duration-300"
                      >
                        <input
                          className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-bold outline-none focus:border-amber-500"
                          placeholder="Naam bron (bijv. TDS 2024)"
                          value={pdf.name}
                          onChange={(e) => {
                            const n = [...pdfs];
                            n[idx].name = e.target.value;
                            setPdfs(n);
                          }}
                        />
                        <input
                          className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-bold outline-none focus:border-amber-500"
                          placeholder="Document Link (URL)..."
                          value={pdf.url}
                          onChange={(e) => {
                            const n = [...pdfs];
                            n[idx].url = e.target.value;
                            setPdfs(n);
                          }}
                        />
                        {pdfs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePdfRow(pdf.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-all"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* RECHTER KOLOM: PREVIEW & VALIDATIE */}
          <div className="lg:col-span-4 space-y-6 text-left">
            <div className="bg-slate-900 rounded-[45px] p-8 text-white shadow-2xl space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Fingerprint size={100} />
              </div>

              <div className="space-y-4">
                <div className="relative aspect-video w-full bg-white/5 rounded-3xl border border-white/10 overflow-hidden flex items-center justify-center">
                  {formData.imageUrl ? (
                    <img
                      src={formData.imageUrl}
                      className="w-full h-full object-cover"
                      alt="Preview"
                    />
                  ) : (
                    <div className="text-center opacity-20">
                      <ImageIcon size={48} />
                      <p className="text-[9px] font-black uppercase mt-2">
                        Geen Beeld
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest italic">
                    Systeem Naam
                  </span>
                  <p className="text-2xl font-black italic tracking-tighter leading-tight break-words">
                    {formData.name || "Configuratie..."}
                  </p>
                </div>
              </div>

              <div className="space-y-6 border-t border-white/10 pt-8 text-left">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase mb-2">
                    Toegewezen Engineer
                  </label>
                  <select
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-emerald-500 transition-all"
                    value={formData.assignedEngineer}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignedEngineer: e.target.value,
                      })
                    }
                  >
                    <option value="">- Kies Engineer -</option>
                    {engineers.map((eng) => (
                      <option
                        key={eng.id}
                        value={eng.email}
                        className="text-slate-900"
                      >
                        {eng.name || eng.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 ml-1">
                    Systeem Label (Verplicht)
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {library.labels?.map((l) => (
                      <button
                        type="button"
                        key={l}
                        onClick={() => setFormData({ ...formData, label: l })}
                        className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase transition-all border-2 ${
                          formData.label === l
                            ? "bg-emerald-500 border-emerald-500 text-white shadow-lg"
                            : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <button
                  type="submit"
                  disabled={
                    loading || formData.assignedEngineer === "" || !specsVisible
                  }
                  className="w-full bg-blue-600 text-white py-6 rounded-[30px] font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-2xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 disabled:grayscale"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <Save size={20} /> Opslaan als Concept
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors text-center"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminNewProductView;
