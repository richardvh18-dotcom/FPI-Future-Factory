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
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
// Let op: pad is 3 niveaus omhoog
import { db, appId } from "../../../config/firebase";

// Import Sub-Views
import MatrixView from "./MatrixView";
import LibraryView from "./LibraryView";
import BlueprintsView from "./BlueprintsView";
import DimensionsView from "./DimensionsView";
import SpecsView from "./SpecsView";

const DEFAULT_IDS = [
  25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600,
];
const DEFAULT_PNS = [6, 10, 16, 25];

const AdminMatrixManager = ({
  productRange: propRange,
  productTemplates: propTemplates,
  bellDimensions,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState("matrix");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // --- DATA STATES ---
  const [matrixData, setMatrixData] = useState({});
  const [libraryData, setLibraryData] = useState({
    connections: [],
    labels: [],
    codes: [],
    product_names: [],
    pns: [],
    diameters: [],
  });
  const [blueprints, setBlueprints] = useState({});

  // State voor DimensionsView
  const [dimType, setDimType] = useState("cb");

  // --- INITIAL DATA LOAD ---
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 1. Matrix (product_range document in settings)
        const matrixRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "settings",
          "product_range"
        );
        const matrixSnap = await getDoc(matrixRef);
        if (matrixSnap.exists()) setMatrixData(matrixSnap.data());

        // 2. Library (general_config document in settings)
        const libRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "settings",
          "general_config"
        );
        const libSnap = await getDoc(libRef);
        if (libSnap.exists()) {
          const data = libSnap.data();
          setLibraryData({
            connections: data.connections || [],
            labels: data.labels || [],
            codes: data.codes || [],
            product_names: data.product_names || [],
            pns:
              data.pns?.length > 0
                ? data.pns.sort((a, b) => a - b)
                : DEFAULT_PNS,
            diameters:
              data.diameters?.length > 0
                ? data.diameters.sort((a, b) => a - b)
                : DEFAULT_IDS,
          });
        } else {
          setLibraryData({
            connections: [],
            labels: [],
            codes: [],
            product_names: [],
            pns: DEFAULT_PNS,
            diameters: DEFAULT_IDS,
          });
        }

        // 3. Templates (product_templates document in settings)
        const templRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "settings",
          "product_templates"
        );
        const templSnap = await getDoc(templRef);
        if (templSnap.exists()) setBlueprints(templSnap.data());
      } catch (error) {
        console.error("Fout bij laden:", error);
        setStatus({ type: "error", msg: "Kon data niet laden." });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // --- SAVE HANDLERS ---

  const saveMatrix = async () => {
    setLoading(true);
    try {
      // Opslaan naar settings/product_range
      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "settings",
          "product_range"
        ),
        matrixData
      );
      setStatus({ type: "success", msg: "Matrix opgeslagen!" });
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error(e);
      setStatus({ type: "error", msg: "Opslaan mislukt." });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus({ type: "", msg: "" }), 3000);
    }
  };

  const saveLibrary = async () => {
    setLoading(true);
    try {
      // Opslaan naar settings/general_config
      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "settings",
          "general_config"
        ),
        libraryData,
        { merge: true }
      );
      setStatus({ type: "success", msg: "Bibliotheek opgeslagen!" });
    } catch (e) {
      console.error(e);
      setStatus({ type: "error", msg: "Opslaan mislukt." });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus({ type: "", msg: "" }), 3000);
    }
  };

  const saveBlueprints = async () => {
    setLoading(true);
    try {
      // Opslaan naar settings/product_templates
      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "settings",
          "product_templates"
        ),
        blueprints
      );
      setStatus({ type: "success", msg: "Templates opgeslagen!" });
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error(e);
      setStatus({ type: "error", msg: "Opslaan mislukt." });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus({ type: "", msg: "" }), 3000);
    }
  };

  const handleSave = () => {
    if (activeTab === "matrix") saveMatrix();
    if (activeTab === "library") saveLibrary();
    if (activeTab === "blueprints" || activeTab === "specs") saveBlueprints();
    // Dimensions save zichzelf in hun eigen component
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 w-full items-center">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-center items-center shrink-0 shadow-sm z-20 relative w-full h-20">
        <div className="absolute left-8 flex items-center">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors flex items-center gap-2 text-xs font-bold uppercase"
            >
              <ArrowLeft size={18} /> Terug
            </button>
          )}
        </div>

        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <Grid className="text-emerald-500" /> Matrix Manager
          </h2>
          {/* Opslaan knop tonen tenzij we in Dimensions (Bore/Tolerance) zitten die auto-save hebben */}
          {!(
            activeTab === "dimensions" &&
            (dimType === "bore" || dimType === "tolerance")
          ) && (
            <>
              <div className="h-8 w-px bg-slate-200"></div>
              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-emerald-600 text-white px-8 py-2.5 rounded-xl hover:bg-emerald-700 transition-all font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-200 disabled:opacity-50 uppercase tracking-widest"
              >
                {loading ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                Opslaan
              </button>
            </>
          )}
        </div>

        <div className="absolute right-8 flex items-center gap-4">
          {hasUnsavedChanges && activeTab !== "dimensions" && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full animate-pulse border border-amber-200 uppercase tracking-wide">
              ⚠ Wijzigingen niet opgeslagen
            </span>
          )}
          {status.msg && (
            <div
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 animate-in fade-in ${
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
        </div>
      </div>

      {/* TABS */}
      <div className="flex justify-center bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 w-full">
        <div className="flex gap-8 px-8">
          {[
            {
              id: "matrix",
              label: "Beschikbaarheid",
              icon: <Grid size={16} />,
              color: "emerald",
            },
            {
              id: "library",
              label: "Bibliotheek",
              icon: <Database size={16} />,
              color: "blue",
            },
            {
              id: "blueprints",
              label: "Blauwdrukken",
              icon: <Layers size={16} />,
              color: "purple",
            },
            {
              id: "dimensions",
              label: "Maatvoering",
              icon: <Ruler size={16} />,
              color: "cyan",
            },
            {
              id: "specs",
              label: "Overzicht",
              icon: <Package size={16} />,
              color: "orange",
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? `border-${tab.color}-500 text-${tab.color}-600`
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar w-full flex justify-center">
        <div className="w-full max-w-6xl p-8 space-y-8">
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
              dimType={dimType}
              setDimType={setDimType}
              libraryData={libraryData}
              blueprints={blueprints}
              db={db}
              appId={appId}
              bellDimensions={bellDimensions}
              productRange={matrixData} // Gebruik lokale matrixData
            />
          )}

          {activeTab === "specs" && <SpecsView blueprints={blueprints} />}
        </div>
      </div>
    </div>
  );
};

export default AdminMatrixManager;
