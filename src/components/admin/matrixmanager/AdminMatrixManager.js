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
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, appId } from "../../../config/firebase";

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
  productRange,
  productTemplates,
  generalConfig,
  bellDimensions,
  boreDimensions,
  onBack,
}) => {
  // AANPASSING: Start op 'dashboard' in plaats van 'matrix'
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Data States
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
  const [dimType, setDimType] = useState("cb");

  // --- MENU ITEMS VOOR DASHBOARD ---
  const menuItems = [
    {
      id: "matrix",
      title: "Beschikbaarheid",
      desc: "Bepaal welke diameters beschikbaar zijn per drukklasse en type.",
      icon: <Grid size={24} className="text-emerald-600" />,
      color: "bg-emerald-50 border-emerald-100 hover:border-emerald-300",
    },
    {
      id: "library",
      title: "Bibliotheek",
      desc: "Beheer basislijsten zoals connecties, labels en producttypes.",
      icon: <Database size={24} className="text-blue-600" />,
      color: "bg-blue-50 border-blue-100 hover:border-blue-300",
    },
    {
      id: "blueprints",
      title: "Blauwdrukken",
      desc: "Definieer templates voor velden per product (bv. welke maten bij een mof horen).",
      icon: <Layers size={24} className="text-purple-600" />,
      color: "bg-purple-50 border-purple-100 hover:border-purple-300",
    },
    {
      id: "dimensions",
      title: "Maatvoering",
      desc: "Beheer afmetingen voor moffen (Bell) en fittingen.",
      icon: <Ruler size={24} className="text-cyan-600" />,
      color: "bg-cyan-50 border-cyan-100 hover:border-cyan-300",
    },
    {
      id: "specs",
      title: "Overzicht",
      desc: "Totaaloverzicht van alle geconfigureerde specificaties.",
      icon: <Package size={24} className="text-orange-600" />,
      color: "bg-orange-50 border-orange-100 hover:border-orange-300",
    },
  ];

  // Sync props to state
  useEffect(() => {
    if (productRange) setMatrixData(productRange);
    if (generalConfig) {
      setLibraryData({
        connections: generalConfig.connections || [],
        labels: generalConfig.labels || [],
        codes: generalConfig.codes || [],
        product_names: generalConfig.product_names || [],
        pns: generalConfig.pns ? generalConfig.pns.sort((a, b) => a - b) : [],
        diameters: generalConfig.diameters
          ? generalConfig.diameters.sort((a, b) => a - b)
          : [],
      });
    }
    if (productTemplates) setBlueprints(productTemplates);
  }, [productRange, generalConfig, productTemplates]);

  // --- SAVE HANDLERS ---
  const saveMatrix = async () => {
    setLoading(true);
    try {
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
          {/* Opslaan knop verbergen op dashboard en dimensions */}
          {activeTab !== "dashboard" &&
            activeTab !== "dimensions" &&
            dimType !== "bore" &&
            dimType !== "tolerance" && (
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
          {hasUnsavedChanges &&
            activeTab !== "dashboard" &&
            activeTab !== "dimensions" && (
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

      {/* TABS (Nu met Dashboard knop) */}
      <div className="flex justify-center bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 w-full">
        <div className="flex gap-4 px-8 py-0">
          {/* Dashboard Knop - Altijd zichtbaar om terug te gaan */}
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`py-4 px-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "dashboard"
                ? `border-slate-800 text-slate-800`
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <LayoutDashboard size={16} /> Menu
          </button>

          {/* De andere tabs (Alleen zichtbaar als we niet op dashboard zijn, of altijd? 
             Laten we ze altijd tonen voor snelle navigatie, maar 'Menu' is de home) */}
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
        {/* DASHBOARD WEERGAVE (TEGELS) */}
        {activeTab === "dashboard" ? (
          <div className="p-8 max-w-7xl w-full animate-in fade-in slide-in-from-bottom-4">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-black text-slate-800 mb-2">
                Matrix Beheer
              </h2>
              <p className="text-slate-500 font-medium">
                Selecteer een onderdeel om te configureren.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`p-6 rounded-2xl border-2 text-left transition-all transform hover:-translate-y-1 shadow-sm hover:shadow-md ${item.color} group`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-black">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium group-hover:text-slate-600">
                    {item.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // SUB-VIEWS
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
                boreDimensions={boreDimensions}
                productRange={matrixData}
              />
            )}

            {activeTab === "specs" && <SpecsView blueprints={blueprints} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMatrixManager;
