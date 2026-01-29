import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Save,
  Loader2,
  Settings,
  Database,
  Paperclip,
  Image as ImageIcon,
  BookOpen,
  Upload,
  Library,
  FileText,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Plus,
  Zap,
  Ruler,
  Layers,
  UserCheck,
  Fingerprint,
  Info,
  AlertTriangle,
  Link as LinkIcon,
  Tag, // Nieuw icoon voor de code selector
} from "lucide-react";
import { db, storage } from "../../config/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useSettingsData } from "../../hooks/useSettingsData";
import { VERIFICATION_STATUS } from "../../data/constants";
import { findConversionCandidate } from "../../utils/conversionLogic";

const ProductForm = ({ initialData, onSubmit, onCancel, user }) => {
  // --- 1. SETTINGS & HOOKS ---
  const settingsData = useSettingsData(user);
  const {
    loading: settingsLoading,
    productRange,
    generalConfig,
  } = settingsData || { loading: true, productRange: {}, generalConfig: {} };

  // --- 2. LOCAL STATE ---
  const [loading, setLoading] = useState(false);
  const [specsVisible, setSpecsVisible] = useState(false);
  const [specsStatus, setSpecsStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [codeMatch, setCodeMatch] = useState(null);

  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [showPdfLibrary, setShowPdfLibrary] = useState(false);
  const [existingImages, setExistingImages] = useState([]);
  const [existingPdfs, setExistingPdfs] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(null);

  const targetAppId =
    typeof __app_id !== "undefined" ? __app_id : "fittings-app-v1";

  const FITTING_ORDER = ["TW", "L", "Lo", "R", "Weight"];
  const MOF_ORDER = ["B1", "B2", "BA", "A", "TWcb", "BD", "W"];
  const EXCLUDED_METADATA_KEYS = [
    "id",
    "pressure",
    "diameter",
    "type",
    "lastupdated",
    "timestamp",
    "updatedby",
    "articlecode",
    "status",
    "createdby",
    "verificationstatus",
    "active",
  ];

  const [formData, setFormData] = useState({
    extraCode: "-", // Handmatige selectie (A1S1 etc.)
    planningCode: "-", // Automatisch uit Excel (COST...) - NIEUW VELD
    type: "-",
    serie: "-",
    angle: "-",
    radius: "-",
    drilling: "-",
    connection: "-",
    pressure: "-",
    diameter: "-",
    name: "",
    articleCode: "", // Nieuwe Code (COST00...)
    description: "",
    label: "-",
    assignedEngineer: "",
    imageUrl: "",
    specs: {},
    sourcePdfs: [],
    active: true,
    notes: "",
  });

  const isElbow = useMemo(
    () => (formData.type || "").toLowerCase().includes("elbow"),
    [formData.type]
  );

  // --- 3. MATRIX LOGIC ---
  const availablePNs = useMemo(() => {
    if (settingsLoading || !productRange)
      return [8, 10, 12.5, 16, 20, 25, 32, 40, 50];
    const masterPNs = generalConfig?.pns || [];
    if (formData.connection === "-") return masterPNs;
    const connKey = formData.connection.split("/")[0].toUpperCase();
    const matrixEntry =
      productRange[connKey] || productRange[`${connKey}/${connKey}`];
    return matrixEntry
      ? Object.keys(matrixEntry)
          .map(Number)
          .sort((a, b) => a - b) || masterPNs
      : masterPNs;
  }, [formData.connection, productRange, generalConfig, settingsLoading]);

  const availableIDs = useMemo(() => {
    if (settingsLoading || !productRange)
      return [25, 40, 50, 80, 100, 150, 200, 250, 300, 350, 400, 500, 600];
    const masterIDs = generalConfig?.diameters || [];
    if (formData.connection === "-" || formData.pressure === "-")
      return masterIDs;
    const connKey = formData.connection.split("/")[0].toUpperCase();
    const pnKey = String(formData.pressure);
    const matrixEntry =
      productRange?.[connKey] || productRange?.[`${connKey}/${connKey}`];
    if (matrixEntry && matrixEntry[pnKey]) {
      const typeIds =
        matrixEntry[pnKey][formData.type] || matrixEntry[pnKey]["Algemeen"];
      if (typeIds?.length > 0) return [...typeIds].sort((a, b) => a - b);
    }
    return masterIDs;
  }, [
    formData.connection,
    formData.pressure,
    formData.type,
    productRange,
    generalConfig,
    settingsLoading,
  ]);

  // --- 4. EFFECTS ---
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
        serie:
          initialData.serie ||
          (initialData.label?.includes("Fibermar") ? "EMT" : "EST"),
        pressure: initialData.pn
          ? String(initialData.pn)
          : initialData.pressure || "-",
        diameter: initialData.dn
          ? String(initialData.dn)
          : initialData.diameter || "-",
        // Als planningCode nog niet bestaat in oude data, gebruik extraCode als fallback (als dat een lange string is)
        planningCode:
          initialData.planningCode ||
          (initialData.extraCode && initialData.extraCode.length > 5
            ? initialData.extraCode
            : "-"),
        // Als extraCode kort is (A1S1), gebruik die, anders reset
        extraCode:
          initialData.extraCode && initialData.extraCode.length <= 5
            ? initialData.extraCode
            : "-",
        sourcePdfs: initialData.sourcePdfs || [],
        imageUrl: initialData.imageUrl || "",
      }));
      if (initialData.specs && Object.keys(initialData.specs).length > 0) {
        setSpecsVisible(true);
        setSpecsStatus("found");
      }
    }
  }, [initialData]);

  useEffect(() => {
    const fetchAuxData = async () => {
      try {
        const [usersSnap, imagesSnap, docsSnap] = await Promise.all([
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
          getDocs(
            collection(
              db,
              "artifacts",
              targetAppId,
              "public",
              "data",
              "library_drawings"
            )
          ),
        ]);
        const userList = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEngineers(
          userList.filter((u) =>
            ["engineer", "admin", "teamleader", "editor"].includes(
              (u.role || "").toLowerCase()
            )
          )
        );
        setExistingImages(
          imagesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
        setExistingPdfs(docsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Fout bij laden auxiliary data:", err);
      }
    };
    fetchAuxData();
  }, [targetAppId]);

  // --- AUTO-MATCH LOGICA ---
  useEffect(() => {
    if (initialData) return;

    const performMatch = async () => {
      if (
        formData.type !== "-" &&
        formData.diameter !== "-" &&
        formData.pressure !== "-" &&
        formData.serie !== "-"
      ) {
        let searchLabel = "";
        if (formData.serie === "EST") searchLabel = "Wavistrong Standard";
        else if (formData.serie === "EMT") searchLabel = "Fibermar";

        if (searchLabel) {
          setFormData((prev) => ({ ...prev, label: searchLabel }));
        }

        const match = await findConversionCandidate(targetAppId, {
          type: formData.type,
          dn: formData.diameter,
          pn: formData.pressure,
          label: searchLabel,
        });

        if (match) {
          setCodeMatch({
            found: true,
            newCode: match.targetProductId,
            oldCode: match.manufacturedId,
            serie: match.serie,
          });

          let specificLabel = formData.label;
          if (match.serie === "CST") specificLabel = "Wavistrong Non Standard";
          if (match.serie === "EWT") specificLabel = "Wavistrong Potable Water";

          setFormData((prev) => ({
            ...prev,
            articleCode: match.targetProductId,
            planningCode: match.manufacturedId, // HIER VULLEN WE DE PLANNING CODE IN
            description: match.description || prev.description,
            label: specificLabel,
          }));
        } else {
          setCodeMatch({ found: false });
        }
      }
    };

    const timer = setTimeout(performMatch, 500);
    return () => clearTimeout(timer);
  }, [
    formData.type,
    formData.diameter,
    formData.pressure,
    formData.serie,
    initialData,
    targetAppId,
  ]);

  // --- AUTO-NAME ---
  useEffect(() => {
    if (initialData && formData.name === initialData.name) return;
    let parts = [];
    if (formData.type && formData.type !== "-")
      parts.push(formData.type.toUpperCase());
    if (isElbow && formData.angle && formData.angle !== "-")
      parts.push(`${formData.angle}°`);
    if (formData.radius && formData.radius !== "-") parts.push(formData.radius);
    if (formData.connection && formData.connection !== "-")
      parts.push(formData.connection.toUpperCase());
    if (formData.diameter && formData.diameter !== "-")
      parts.push(`ID${formData.diameter}`);
    if (formData.pressure && formData.pressure !== "-")
      parts.push(`PN${formData.pressure}`);

    if (formData.serie === "EMT") {
      parts.push("(FIBERMAR)");
    }

    const newName = parts.join(" ");
    if (newName && newName !== formData.name)
      setFormData((prev) => ({ ...prev, name: newName }));
  }, [
    formData.type,
    formData.angle,
    formData.radius,
    formData.connection,
    formData.diameter,
    formData.pressure,
    formData.serie,
    isElbow,
    initialData,
  ]);

  // --- ACTIONS ---
  const handleUploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingMedia("image");
    try {
      const storageRef = ref(
        storage,
        `artifacts/${targetAppId}/product_images/${Date.now()}_${file.name}`
      );
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      const imgId = file.name.split(".")[0].replace(/[^a-zA-Z0-9]/g, "_");
      await setDoc(
        doc(
          db,
          "artifacts",
          targetAppId,
          "public",
          "data",
          "product_images",
          imgId
        ),
        { name: file.name, url: downloadURL, createdAt: serverTimestamp() }
      );
      setFormData((prev) => ({ ...prev, imageUrl: downloadURL }));
      setExistingImages((prev) => [
        { name: file.name, url: downloadURL },
        ...prev,
      ]);
      setShowImageLibrary(false);
    } catch (err) {
      alert("Upload mislukt: " + err.message);
    } finally {
      setUploadingMedia(null);
    }
  };

  const handleUploadPdf = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingMedia("pdf");
    try {
      const storageRef = ref(
        storage,
        `artifacts/${targetAppId}/library_drawings/${Date.now()}_${file.name}`
      );
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      const pdfId = file.name.split(".")[0].replace(/[^a-zA-Z0-9]/g, "_");
      const newPdf = { name: file.name, url: downloadURL };
      await setDoc(
        doc(
          db,
          "artifacts",
          targetAppId,
          "public",
          "data",
          "library_drawings",
          pdfId
        ),
        { ...newPdf, createdAt: serverTimestamp() }
      );
      setFormData((prev) => ({
        ...prev,
        sourcePdfs: [...prev.sourcePdfs, newPdf],
      }));
      setExistingPdfs((prev) => [newPdf, ...prev]);
      setShowPdfLibrary(false);
    } catch (err) {
      alert("Upload mislukt: " + err.message);
    } finally {
      setUploadingMedia(null);
    }
  };

  const togglePdfFromLibrary = (pdf) => {
    const exists = formData.sourcePdfs.find((p) => p.url === pdf.url);
    if (exists) {
      setFormData((prev) => ({
        ...prev,
        sourcePdfs: prev.sourcePdfs.filter((p) => p.url !== pdf.url),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        sourcePdfs: [...prev.sourcePdfs, pdf],
      }));
    }
  };

  const handleFetchSpecs = async () => {
    if (
      formData.type === "-" ||
      formData.connection === "-" ||
      formData.pressure === "-" ||
      formData.diameter === "-"
    ) {
      return alert("Selecteer eerst alle basisparameters (Type, Mof, PN, ID).");
    }
    setSpecsStatus("fetching");
    try {
      const connPrefix = formData.connection.split("/")[0].toUpperCase();
      const pnPart = `PN${formData.pressure}`;
      const idPart = `ID${formData.diameter}`;
      const baseTypeRaw = formData.type
        .split(" ")[0]
        .replace("_Socket", "")
        .replace("_SOCKET", "")
        .toUpperCase();
      const angleInId =
        baseTypeRaw.includes("ELBOW") && formData.angle !== "-"
          ? `${formData.angle}_`
          : "";

      const standardFitId = `${baseTypeRaw}_${angleInId}${connPrefix}_${pnPart}_${idPart}`;
      const socketFitId = `${baseTypeRaw}_SOCKET_${connPrefix}_${pnPart}_${idPart}`;
      const bellCol =
        connPrefix.toLowerCase() === "cb" ? "cb_dimensions" : "tb_dimensions";
      const bellId = `${connPrefix}_${pnPart}_${idPart}`;

      const [bellSnap, fitStandardSnap, fitSocketSnap] = await Promise.all([
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
            standardFitId
          )
        ),
        getDoc(
          doc(
            db,
            "artifacts",
            targetAppId,
            "public",
            "data",
            "standard_socket_specs",
            socketFitId
          )
        ),
      ]);

      let rawMerged = {};
      if (bellSnap.exists()) rawMerged = { ...rawMerged, ...bellSnap.data() };
      if (fitStandardSnap.exists())
        rawMerged = { ...rawMerged, ...fitStandardSnap.data() };
      if (fitSocketSnap.exists())
        rawMerged = { ...rawMerged, ...fitSocketSnap.data() };

      const filteredSpecs = {};
      Object.entries(rawMerged).forEach(([key, val]) => {
        if (!EXCLUDED_METADATA_KEYS.includes(key.toLowerCase())) {
          filteredSpecs[key] = val;
        }
      });

      setFormData((prev) => ({ ...prev, specs: filteredSpecs }));
      setSpecsStatus(
        Object.keys(filteredSpecs).length > 0 ? "found" : "not_found"
      );
      setSpecsVisible(true);
    } catch (err) {
      console.error(err);
      setSpecsStatus("not_found");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name) {
      setError("Productnaam is verplicht");
      setLoading(false);
      return;
    }
    if (formData.type === "-") {
      setError("Selecteer een type");
      setLoading(false);
      return;
    }

    try {
      const statusPending = VERIFICATION_STATUS?.PENDING || "pending_review";
      const finalProductData = {
        ...formData,
        dn: formData.diameter !== "-" ? parseInt(formData.diameter) : 0,
        pn: formData.pressure !== "-" ? parseFloat(formData.pressure) : 0,
        verificationStatus: statusPending,
        verifiedBy: null,
        lastModifiedBy: user ? user.uid : "unknown",
        lastUpdated: serverTimestamp(),
        createdAt: initialData?.createdAt || serverTimestamp(),
      };

      if (!initialData && formData.assignedEngineer) {
        const recipients = engineers.filter(
          (u) =>
            u.email === formData.assignedEngineer || u.receivesValidationAlerts
        );
        const uniqueEmails = [
          ...new Set(recipients.map((r) => r.email.toLowerCase())),
        ];
        uniqueEmails.forEach(async (email) => {
          try {
            await addDoc(
              collection(
                db,
                "artifacts",
                targetAppId,
                "public",
                "data",
                "messages"
              ),
              {
                from: "SYSTEM",
                to: email,
                subject: `VALIDATIE: ${formData.name}`,
                content: `Product "${formData.name}" staat klaar voor validatie.`,
                timestamp: serverTimestamp(),
                read: false,
                type: "validation_alert",
              }
            );
          } catch (err) {}
        });
      }

      await onSubmit(finalProductData);
    } catch (err) {
      console.error(err);
      setError("Opslaan mislukt: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (settingsLoading)
    return (
      <div className="p-12 text-center">
        <Loader2 className="animate-spin inline" /> Laden...
      </div>
    );

  const productNames = generalConfig?.product_names || [];
  const extraCodes = generalConfig?.extraCodes || [];
  const connections = generalConfig?.connections || [];
  const angles = generalConfig?.angles || [];
  const labels = generalConfig?.labels || [
    "Wavistrong Standard",
    "Wavistrong Non Standard",
    "Fibermar",
    "Specials",
  ];

  return (
    <div className="w-full max-w-7xl mx-auto h-full flex flex-col overflow-hidden text-left animate-in fade-in duration-500 px-4 min-w-[1000px]">
      <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-200 flex justify-between items-center shrink-0 mb-6 mt-4">
        <div className="flex items-center gap-6">
          <button
            onClick={onCancel}
            className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-400"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
              {initialData ? "Product Wijzigen" : "Nieuw Product"}{" "}
              <span className="text-blue-600">Configurator</span>
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">
              V6.1 | Auto-Link & Verificatie Actief
            </p>
          </div>
        </div>
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl border border-red-200 flex items-center gap-2">
            <AlertTriangle size={16} />{" "}
            <span className="text-xs font-bold">{error}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 pr-2">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
        >
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-10 rounded-[45px] shadow-xl border border-slate-100 space-y-10 text-left">
              <section className="space-y-6">
                <h3 className="text-xs font-black uppercase text-blue-500 tracking-[0.2em] flex items-center gap-2 italic">
                  <Settings size={16} /> 1. Configuratie & Koppeling
                </h3>

                {codeMatch && (
                  <div
                    className={`p-4 rounded-2xl border-2 flex items-center gap-4 ${
                      codeMatch.found
                        ? "bg-emerald-50 border-emerald-100"
                        : "bg-slate-50 border-slate-100"
                    }`}
                  >
                    {codeMatch.found ? (
                      <>
                        <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                          <LinkIcon size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-emerald-700 uppercase">
                            Koppeling Gevonden in Excel
                          </p>
                          <p className="text-[10px] text-emerald-600">
                            Nieuwe Code: <strong>{codeMatch.newCode}</strong> |
                            Planning Code: <strong>{codeMatch.oldCode}</strong>
                          </p>
                          <p className="text-[9px] text-emerald-500 italic mt-1">
                            Label automatisch ingesteld op: {codeMatch.serie}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-slate-200 p-2 rounded-full text-slate-500">
                          <LinkIcon size={20} />
                        </div>
                        <p className="text-xs text-slate-400 italic">
                          Geen match in conversielijst gevonden.
                        </p>
                      </>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6 text-left">
                  {/* CODE SELECTOR TERUGGEZET */}
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 flex items-center gap-1">
                      <Tag size={12} /> Config Code
                    </label>
                    <select
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none shadow-sm"
                      value={formData.extraCode}
                      onChange={(e) =>
                        setFormData({ ...formData, extraCode: e.target.value })
                      }
                    >
                      <option value="-">- Kies Code (Optioneel) -</option>
                      {extraCodes.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
                      Product Lijn (Serie) *
                    </label>
                    <select
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none"
                      value={formData.serie}
                      onChange={(e) =>
                        setFormData({ ...formData, serie: e.target.value })
                      }
                    >
                      <option value="-">- Kies Product Lijn -</option>
                      <option value="EST">Wavistrong (EST/CST/EWT)</option>
                      <option value="EMT">Fibermar (EMT)</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
                      Product Type *
                    </label>
                    <select
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none"
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                    >
                      <option value="-">- Kies Type -</option>
                      {productNames
                        .filter((n) => n !== "Algemeen")
                        .map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                    </select>
                  </div>

                  {isElbow && (
                    <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-left">
                      <div>
                        <label className="block text-[10px] font-black text-blue-600 uppercase mb-2 ml-1">
                          Hoek
                        </label>
                        <select
                          className="w-full bg-blue-50 border-2 border-blue-100 rounded-2xl px-6 py-4 text-sm font-black text-blue-700 outline-none"
                          value={formData.angle}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              angle: e.target.value,
                              radius: e.target.value === "90" ? "-" : "1.5D",
                            })
                          }
                        >
                          <option value="-">-</option>
                          {angles.map((angle) => (
                            <option key={angle} value={angle}>
                              {angle}°
                            </option>
                          ))}
                        </select>
                      </div>
                      {formData.angle === "90" && (
                        <div>
                          <label className="block text-[10px] font-black text-orange-600 uppercase mb-2 ml-1">
                            Radius
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            {["1.0D", "1.5D"].map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, radius: r })
                                }
                                className={`py-4 rounded-2xl text-xs font-black uppercase transition-all border-2 ${
                                  formData.radius === r
                                    ? "bg-orange-500 border-orange-500 text-white"
                                    : "bg-slate-50 border-slate-100 text-slate-400"
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* STAP 2: MATRIX */}
              <section className="space-y-6 pt-10 border-t border-slate-50">
                <h3 className="text-xs font-black uppercase text-emerald-500 tracking-[0.2em] flex items-center gap-2 italic">
                  <Database size={16} /> 2. Matrix Parameters
                </h3>
                <div className="grid grid-cols-3 gap-6 text-left">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
                      Mof
                    </label>
                    <select
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold shadow-sm"
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
                      {connections.map((c) => (
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
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold shadow-sm"
                      value={formData.pressure}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pressure: e.target.value,
                          diameter: "-",
                        })
                      }
                    >
                      <option value="-">-</option>
                      {availablePNs.map((pn) => (
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
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold shadow-sm"
                      value={formData.diameter}
                      onChange={(e) =>
                        setFormData({ ...formData, diameter: e.target.value })
                      }
                    >
                      <option value="-">-</option>
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
                    disabled={
                      formData.diameter === "-" || specsStatus === "fetching"
                    }
                    onClick={handleFetchSpecs}
                    className="w-full py-6 rounded-[28px] font-black text-xs uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 shadow-xl"
                  >
                    {specsStatus === "fetching" ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Zap size={20} />
                    )}{" "}
                    Sync met Database
                  </button>
                </div>

                {specsVisible && (
                  <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                    {/* FITTING AFMETINGEN */}
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 italic">
                        <Ruler size={14} /> Fitting Afmetingen
                      </h4>
                      <div className="bg-slate-50 rounded-3xl p-8 border-2 border-blue-100 grid grid-cols-5 gap-4 shadow-inner">
                        {FITTING_ORDER.map((key) => (
                          <div key={key}>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">
                              {key}
                            </label>
                            <input
                              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-black"
                              value={formData.specs[key] || ""}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  specs: {
                                    ...prev.specs,
                                    [key]: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* MOF AFMETINGEN */}
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 italic">
                        <Layers size={14} /> Mof Afmetingen
                      </h4>
                      <div className="bg-slate-50 rounded-3xl p-8 border-2 border-emerald-100 grid grid-cols-4 gap-4 shadow-inner">
                        {MOF_ORDER.map((key) => (
                          <div key={key}>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">
                              {key}
                            </label>
                            <input
                              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-black shadow-sm"
                              value={formData.specs[key] || ""}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  specs: {
                                    ...prev.specs,
                                    [key]: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* STAP 3: MEDIA HUB */}
              <section className="space-y-6 pt-10 border-t border-slate-50 text-left">
                <h3 className="text-xs font-black uppercase text-purple-500 tracking-[0.2em] flex items-center gap-2 italic">
                  <Paperclip size={16} /> 3. Media & Documentatie
                </h3>

                {/* Image Hub */}
                <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100 space-y-6">
                  <div className="flex justify-between items-center text-left">
                    <div>
                      <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <ImageIcon size={14} className="text-blue-500" />{" "}
                        Product Beeld
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 italic">
                        Kies uit bibliotheek of upload nieuw
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <label className="cursor-pointer bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-blue-600 transition-all shadow-md">
                        {uploadingMedia === "image" ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Upload size={14} />
                        )}
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleUploadImage}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowImageLibrary(!showImageLibrary)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${
                          showImageLibrary
                            ? "bg-blue-600 text-white shadow-lg"
                            : "bg-white border-2 border-slate-200 text-slate-400 hover:border-blue-400"
                        }`}
                      >
                        <Library size={14} /> Beeldbank
                      </button>
                    </div>
                  </div>
                  {showImageLibrary && (
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-3 bg-white p-4 rounded-2xl border border-slate-200 max-h-64 overflow-y-auto custom-scrollbar animate-in zoom-in">
                      {existingImages.map((img) => (
                        <button
                          key={img.id || img.url}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, imageUrl: img.url });
                            setShowImageLibrary(false);
                          }}
                          className={`relative aspect-square rounded-xl border-2 overflow-hidden transition-all group ${
                            formData.imageUrl === img.url
                              ? "border-blue-500 scale-95 shadow-md"
                              : "border-slate-50 hover:border-blue-200"
                          }`}
                        >
                          <img
                            src={img.url}
                            className="w-full h-full object-cover"
                            alt={img.name}
                          />
                          {/* Label met bestandsnaam */}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] p-1 truncate text-center">
                            {img.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* PDF Hub */}
                <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100 space-y-6">
                  <div className="flex justify-between items-center text-left">
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <BookOpen size={14} className="text-purple-500" />{" "}
                      Bronvermelding & PDF's
                    </h4>
                    <div className="flex gap-2">
                      <label className="cursor-pointer bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-purple-600 transition-all shadow-md">
                        {uploadingMedia === "pdf" ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Plus size={14} />
                        )}
                        Nieuwe PDF
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={handleUploadPdf}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPdfLibrary(!showPdfLibrary)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${
                          showPdfLibrary
                            ? "bg-purple-600 text-white shadow-lg"
                            : "bg-white border-2 border-slate-200 text-slate-400 hover:border-purple-400"
                        }`}
                      >
                        <Library size={14} /> Zoek Tekening
                      </button>
                    </div>
                  </div>
                  {showPdfLibrary && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 max-h-64 overflow-y-auto custom-scrollbar animate-in zoom-in space-y-1">
                      {existingPdfs.map((pdf) => (
                        <button
                          key={pdf.id || pdf.url}
                          type="button"
                          onClick={() => togglePdfFromLibrary(pdf)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                            formData.sourcePdfs.some((p) => p.url === pdf.url)
                              ? "border-purple-500 bg-purple-50 text-purple-900"
                              : "border-slate-50 hover:bg-slate-50 text-slate-500"
                          }`}
                        >
                          <div className="flex items-center gap-3 text-left">
                            <FileText size={16} />
                            <span className="text-[11px] font-bold uppercase truncate max-w-xs">
                              {pdf.name}
                            </span>
                          </div>
                          {formData.sourcePdfs.some(
                            (p) => p.url === pdf.url
                          ) ? (
                            <CheckCircle2
                              size={16}
                              className="text-purple-600"
                            />
                          ) : (
                            <Plus size={16} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {formData.sourcePdfs.map((pdf, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm animate-in slide-in-from-left"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <FileText size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-800 uppercase truncate max-w-[150px]">
                              {pdf.name}
                            </span>
                            <a
                              href={pdf.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] font-bold text-blue-500 hover:underline flex items-center gap-1 uppercase tracking-tighter"
                            >
                              Bekijk <ExternalLink size={8} />
                            </a>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((p) => ({
                              ...p,
                              sourcePdfs: p.sourcePdfs.filter(
                                (_, i) => i !== idx
                              ),
                            }))
                          }
                          className="p-2 text-slate-300 hover:text-red-500 border-none bg-transparent"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6 text-left">
            <div className="bg-slate-900 rounded-[45px] p-8 text-white shadow-2xl space-y-8 relative overflow-hidden sticky top-6">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Fingerprint size={100} />
              </div>

              {/* Preview Logic */}
              <div className="space-y-4">
                <div className="relative aspect-video w-full bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center shadow-inner overflow-hidden">
                  {formData.imageUrl ? (
                    <img
                      src={formData.imageUrl}
                      className="w-full h-full object-cover"
                      alt="Product"
                    />
                  ) : (
                    <ImageIcon size={48} className="opacity-20" />
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest italic">
                    Product Preview
                  </span>
                  <p className="text-xl font-black italic tracking-tighter leading-tight break-words">
                    {formData.name || "..."}
                  </p>

                  {/* CODES SECTIE */}
                  <div className="pt-4 space-y-3 border-t border-white/10 mt-4">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                        Artikel Code (Tekening)
                      </span>
                      <span className="font-mono text-emerald-400 text-sm font-bold block break-all">
                        {formData.articleCode || "-"}
                      </span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">
                        Planning Code (Old)
                      </span>
                      <span className="font-mono text-slate-300 text-xs block break-all">
                        {formData.planningCode || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RECHTS: LABEL KEUZE (Verplaatst) */}
              <div className="space-y-6 border-t border-white/10 pt-8 text-left">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase mb-2 flex items-center gap-2">
                    <Settings size={12} /> Label / Serie
                  </label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-emerald-500 transition-all shadow-sm"
                    value={formData.label}
                    onChange={(e) =>
                      setFormData({ ...formData, label: e.target.value })
                    }
                  >
                    <option value="-" className="text-gray-500">
                      - Kies Label -
                    </option>
                    {labels.map((l) => (
                      <option key={l} value={l} className="text-slate-900">
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase mb-2 flex items-center gap-2">
                    <UserCheck size={12} /> Beheerder Toewijzen
                  </label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-emerald-500 transition-all shadow-sm"
                    value={formData.assignedEngineer}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignedEngineer: e.target.value,
                      })
                    }
                  >
                    <option value="" className="text-gray-500">
                      - Kies Beheerder -
                    </option>
                    {engineers.map((eng) => (
                      <option
                        key={eng.id}
                        value={eng.email}
                        className="text-slate-900"
                      >
                        {eng.name || eng.email}{" "}
                        {eng.receivesValidationAlerts ? "🔔" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-6 rounded-[30px] font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-2xl transition-all disabled:opacity-30"
              >
                {loading ? (
                  <Loader2 className="animate-spin mx-auto" />
                ) : initialData ? (
                  "Wijzigingen Opslaan"
                ) : (
                  "Valideren & Indienen"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
