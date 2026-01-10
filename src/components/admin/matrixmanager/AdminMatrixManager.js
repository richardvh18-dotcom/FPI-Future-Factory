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
  LayoutDashboard,
  BrainCircuit,
  Settings,
  Ruler,
  ArrowRight,
} from "lucide-react";
import { doc, setDoc } from "firebase/firestore";

// Firebase config
import { db, appId } from "../../../config/firebase";

// Views in deze map
import LibraryView from "./LibraryView";
import BlueprintsView from "./BlueprintsView";
import AvailabilityView from "./AvailabilityView";
import DimensionsView from "./DimensionsView";
import SpecsView from "./SpecsView";
import AiTrainingView from "./AiTrainingView";

/**
 * MatrixDashboard: Het visuele tegelmenu specifiek voor de Matrix Hub.
 * AANGEPAST: Digital Planning verwijderd (verplaatst naar Admin Hub).
 */
const MatrixDashboard = ({ onNavigate }) => {
  const modules = [
    {
      id: "library",
      title: "1. Bibliotheek",
      desc: "Beheer de basisopties zoals types, moffen, PN en ID.",
      icon: <Settings size={28} />,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      id: "matrix",
      title: "2. Beschikbaarheid",
      desc: "Stel de PN/ID combinaties in per verbinding.",
      icon: <Grid size={28} />,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      id: "blueprints",
      title: "3. Blauwdrukken",
      desc: "Koppel technische velden aan product-mof combinaties.",
      icon: <Layers size={28} />,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      id: "dimensions",
      title: "4. Maatvoering",
      desc: "Vul de exacte technische maten (mm) in voor de database.",
      icon: <Ruler size={28} />,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      id: "ai_training",
      title: "5. AI Training",
      desc: "Controleer AI-antwoorden en train het systeem.",
      icon: <BrainCircuit size={28} />,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
  ];

  return (
    <div className="w-full max-w-6xl py-10 px-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((m) => (
          <button
            key={m.id}
            onClick={() => onNavigate(m.id)}
            className="group flex flex-col p-8 bg-white rounded-[40px] border border-slate-200 text-left transition-all hover:shadow-2xl hover:border-blue-400 hover:-translate-y-2 relative overflow-hidden"
          >
            <div
              className={`p-5 ${m.bg} ${m.color} rounded-3xl w-fit mb-8 group-hover:scale-110 transition-transform duration-500`}
            >
              {m.icon}
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight italic mb-3">
              {m.title}
            </h3>
            <p className="text-sm text-slate-500 font-bold leading-relaxed opacity-80 mb-8">
              {m.desc}
            </p>

            <div className="mt-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-600 transition-colors">
              Openen{" "}
              <ArrowRight
                size={14}
                className="group-hover:translate-x-1 transition-transform"
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * AdminMatrixManager: Centraal beheer voor systeem-architectuur.
 */
const AdminMatrixManager = ({
  productRange,
  productTemplates,
  generalConfig,
  onBack,
  stats = {},
}) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [matrixData, setMatrixData] = useState({});
  const [libraryData, setLibraryData] = useState({
    connections: [],
    labels: [],
    extraCodes: [],
    product_names: [],
    pns: [],
    diameters: [],
  });
  const [blueprints, setBlueprints] = useState({});

  useEffect(() => {
    if (productRange) setMatrixData(productRange);
    if (generalConfig) {
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
      });
    }
    if (productTemplates) setBlueprints(productTemplates);
  }, [productRange, generalConfig, productTemplates]);

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
      setStatus({ type: "success", msg: "Matrix succesvol opgeslagen!" });
      setHasUnsavedChanges(false);
    } catch (e) {
      setStatus({ type: "error", msg: "Opslaan mislukt." });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus({ type: "", msg: "" }), 3000);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 w-full items-center">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-center items-center shrink-0 shadow-sm z-20 relative w-full h-20">
        <div className="absolute left-8 flex items-center">
          <button
            onClick={
              activeTab === "dashboard"
                ? onBack
                : () => setActiveTab("dashboard")
            }
            className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest group"
          >
            <ArrowLeft
              size={18}
              className="group-hover:-translate-x-1 transition-transform"
            />
            {activeTab === "dashboard" ? "Terug" : "Menu"}
          </button>
        </div>

        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 italic uppercase">
            <LayoutDashboard className="text-blue-600" /> Matrix{" "}
            <span className="text-blue-600">Manager</span>
          </h2>

          {["matrix", "library", "blueprints"].includes(activeTab) && (
            <>
              <div className="h-8 w-px bg-slate-200"></div>
              <button
                onClick={handleSave}
                disabled={loading || !hasUnsavedChanges}
                className={`px-8 py-2.5 rounded-xl transition-all font-black text-xs flex items-center gap-2 shadow-lg uppercase tracking-widest ${
                  hasUnsavedChanges
                    ? "bg-slate-900 text-white hover:bg-blue-600 shadow-blue-200"
                    : "bg-slate-100 text-slate-300 shadow-none cursor-not-allowed"
                }`}
              >
                {loading ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )}
                Opslaan
              </button>
            </>
          )}
        </div>

        <div className="absolute right-8 flex items-center gap-4">
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
        <div className="flex justify-center bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 w-full overflow-x-auto no-scrollbar shadow-sm">
          <div className="flex gap-2 px-8">
            {[
              {
                id: "library",
                label: "1. Bibliotheek",
                icon: <Settings size={14} />,
              },
              {
                id: "matrix",
                label: "2. Beschikbaarheid",
                icon: <Grid size={14} />,
              },
              {
                id: "blueprints",
                label: "3. Blauwdrukken",
                icon: <Layers size={14} />,
              },
              {
                id: "dimensions",
                label: "4. Maatvoering",
                icon: <Ruler size={14} />,
              },
              {
                id: "ai_training",
                label: "5. AI Training",
                icon: <BrainCircuit size={14} />,
              },
              { id: "specs", label: "Export", icon: <Database size={14} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? `border-blue-600 text-slate-900 bg-slate-50/50`
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar w-full flex justify-center pb-20">
        {activeTab === "dashboard" ? (
          <MatrixDashboard onNavigate={setActiveTab} />
        ) : (
          <div className="w-full max-w-7xl p-8 animate-in fade-in duration-300">
            {activeTab === "matrix" && (
              <AvailabilityView
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
              />
            )}
            {activeTab === "ai_training" && <AiTrainingView />}
            {activeTab === "specs" && <SpecsView blueprints={blueprints} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMatrixManager;
