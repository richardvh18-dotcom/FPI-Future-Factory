import React, { useState, useEffect } from "react";
import {
  Grid,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Database,
  Layers,
  Package,
  Ruler,
  LayoutDashboard,
  FileText,
  Settings,
  FileUp,
} from "lucide-react";
// AANGEPAST: getDoc toegevoegd aan imports om data op te kunnen halen
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db, appId } from "../../../config/firebase";

// Imports van de sub-componenten
import MatrixView from "./MatrixView";
import LibraryView from "./LibraryView";
import BlueprintsView from "./BlueprintsView";
import DimensionsView from "./DimensionsView";
import SpecsView from "./SpecsView";
import BulkUploadView from "./BulkUploadView";
import AdminDashboard from "../AdminDashboard";

const AdminMatrixManager = ({
  productRange,
  productTemplates,
  generalConfig,
  onBack,
  stats = {},
}) => {
  const [activeTab, setActiveTab] = useState("matrix");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Data States
  const [matrixData, setMatrixData] = useState({});
  const [libraryData, setLibraryData] = useState({
    connections: [],
    labels: [],
    extraCodes: [],
    product_names: [],
    pns: [],
    diameters: [],
    angles: [],
    borings: [],
  });
  const [blueprints, setBlueprints] = useState({});

  // NIEUW: Data ophalen als deze niet via props binnenkomt
  useEffect(() => {
    const fetchData = async () => {
      // Als data via props is meegegeven, gebruik die (sneller)
      if (productRange && generalConfig && productTemplates) {
        setMatrixData(productRange);
        setLibraryData({
          connections: generalConfig.connections || [],
          labels: generalConfig.labels || [],
          extraCodes: generalConfig.extraCodes || generalConfig.codes || [],
          product_names: generalConfig.product_names || [],
          pns: generalConfig.pns
            ? [...generalConfig.pns].sort((a, b) => a - b)
            : [],
          diameters: generalConfig.diameters
            ? [...generalConfig.diameters].sort((a, b) => a - b)
            : [],
          angles: generalConfig.angles
            ? [...generalConfig.angles].sort((a, b) => a - b)
            : [],
          borings: generalConfig.borings || [],
        });
        setBlueprints(productTemplates);
        return;
      }

      // Anders: Zelf ophalen uit Firestore
      setLoading(true);
      try {
        console.log("📥 MatrixManager: Data ophalen uit settings...");

        // We halen de 3 hoofdbestanden op uit de 'settings' collectie
        const [rangeSnap, configSnap, templatesSnap] = await Promise.all([
          getDoc(
            doc(
              db,
              "artifacts",
              appId,
              "public",
              "data",
              "settings",
              "product_range"
            )
          ),
          getDoc(
            doc(
              db,
              "artifacts",
              appId,
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
              appId,
              "public",
              "data",
              "settings",
              "product_templates"
            )
          ),
        ]);

        // 1. Matrix (Beschikbaarheid)
        if (rangeSnap.exists()) {
          setMatrixData(rangeSnap.data());
        }

        // 2. Library (Algemene Instellingen)
        if (configSnap.exists()) {
          const config = configSnap.data();
          setLibraryData({
            connections: config.connections || [],
            labels: config.labels || [],
            extraCodes: config.extraCodes || config.codes || [],
            product_names: config.product_names || [],
            pns: config.pns ? [...config.pns].sort((a, b) => a - b) : [],
            diameters: config.diameters
              ? [...config.diameters].sort((a, b) => a - b)
              : [],
            angles: config.angles
              ? [...config.angles].sort((a, b) => a - b)
              : [],
            borings: config.borings || [],
          });
        }

        // 3. Blauwdrukken
        if (templatesSnap.exists()) {
          setBlueprints(templatesSnap.data());
        }
      } catch (err) {
        console.error("❌ Fout bij laden matrix data:", err);
        setStatus({ type: "error", msg: "Kon instellingen niet ophalen." });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productRange, generalConfig, productTemplates]);

  const handleNavigate = (targetId) => {
    switch (targetId) {
      case "admin_matrix":
        setActiveTab("matrix");
        break;
      case "admin_settings":
        setActiveTab("library");
        break;
      case "admin_upload":
        setActiveTab("admin_upload");
        break;
      default:
        setActiveTab(targetId);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    let targetDoc = "";
    let data = {};

    if (activeTab === "matrix") {
      targetDoc = "product_range";
      data = matrixData;
    } else if (activeTab === "library") {
      targetDoc = "general_config";
      data = libraryData;
    } else if (activeTab === "blueprints") {
      targetDoc = "product_templates";
      data = blueprints;
    } else {
      setLoading(false);
      return;
    }

    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "settings", targetDoc),
        data,
        { merge: true }
      );
      setStatus({ type: "success", msg: "Opgeslagen!" });
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error("Save error:", e);
      setStatus({ type: "error", msg: "Fout bij opslaan." });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus({ type: "", msg: "" }), 3000);
    }
  };

  const TABS = [
    { id: "matrix", label: "Beschikbaarheid", icon: <Grid size={14} /> },
    { id: "library", label: "Bibliotheek", icon: <Settings size={14} /> },
    { id: "blueprints", label: "Blauwdrukken", icon: <Layers size={14} /> },
    { id: "dimensions", label: "Maatvoering", icon: <Ruler size={14} /> },
    { id: "admin_upload", label: "Bulk Upload", icon: <FileUp size={14} /> },
    { id: "specs", label: "Overzicht", icon: <FileText size={14} /> },
  ];

  return (
    <div className="flex flex-col min-h-full bg-slate-50 w-full items-center text-left">
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-center items-center shrink-0 shadow-sm z-20 relative w-full h-20">
        <div className="absolute left-8 flex items-center">
          <button
            onClick={onBack}
            className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest group"
          >
            <ArrowLeft
              size={18}
              className="group-hover:-translate-x-1 transition-transform"
            />{" "}
            Terug
          </button>
        </div>
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 italic uppercase leading-none">
            <LayoutDashboard size={24} className="text-blue-600" /> Manager{" "}
            <span className="text-blue-600">Hub</span>
          </h2>
          {["matrix", "library", "blueprints"].includes(activeTab) && (
            <>
              <div className="h-8 w-px bg-slate-200"></div>
              <button
                onClick={handleSave}
                disabled={loading || !hasUnsavedChanges}
                className={`px-8 py-2.5 rounded-xl transition-all font-black text-sm flex items-center gap-2 shadow-lg uppercase tracking-widest ${
                  hasUnsavedChanges
                    ? "bg-slate-900 text-white hover:bg-blue-600 shadow-blue-200"
                    : "bg-slate-100 text-slate-300"
                }`}
              >
                {loading ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}{" "}
                Opslaan
              </button>
            </>
          )}
        </div>
        <div className="absolute right-8 flex items-center gap-4">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`p-2 rounded-xl transition-all ${
              activeTab === "dashboard"
                ? "bg-blue-50 text-blue-600 shadow-inner"
                : "text-slate-300 hover:bg-slate-50"
            }`}
          >
            <LayoutDashboard size={20} />
          </button>
          {hasUnsavedChanges && (
            <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full animate-pulse border border-amber-200 uppercase tracking-widest">
              Concept Wijzigingen
            </span>
          )}
          {status.msg && (
            <div
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 animate-in fade-in zoom-in ${
                status.type === "error"
                  ? "bg-red-50 text-red-600 border border-red-100"
                  : "bg-emerald-50 text-emerald-600 border border-emerald-100"
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
        </div>
      </div>
      {activeTab !== "dashboard" && (
        <div className="flex justify-center bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 w-full overflow-x-auto">
          <div className="flex gap-4 px-8">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-4 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? `border-blue-600 text-slate-900 bg-slate-50/50`
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <span className="mr-2 opacity-50">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar w-full flex justify-center pb-20">
        {activeTab === "dashboard" ? (
          <AdminDashboard navigate={handleNavigate} stats={stats} />
        ) : (
          <div className="w-full max-w-7xl p-8 animate-in fade-in duration-300">
            {activeTab === "matrix" && (
              <MatrixView
                libraryData={libraryData}
                matrixData={matrixData}
                setMatrixData={setMatrixData}
                setHasUnsavedChanges={setHasUnsavedChanges}
              />
            )}
            {activeTab === "library" && (
              <LibraryView
                libraryData={libraryData}
                setLibraryData={setLibraryData}
                setHasUnsavedChanges={setHasUnsavedChanges}
              />
            )}
            {activeTab === "blueprints" && (
              <BlueprintsView
                blueprints={blueprints}
                setBlueprints={setBlueprints}
                libraryData={libraryData}
                setHasUnsavedChanges={setHasUnsavedChanges}
              />
            )}
            {activeTab === "dimensions" && (
              <DimensionsView
                libraryData={libraryData}
                blueprints={blueprints}
                productRange={matrixData}
                db={db}
                appId={appId}
              />
            )}
            {activeTab === "admin_upload" && <BulkUploadView />}
            {activeTab === "specs" && <SpecsView blueprints={blueprints} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMatrixManager;
