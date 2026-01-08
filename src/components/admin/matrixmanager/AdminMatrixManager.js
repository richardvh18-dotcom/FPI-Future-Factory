import React, { useState, useEffect } from "react";
import {
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Grid,
  Layers,
  Ruler,
  FileText,
  Database,
  ArrowRight,
  Settings,
  BrainCircuit,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  CheckCircle2,
  Clock,
  MessageSquareQuote,
  Activity,
  History as LucideHistory, // Hernoemd om conflict met window.history te voorkomen
} from "lucide-react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, appId } from "../../../config/firebase";

import MatrixView from "./MatrixView";
import LibraryView from "./LibraryView";
import BlueprintsView from "./BlueprintsView";
import DimensionsView from "./DimensionsView";
import SpecsView from "./SpecsView";

/**
 * AI Training View: Module voor kwaliteitsborging van AI antwoorden.
 */
const AiTrainingView = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [correction, setCorrection] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "artifacts", appId, "public", "data", "ai_knowledge_base")
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const sorted = data.sort(
          (a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)
        );
        setLogs(sorted);
        setLoading(false);
      },
      (err) => {
        console.error("Fout bij laden AI logs:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleVerify = async (id, correctedText = null) => {
    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "ai_knowledge_base",
        id
      );
      await updateDoc(docRef, {
        verified: true,
        correctedAnswer: correctedText || null,
        verifiedAt: serverTimestamp(),
      });
      setEditingId(null);
      setCorrection("");
    } catch (e) {
      alert("Fout bij verifiëren: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deze interactie verwijderen uit de kennisbank?"))
      return;
    try {
      await deleteDoc(
        doc(db, "artifacts", appId, "public", "data", "ai_knowledge_base", id)
      );
    } catch (e) {
      alert("Fout bij verwijderen.");
    }
  };

  const negativeLogs = logs.filter(
    (l) => l.feedback === "negative" && !l.verified
  );
  const recentLogs = logs
    .filter((l) => l.feedback !== "negative" || l.verified)
    .slice(0, 15);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400">
        <RefreshCw className="animate-spin mb-4" size={32} />
        <p className="text-xs font-black uppercase tracking-widest">
          Kennisbank laden...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* SECTIE 1: TE CORRIGEREN */}
      <div>
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 mb-4">
          <AlertTriangle className="text-red-500" size={20} /> Correcties
          Vereist
          <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-black">
            {negativeLogs.length}
          </span>
        </h3>

        {negativeLogs.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] text-center text-emerald-600 italic">
            <CheckCircle2 size={40} className="mx-auto mb-2 opacity-50" />
            <p className="font-bold uppercase text-xs tracking-widest">
              Geen openstaande correcties.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {negativeLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white border-2 border-red-100 rounded-[2rem] overflow-hidden shadow-sm"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                      <Clock size={12} />{" "}
                      {log.timestamp?.toDate().toLocaleString() || "Zojuist"}
                    </div>
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                        Vraag:
                      </p>
                      <p className="text-sm font-bold text-slate-700 italic">
                        "{log.question}"
                      </p>
                    </div>
                    <div className="bg-red-50/30 p-4 rounded-2xl border border-red-50">
                      <p className="text-[10px] font-black text-red-400 uppercase mb-1">
                        AI Antwoord:
                      </p>
                      <p className="text-sm text-slate-600">{log.answer}</p>
                    </div>
                  </div>

                  {editingId === log.id ? (
                    <div className="mt-6 space-y-3">
                      <textarea
                        className="w-full bg-blue-50/50 border-2 border-blue-200 rounded-2xl p-4 text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all min-h-[100px]"
                        value={correction}
                        onChange={(e) => setCorrection(e.target.value)}
                        placeholder="Voer het juiste antwoord in..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerify(log.id, correction)}
                          className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase hover:bg-blue-700"
                        >
                          Verifieer Antwoord
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-6 bg-slate-100 text-slate-400 py-3 rounded-xl font-black text-xs uppercase"
                        >
                          Annuleer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(log.id);
                        setCorrection(log.answer);
                      }}
                      className="mt-6 w-full bg-slate-900 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all"
                    >
                      Corrigeer & Leer Systeem
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTIE 2: HISTORIE */}
      <div className="opacity-80">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <LucideHistory size={16} /> Interactie Historie
        </h3>
        <div className="space-y-2">
          {recentLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-2xl border bg-white border-slate-100 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  {log.verified ? (
                    <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase italic">
                      Geverifieerd
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[8px] font-black uppercase">
                      Onverwerkt
                    </span>
                  )}
                  <span className="text-[9px] font-bold text-slate-300 italic">
                    {log.timestamp?.toDate().toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs font-black text-slate-700 truncate">
                  {log.question}
                </p>
              </div>
              <div className="flex gap-1">
                {!log.verified && (
                  <button
                    onClick={() => handleVerify(log.id)}
                    className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"
                  >
                    <ThumbsUp size={16} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(log.id)}
                  className="p-2 text-slate-200 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Hoofdcomponent MatrixManager.
 */
const AdminMatrixManager = ({
  productRange,
  productTemplates,
  generalConfig,
  bellDimensions,
  boreDimensions,
  toleranceSettings,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });

  const [matrixData, setMatrixData] = useState(productRange || {});
  const [libraryData, setLibraryData] = useState({
    connections: [],
    labels: [],
    extraCodes: [],
    product_names: [],
    pns: [],
    diameters: [],
  });
  const [blueprints, setBlueprints] = useState(productTemplates || {});

  useEffect(() => {
    if (generalConfig) {
      setLibraryData({
        connections: generalConfig.connections || [],
        labels: generalConfig.labels || [],
        extraCodes: generalConfig.extraCodes || generalConfig.codes || [],
        product_names: generalConfig.product_names || [],
        pns: generalConfig.pns || [],
        diameters: generalConfig.diameters || [],
      });
    }
    if (productRange) setMatrixData(productRange);
    if (productTemplates) setBlueprints(productTemplates);
  }, [generalConfig, productRange, productTemplates]);

  const handleSave = async () => {
    setLoading(true);
    let docId =
      activeTab === "matrix"
        ? "product_range"
        : activeTab === "library"
        ? "general_config"
        : "product_templates";
    let data =
      activeTab === "matrix"
        ? matrixData
        : activeTab === "library"
        ? libraryData
        : blueprints;

    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "settings", docId),
        data,
        { merge: true }
      );
      setStatus({ type: "success", msg: "Opgeslagen" });
    } catch (e) {
      setStatus({ type: "error", msg: "Fout" });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus({ type: "", msg: "" }), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full animate-in fade-in duration-500">
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center shrink-0 h-16 shadow-sm z-30 relative">
        <button
          onClick={onBack}
          className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-all"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className="text-center group outline-none"
          >
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none italic group-hover:text-blue-600 transition-all">
              Matrix <span className="text-blue-600">Manager</span>
            </h2>
          </button>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {["matrix", "library", "blueprints"].includes(activeTab) && (
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-slate-900 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-blue-600 shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="animate-spin" size={14} />
              ) : (
                <Save size={14} />
              )}{" "}
              Opslaan
            </button>
          )}
          {status.msg && (
            <span
              className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg italic ${
                status.type === "success"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {status.msg}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 w-full overflow-y-auto custom-scrollbar">
        <div className="p-6 w-full max-w-6xl mx-auto">
          {activeTab === "dashboard" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  id: "matrix",
                  title: "Beschikbaarheid",
                  desc: "Beheer diameters en drukklassen.",
                  icon: <Grid size={24} className="text-blue-600" />,
                  color: "bg-blue-50",
                },
                {
                  id: "library",
                  title: "Bibliotheek",
                  desc: "Dropdown-waarden en labels.",
                  icon: <Database size={24} className="text-emerald-600" />,
                  color: "bg-emerald-50",
                },
                {
                  id: "blueprints",
                  title: "Blauwdrukken",
                  desc: "Vereiste meetvelden per groep.",
                  icon: <Layers size={24} className="text-purple-600" />,
                  color: "bg-purple-50",
                },
                {
                  id: "dimensions",
                  title: "Maatvoering",
                  desc: "Bell, Bore & Master Tolerances.",
                  icon: <Ruler size={24} className="text-amber-600" />,
                  color: "bg-amber-50",
                },
                {
                  id: "ai_training",
                  title: "AI Training",
                  desc: "Feedback corrigeren & leren.",
                  icon: <BrainCircuit size={24} className="text-indigo-600" />,
                  color: "bg-indigo-50",
                  badge: "Nieuw",
                },
                {
                  id: "specs",
                  title: "Overzicht",
                  desc: "Totaaloverzicht van alle specs.",
                  icon: <FileText size={24} className="text-slate-600" />,
                  color: "bg-slate-100",
                },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className="group flex flex-col p-6 rounded-[28px] bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left relative"
                >
                  {item.badge && (
                    <span className="absolute top-4 right-4 bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase italic animate-pulse">
                      {item.badge}
                    </span>
                  )}
                  <div className={`p-4 ${item.color} rounded-2xl w-fit mb-4`}>
                    {item.icon}
                  </div>
                  <h3 className="text-md font-black text-slate-800 leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-2 leading-snug">
                    {item.desc}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <>
              {activeTab === "matrix" && (
                <MatrixView
                  libraryData={libraryData}
                  matrixData={matrixData}
                  setMatrixData={setMatrixData}
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
                />
              )}
              {activeTab === "dimensions" && (
                <DimensionsView
                  libraryData={libraryData}
                  blueprints={blueprints}
                  productRange={matrixData}
                  bellDimensions={bellDimensions}
                  boreDimensions={boreDimensions}
                  toleranceSettings={toleranceSettings}
                />
              )}
              {activeTab === "specs" && <SpecsView blueprints={blueprints} />}
              {activeTab === "ai_training" && <AiTrainingView />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMatrixManager;
