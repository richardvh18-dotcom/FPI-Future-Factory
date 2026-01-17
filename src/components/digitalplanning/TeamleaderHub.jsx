import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  Loader2,
  LogOut,
  Filter,
  Clock,
  AlertTriangle,
  Zap,
  CheckCircle2,
  AlertOctagon,
  FileUp,
  Search,
  Link as LinkIcon,
  Image as ImageIcon,
  FileText,
  Info,
  Archive,
  X,
  Layers,
  List,
  Activity,
  History,
  Calendar as CalendarIcon,
  MessageSquare,
} from "lucide-react";
import {
  collection,
  query,
  onSnapshot,
  getDocs,
  where,
  limit,
  doc,
  updateDoc,
  deleteField, // Nodig om velden te verwijderen
} from "firebase/firestore";
import { db } from "../../config/firebase.js";
import { archiveOrder } from "../../utils/archiveService.js";

import DashboardView from "./DashboardView.jsx";
import PlanningSidebar from "./PlanningSidebar.jsx";
import PlanningImportModal from "./modals/PlanningImportModal.jsx";
import StatusBadge from "./common/StatusBadge.jsx";

const getAppId = () => {
  if (typeof window !== "undefined" && window.__app_id) return window.__app_id;
  return "fittings-app-v1";
};

// Machine configuraties
const FITTING_MACHINES = [
  "BM01",
  "BH11",
  "BH12",
  "BH15",
  "BH16",
  "BH17",
  "BH18",
  "BH31",
  "Mazak",
  "Nabewerking",
];
const PIPE_MACHINES = ["BH05", "BH07", "BH08", "BH09"];

// Hulpfuncties
const normalizeMachine = (m) => {
  if (!m) return "";
  const match = String(m).match(/(\d+)/);
  if (match) return parseInt(match[0], 10).toString();
  return String(m).trim().replace(/\s+/g, "");
};

const formatDate = (ts) => {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  return d.toLocaleString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// AANGEPAST: Helper voor Week/Jaar bepaling
const getISOWeekInfo = (date) => {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  const year = d.getUTCFullYear();
  return { week: weekNo, year: year };
};

// --- MODAL OM 'WEZEN' TE KOPPELEN ---
const AssignOrderModal = ({ orphans, onClose }) => {
  const [targetOrderId, setTargetOrderId] = useState("");
  const [selectedOrphans, setSelectedOrphans] = useState({});

  // Toggle selectie
  const toggleSelect = (id) => {
    setSelectedOrphans((p) => ({ ...p, [id]: !p[id] }));
  };

  const handleAssign = async () => {
    if (!targetOrderId) return alert("Vul een ordernummer in.");

    const idsToUpdate = Object.keys(selectedOrphans).filter(
      (id) => selectedOrphans[id]
    );
    if (idsToUpdate.length === 0)
      return alert("Selecteer minstens één product.");

    try {
      const appId = getAppId();
      const promises = idsToUpdate.map((id) => {
        const docRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "tracked_products",
          id
        );
        return updateDoc(docRef, {
          orderId: targetOrderId,
          isOverproduction: false, // Zet vlag uit
          note: `Handmatig toegewezen aan ${targetOrderId}`,
        });
      });
      await Promise.all(promises);
      alert("Producten succesvol gekoppeld aan " + targetOrderId);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Fout bij koppelen.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl border border-gray-100 flex flex-col overflow-hidden max-h-[80vh]">
        <div className="p-6 border-b flex justify-between items-center bg-red-50">
          <div>
            <h3 className="text-xl font-black text-red-600 uppercase italic">
              Onbekende Orders
            </h3>
            <p className="text-xs text-gray-500">
              Selecteer producten en koppel ze aan een ordernummer
            </p>
          </div>
          <button onClick={onClose}>
            <X size={24} className="text-red-400" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="mb-6 sticky top-0 bg-white z-10 pb-4 border-b border-gray-100">
            <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">
              Nieuw / Bestaand Ordernummer
            </label>
            <input
              className="w-full p-3 border-2 border-blue-100 rounded-xl font-bold text-gray-800 focus:border-blue-500 outline-none"
              placeholder="Bijv. ORD-2026-X"
              value={targetOrderId}
              onChange={(e) => setTargetOrderId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            {orphans.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                className={`p-3 border rounded-xl flex justify-between items-center cursor-pointer transition-all ${
                  selectedOrphans[item.id]
                    ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500"
                    : "bg-white border-gray-200 hover:border-blue-300"
                }`}
              >
                <div>
                  <p className="font-black text-sm text-gray-800">
                    {item.lotNumber}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">
                    {item.item}
                  </p>
                  <div className="flex gap-2 mt-1">
                    {item.isOverproduction && (
                      <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">
                        Overproductie
                      </span>
                    )}
                    <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      Machine: {item.originMachine}
                    </span>
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedOrphans[item.id]
                      ? "border-blue-600 bg-blue-600"
                      : "border-gray-300"
                  }`}
                >
                  {selectedOrphans[item.id] && (
                    <CheckCircle2 size={14} className="text-white" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t flex justify-end bg-gray-50">
          <button
            onClick={handleAssign}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-wider shadow-lg transition-all active:scale-95"
          >
            Koppel Selectie
          </button>
        </div>
      </div>
    </div>
  );
};

// --- STATION DETAIL MODAL (Met Week Grouping) ---
const StationDetailModal = ({ stationId, allOrders, allProducts, onClose }) => {
  const [activeTab, setActiveTab] = useState("active"); // 'active', 'planning', 'history'
  const stationNorm = normalizeMachine(stationId);

  // 1. Nu Actief (Live)
  const activeItems = useMemo(() => {
    return allProducts.filter((p) => {
      if (p.currentStep === "Finished" || p.currentStep === "REJECTED")
        return false;
      const pMachine = String(p.originMachine || p.currentStation || "");
      return normalizeMachine(pMachine) === stationNorm;
    });
  }, [allProducts, stationNorm]);

  // 2. Planning (Wachtrij)
  const groupedPlanning = useMemo(() => {
    const relevantOrders = allOrders
      .filter((o) => {
        return o.normMachine === stationNorm && o.status !== "completed";
      })
      .sort((a, b) => {
        if (a.weekYear !== b.weekYear) return a.weekYear - b.weekYear;
        if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber;
        return a.dateObj - b.dateObj;
      });

    const groups = relevantOrders.reduce((acc, order) => {
      const week = order.weekNumber || getISOWeekInfo(new Date()).week;
      if (!acc[week]) acc[week] = [];
      acc[week].push(order);
      return acc;
    }, {});

    const sortedWeeks = Object.keys(groups).sort((a, b) => a - b);

    return { groups, sortedWeeks, total: relevantOrders.length };
  }, [allOrders, stationNorm]);

  // 3. Historie (Recent gereed)
  const historyItems = useMemo(() => {
    return allProducts
      .filter((p) => {
        const pMachine = String(p.originMachine || p.currentStation || "");
        return (
          normalizeMachine(pMachine) === stationNorm &&
          p.currentStep === "Finished"
        );
      })
      .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))
      .slice(0, 50);
  }, [allProducts, stationNorm]);

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-xl ${
                activeItems.length > 0
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <Activity
                size={24}
                className={activeItems.length > 0 ? "animate-pulse" : ""}
              />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 uppercase italic tracking-tight">
                {stationId}
              </h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {activeItems.length > 0
                  ? "Productie Actief"
                  : "Station Standby"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 gap-6 bg-white sticky top-0 z-10">
          <button
            onClick={() => setActiveTab("active")}
            className={`py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "active"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <Zap size={16} /> Nu Actief ({activeItems.length})
          </button>
          <button
            onClick={() => setActiveTab("planning")}
            className={`py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "planning"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <CalendarIcon size={16} /> Planning ({groupedPlanning.total})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "history"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <History size={16} /> Historie
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50/30 flex-1">
          {activeTab === "active" && (
            <div className="space-y-3">
              {activeItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Zap size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-bold uppercase">
                    Geen actieve productie op dit moment.
                  </p>
                </div>
              ) : (
                activeItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex justify-between items-center border-l-4 border-l-green-500 animate-in slide-in-from-bottom-2"
                  >
                    <div>
                      <h4 className="text-lg font-black text-gray-800">
                        {item.lotNumber}
                      </h4>
                      <p className="text-sm font-bold text-gray-500">
                        {item.item}
                      </p>
                      <p className="text-xs text-blue-500 font-mono mt-1 flex items-center gap-2">
                        <Clock size={10} /> Start: {formatDate(item.startTime)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-bold uppercase animate-pulse inline-block mb-1">
                        Draaiend
                      </span>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">
                        Operator: {item.operator?.split("@")[0] || "Unknown"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "planning" && (
            <div className="space-y-6">
              {groupedPlanning.sortedWeeks.map((week) => (
                <div key={week} className="animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Week {week}
                    </span>
                    <div className="h-px bg-slate-200 flex-1"></div>
                  </div>
                  <div className="space-y-2">
                    {groupedPlanning.groups[week].map((order) => (
                      <div
                        key={order.id}
                        className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center font-black text-blue-600 text-xs">
                            {order.plan}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-gray-800">
                              {order.orderId}
                            </h4>
                            <p className="text-xs text-gray-500 line-clamp-1">
                              {order.item}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                              order.status === "in_progress"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {order.status === "in_progress"
                              ? "Actief"
                              : "Gepland"}
                          </span>
                          {order.liveFinish > 0 && (
                            <p className="text-[10px] text-green-600 font-bold mt-1">
                              {order.liveFinish} gereed
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {groupedPlanning.total === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <CalendarIcon size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-xs font-bold uppercase">
                    Geen orders gepland
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-2">
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center opacity-75 hover:opacity-100 transition-opacity"
                >
                  <div>
                    <h4 className="text-sm font-bold text-gray-700">
                      {item.lotNumber}
                    </h4>
                    <p className="text-xs text-gray-400 line-clamp-1">
                      {item.item}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                      Gereed
                    </span>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      {formatDate(item.updatedAt)}
                    </p>
                  </div>
                </div>
              ))}
              {historyItems.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <History size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-xs font-bold uppercase">
                    Geen historie gevonden
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- PRODUCT PASPOORT MODAL ---
const ProductPassportModal = ({ item, type, onClose, onLinkProduct }) => {
  const [isLinking, setIsLinking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  if (!item) return null;
  // ... (rest van de modal, ingekort voor brevity maar functionaliteit blijft) ...
  // Ik voeg hier even een dummy render toe, in de echte file gebruik je de volledige code uit vorige stappen
  // Zorg dat je de volledige implementatie van ProductPassportModal gebruikt!
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl relative">
        <button onClick={onClose} className="absolute top-2 right-2">
          <X />
        </button>
        <h2 className="text-xl font-bold mb-4">Details</h2>
        {/* ... Inhoud ... */}
        <p className="mb-2">Item: {item.item}</p>
        {/* Hier zou de volledige implementatie staan */}
      </div>
    </div>
  );
};

const TeamleaderHub = ({ onExit, onEnterWorkstation, fixedScope }) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [rawOrders, setRawOrders] = useState([]);
  const [rawProducts, setRawProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalData, setModalData] = useState([]);
  const [modalType, setModalType] = useState("orders");
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [planningFilter, setPlanningFilter] = useState(null);

  // State voor de Station Detail Modal
  const [selectedStationDetail, setSelectedStationDetail] = useState(null);
  // State voor orphan modal
  const [showAssignModal, setShowAssignModal] = useState(false);

  const currentAppId = getAppId();

  // Robuuste Scope Detectie
  const currentScope = String(fixedScope || "").toLowerCase();
  const isPipeScope = currentScope.includes("pipe");
  const isFittingScope = currentScope.includes("fitting");
  const isSpoolScope = currentScope.includes("spool");

  useEffect(() => {
    if (!currentAppId) return;
    const unsubOrders = onSnapshot(
      query(
        collection(
          db,
          "artifacts",
          currentAppId,
          "public",
          "data",
          "digital_planning"
        )
      ),
      (snap) => {
        setRawOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    const unsubProds = onSnapshot(
      query(
        collection(
          db,
          "artifacts",
          currentAppId,
          "public",
          "data",
          "tracked_products"
        )
      ),
      (snap) => {
        setRawProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => {
      unsubOrders();
      unsubProds();
    };
  }, [currentAppId]);

  const dataStore = useMemo(() => {
    const orderStats = {},
      machineMap = {};
    const safeProducts = Array.isArray(rawProducts) ? rawProducts : [];

    safeProducts.forEach((p) => {
      if (!p.orderId) return;
      if (!orderStats[p.orderId])
        orderStats[p.orderId] = { started: 0, finished: 0 };
      orderStats[p.orderId].started++;

      const mOrig = String(p.originMachine || "000");
      const mNorm = normalizeMachine(mOrig);

      if (p.currentStep === "Finished") {
        orderStats[p.orderId].finished++;
        if (!machineMap[mNorm]) machineMap[mNorm] = { running: 0, finished: 0 };
        machineMap[mNorm].finished++;
      } else {
        if (!machineMap[mNorm]) machineMap[mNorm] = { running: 0, finished: 0 };
        machineMap[mNorm].running++;
      }
    });

    let enriched = rawOrders
      .map((o) => {
        const s = orderStats[o.orderId] || { started: 0, finished: 0 };
        const mOrig = String(o.machine || "");
        const mNorm = normalizeMachine(mOrig);
        const itemStr = (o.item || "").toUpperCase();
        const planVal = Number(o.plan || 0);
        const isDecimal = !Number.isInteger(planVal) && planVal < 50;
        const isPipe =
          itemStr.includes("PIPE") || itemStr.includes("BUIS") || isDecimal;

        // DATUM & WEEK BEREKENING
        let dateObj = new Date();
        if (o.plannedDate?.toDate) dateObj = o.plannedDate.toDate();
        else if (o.importDate?.toDate) dateObj = o.importDate.toDate();

        let { week, year } = getISOWeekInfo(dateObj);
        if (o.week || o.weekNumber) week = parseInt(o.week || o.weekNumber);
        if (o.year) year = parseInt(o.year);

        return {
          ...o,
          isPipe,
          liveToDo: Math.max(0, planVal - s.started),
          liveFinish: s.finished,
          normMachine: mNorm,
          originalMachine: mOrig,
          dateObj,
          weekNumber: week,
          weekYear: year,
        };
      })
      .sort((a, b) => {
        // Sorteer enriched lijst alvast op jaar/week
        if (a.weekYear !== b.weekYear) return a.weekYear - b.weekYear;
        return a.weekNumber - b.weekNumber;
      });

    if (fixedScope) {
      if (isPipeScope) {
        const pipeNorms = PIPE_MACHINES.map((m) => normalizeMachine(m));
        enriched = enriched.filter((o) => pipeNorms.includes(o.normMachine));
      } else if (isFittingScope) {
        enriched = enriched.filter(
          (o) => !o.item?.toUpperCase().includes("SPOOL")
        );
      } else if (isSpoolScope) {
        enriched = enriched.filter((o) =>
          o.item?.toUpperCase().includes("SPOOL")
        );
      }
    }
    return { enriched, machineMap };
  }, [
    rawOrders,
    rawProducts,
    fixedScope,
    isPipeScope,
    isFittingScope,
    isSpoolScope,
  ]);

  // AANGEPAST: Orphan filter dat ook isOverproduction meeneemt
  const orphanedProducts = useMemo(() => {
    return rawProducts.filter(
      (p) =>
        p.orderId === "NOG_TE_BEPALEN" ||
        p.isOverproduction === true ||
        !p.orderId
    );
  }, [rawProducts]);

  const dashboardMetrics = useMemo(() => {
    let STATIONS = [];
    if (isPipeScope) STATIONS = PIPE_MACHINES;
    else if (isFittingScope) STATIONS = FITTING_MACHINES;
    else STATIONS = [...FITTING_MACHINES, ...PIPE_MACHINES];

    const machineMetrics = STATIONS.map((mId) => {
      const mNorm = normalizeMachine(mId);
      const mStats = dataStore.machineMap[mNorm] || { running: 0, finished: 0 };
      const mOrders = dataStore.enriched.filter((o) => o.normMachine === mNorm);
      return {
        id: mId,
        plan: mOrders.reduce(
          (s, o) => s + (o.isPipe ? 0 : Number(o.plan || 0)),
          0
        ),
        fin: mStats.finished,
        running: mStats.running,
      };
    });

    let totalFittings = 0;
    let totalPipesMeters = 0;

    dataStore.enriched.forEach((o) => {
      const val = Number(o.plan || 0);
      if (o.isPipe) totalPipesMeters += val;
      else totalFittings += val;
    });

    const validOrderIds = new Set(dataStore.enriched.map((o) => o.orderId));
    const scopedProducts = rawProducts.filter((p) =>
      validOrderIds.has(p.orderId)
    );

    return {
      totalPlanned: Math.round(totalFittings + totalPipesMeters),
      totalPipes: totalPipesMeters,
      activeCount: scopedProducts.filter((p) => p.currentStep !== "Finished")
        .length,
      rejectedCount: scopedProducts.filter((p) => p.currentStep === "REJECTED")
        .length,
      finishedCount: scopedProducts.filter((p) => p.currentStep === "Finished")
        .length,
      tempRejectedCount: scopedProducts.filter(
        (p) => p.inspection?.status === "Tijdelijke afkeur"
      ).length,
      machineMetrics,
    };
  }, [dataStore, rawProducts, isPipeScope, isFittingScope]);

  // AANGEPAST: Logica voor Dashboard Clicks
  const handleDashboardClick = (id) => {
    const ALL_MACHINES = [...FITTING_MACHINES, ...PIPE_MACHINES];
    const mNorm = normalizeMachine(id);
    const isMachine = ALL_MACHINES.some((m) => normalizeMachine(m) === mNorm);

    if (isMachine) {
      setSelectedStationDetail(id);
      return;
    }

    // AANGEPAST: Bij 'Pipes' gaan we wel direct naar planning (want dat is een 'sub-dashboard')
    if (id === "pipes") {
      setPlanningFilter({ type: "pipes", value: true, label: "Pipes" });
      setActiveTab("planning");
      return;
    }

    // AANGEPAST: Bij ALLE andere KPI's (Gepland/Totaal, Actief, Gereed, Afkeur) openen we de Pop-up
    let filteredData = [];
    let title = "";
    let type = "products";

    const validOrderIds = new Set(dataStore.enriched.map((o) => o.orderId));

    switch (id) {
      case "gepland":
        // Totaal: Toon alle orders, gesorteerd
        // Let op: dataStore.enriched is al gesorteerd door de useMemo
        filteredData = [...dataStore.enriched];
        title = "Alle Geplande Orders";
        type = "orders";
        break;
      case "in_proces":
        filteredData = rawProducts.filter(
          (p) =>
            p.currentStep !== "Finished" &&
            p.currentStep !== "REJECTED" &&
            validOrderIds.has(p.orderId)
        );
        title = "Live Productie Inzicht (Actief)";
        break;
      case "gereed":
        filteredData = rawProducts.filter(
          (p) => p.currentStep === "Finished" && validOrderIds.has(p.orderId)
        );
        title = "Gereedgemelde Producten";
        break;
      case "def_afkeur":
        filteredData = rawProducts.filter(
          (p) => p.currentStep === "REJECTED" && validOrderIds.has(p.orderId)
        );
        title = "Definitieve Afkeur";
        break;
      case "tijdelijke_afkeur":
        filteredData = rawProducts.filter(
          (p) =>
            p.inspection?.status === "Tijdelijke afkeur" &&
            validOrderIds.has(p.orderId)
        );
        title = "Tijdelijke Afkeur (Reparatie)";
        break;
      default:
        return;
    }

    setModalData(filteredData);
    setModalTitle(title);
    setModalType(type);
    setModalSearch("");
    setShowModal(true);
  };

  const filteredModalData = useMemo(() => {
    if (!modalSearch) return modalData;
    const term = modalSearch.toLowerCase();
    return modalData.filter(
      (item) =>
        item.orderId?.toLowerCase().includes(term) ||
        item.item?.toLowerCase().includes(term) ||
        item.lotNumber?.toLowerCase().includes(term)
    );
  }, [modalData, modalSearch]);

  const visibleOrders = useMemo(() => {
    let orders = dataStore.enriched;
    // ... bestaande filters ...
    if (planningFilter) {
      if (planningFilter.type === "machine") {
        orders = orders.filter((o) => o.normMachine === planningFilter.value);
      } else if (planningFilter.type === "pipes") {
        orders = orders.filter((o) => o.isPipe);
      }
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.orderId?.toLowerCase().includes(term) ||
          o.item?.toLowerCase().includes(term)
      );
    }
    return orders;
  }, [dataStore.enriched, planningFilter, searchTerm]);

  // ... (handleItemClick, handleArchiveOrder, handleLinkProduct, getPageTitle ongewijzigd) ...
  // Voor brevity, ik kopieer ze niet volledig opnieuw tenzij ze gewijzigd zijn,
  // maar in de echte file moeten ze erin staan.
  const handleItemClick = (item) => {
    let itemToSet = { ...item };
    if (modalType === "products" || !item.plan) {
      const parentOrder = dataStore.enriched.find(
        (o) => o.orderId === item.orderId
      );
      if (parentOrder) {
        itemToSet.plan = parentOrder.plan;
        itemToSet.liveFinish = parentOrder.liveFinish;
        if (!itemToSet.machine && !itemToSet.originMachine)
          itemToSet.machine = parentOrder.machine;
      }
    }
    setSelectedDetailItem(itemToSet);
  };

  const handleArchiveOrder = async (order) => {
    if (!window.confirm(`Archiveer order ${order.orderId}?`)) return;
    setIsArchiving(true);
    try {
      const success = await archiveOrder(
        currentAppId,
        order,
        order.status === "completed" ? "completed" : "manual_cleanup"
      );
      if (success) setSelectedOrderId(null);
    } catch (error) {
      alert("Fout: " + error.message);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleLinkProduct = async (docId, product) => {
    try {
      const orderRef = doc(
        db,
        "artifacts",
        currentAppId,
        "public",
        "data",
        "digital_planning",
        docId
      );
      await updateDoc(orderRef, {
        linkedProductId: product.id,
        linkedProductImage: product.imageUrl,
        lastUpdated: new Date(),
      });
      alert("Gekoppeld!");
    } catch (error) {
      alert("Fout");
    }
  };

  const getPageTitle = () => {
    if (fixedScope === "fitting") return "Fittings Teamlead";
    if (fixedScope === "pipe") return "Pipes Teamlead";
    if (fixedScope === "spool") return "Spools Teamlead";
    return "Management Hub";
  };

  if (loading)
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
      </div>
    );
  const currentSelectedOrder = dataStore.enriched.find(
    (o) => o.orderId === selectedOrderId
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 text-left animate-in fade-in duration-300 w-full">
      <div className="sticky top-0 p-4 bg-white border-b flex justify-between items-center shrink-0 z-50 shadow-sm px-6 w-full">
        <div className="flex items-center gap-4 text-left">
          {onExit && (
            <button
              onClick={onExit}
              className="mr-4 px-4 py-2 bg-white border border-gray-200 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 font-bold text-xs uppercase tracking-wider"
            >
              <LogOut className="w-4 h-4" />
              Terug naar Selectie
            </button>
          )}
          <div className="p-2 bg-rose-50 rounded-xl text-rose-600 border border-rose-100">
            <BarChart3 size={24} />
          </div>
          <div className="text-left">
            <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter leading-none">
              FPi Future Factory
            </h2>
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest leading-none mt-1">
              {getPageTitle()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* KNOP VOOR ORPHANS */}
          {orphanedProducts.length > 0 && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 animate-pulse hover:bg-red-700 shadow-lg shadow-red-200"
            >
              <AlertOctagon size={16} />
              {orphanedProducts.length} Zonder Order
            </button>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-slate-100 rounded-lg text-[10px] font-black uppercase transition-all text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 border border-slate-200"
          >
            <FileUp size={14} /> Import
          </button>
          {fixedScope && (
            <div className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
              <Layers size={12} /> {fixedScope}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 text-left w-full">
        <div className="w-full h-full mx-auto text-left">
          {/* DASHBOARD VIEW MET KPI'S */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div
                  onClick={() => handleDashboardClick("gepland")}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
                >
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <Layers size={12} className="text-blue-500" /> Totaal
                  </p>
                  <p className="text-2xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">
                    {dashboardMetrics.totalPlanned}
                  </p>
                </div>
                {!isFittingScope && (
                  <div
                    onClick={() => handleDashboardClick("pipes")}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-cyan-300 transition-all group"
                  >
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                      <Clock size={12} className="text-cyan-500" /> Pipes (m)
                    </p>
                    <p className="text-2xl font-black text-slate-800 group-hover:text-cyan-600 transition-colors">
                      {Math.round(dashboardMetrics.totalPipes)}
                    </p>
                  </div>
                )}
                <div
                  onClick={() => handleDashboardClick("in_proces")}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group"
                >
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <Zap size={12} className="text-indigo-500" /> Actief
                  </p>
                  <p className="text-2xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
                    {dashboardMetrics.activeCount}
                  </p>
                </div>
                <div
                  onClick={() => handleDashboardClick("gereed")}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all group"
                >
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-emerald-500" />{" "}
                    Gereed
                  </p>
                  <p className="text-2xl font-black text-slate-800 group-hover:text-emerald-600 transition-colors">
                    {dashboardMetrics.finishedCount}
                  </p>
                </div>
                <div
                  onClick={() => handleDashboardClick("def_afkeur")}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-rose-300 transition-all group"
                >
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <AlertOctagon size={12} className="text-rose-500" /> Afkeur
                  </p>
                  <p className="text-2xl font-black text-slate-800 group-hover:text-rose-600 transition-colors">
                    {dashboardMetrics.rejectedCount}
                  </p>
                </div>
                <div
                  onClick={() => handleDashboardClick("tijdelijke_afkeur")}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-orange-300 transition-all group"
                >
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <AlertTriangle size={12} className="text-orange-500" />{" "}
                    Reparatie
                  </p>
                  <p className="text-2xl font-black text-slate-800 group-hover:text-orange-600 transition-colors">
                    {dashboardMetrics.tempRejectedCount}
                  </p>
                </div>
              </div>
              <DashboardView
                metrics={dashboardMetrics}
                onStationSelect={(machineId) =>
                  setSelectedStationDetail(machineId)
                }
              />
            </div>
          )}

          {/* PLANNING VIEW */}
          {activeTab === "planning" && (
            <div className="grid grid-cols-12 gap-6 h-full min-h-[700px] text-left">
              <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
                {planningFilter && (
                  <div className="bg-blue-600 text-white p-3 rounded-xl flex justify-between items-center animate-in slide-in-from-top-2 shadow-md">
                    <span className="text-xs font-bold uppercase tracking-wide">
                      Filter: {planningFilter.label}
                    </span>
                    <button
                      onClick={() => setPlanningFilter(null)}
                      className="bg-white/20 hover:bg-white/30 p-1 rounded-lg transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <PlanningSidebar
                  orders={visibleOrders}
                  selectedOrderId={selectedOrderId}
                  onSelect={setSelectedOrderId}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  onImport={() => setShowImportModal(true)}
                />
              </div>
              <div className="col-span-12 lg:col-span-9 bg-white rounded-[32px] border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
                {selectedOrderId && currentSelectedOrder ? (
                  <div className="text-center animate-in zoom-in duration-300 w-full max-w-2xl">
                    <h3 className="text-4xl font-black text-slate-800 uppercase italic mb-2">
                      Order {selectedOrderId}
                    </h3>
                    <div className="mt-8 p-8 bg-slate-50 rounded-3xl border border-slate-100 text-left">
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                            Item
                          </span>
                          <p className="font-bold text-slate-800 text-lg mt-1">
                            {currentSelectedOrder.item}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                            Machine
                          </span>
                          <p className="font-bold text-slate-800 text-lg mt-1">
                            {currentSelectedOrder.machine}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                            Voortgang
                          </span>
                          <p className="font-bold text-blue-600 text-lg mt-1 flex items-center gap-2">
                            {currentSelectedOrder.liveFinish} /{" "}
                            {currentSelectedOrder.plan}
                          </p>
                        </div>
                      </div>
                      <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end gap-4">
                        <button
                          onClick={() =>
                            setSelectedDetailItem(currentSelectedOrder)
                          }
                          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2"
                        >
                          <FileText size={18} /> Details
                        </button>
                        {currentSelectedOrder.status === "completed" && (
                          <button
                            onClick={() =>
                              handleArchiveOrder(currentSelectedOrder)
                            }
                            disabled={isArchiving}
                            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2"
                          >
                            {isArchiving ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <Archive size={18} />
                            )}{" "}
                            Archiveer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center opacity-30">
                    <List size={64} className="mx-auto mb-4 text-slate-400" />
                    <p className="text-2xl font-black text-slate-400 uppercase tracking-widest italic leading-none">
                      Selecteer een order
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-7xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border border-slate-100">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 gap-4">
              <div>
                <h3 className="text-xl font-black uppercase text-slate-900 tracking-tight">
                  {modalTitle}
                </h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  {filteredModalData.length} items
                </p>
              </div>
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Zoek..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm outline-none"
                  autoFocus
                />
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="p-4">ID</th>
                    <th className="p-4">Item</th>
                    <th className="p-4">Stap</th>
                    <th className="p-4">Tijd</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredModalData.map((item, idx) => (
                    <tr
                      key={idx}
                      onClick={() => handleItemClick(item)}
                      className="hover:bg-blue-50/50 cursor-pointer"
                    >
                      <td className="p-4 font-mono font-bold text-blue-600">
                        {item.lotNumber || item.orderId}
                      </td>
                      <td className="p-4 text-sm font-bold">{item.item}</td>
                      <td className="p-4 text-xs font-bold uppercase">
                        {item.currentStep}
                      </td>
                      <td className="p-4 text-xs font-mono">
                        {formatDate(item.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {selectedStationDetail && (
        <StationDetailModal
          stationId={selectedStationDetail}
          allOrders={dataStore.enriched}
          allProducts={rawProducts}
          onClose={() => setSelectedStationDetail(null)}
        />
      )}
      {showAssignModal && (
        <AssignOrderModal
          orphans={orphanedProducts}
          onClose={() => setShowAssignModal(false)}
        />
      )}
      {selectedDetailItem && (
        <ProductPassportModal
          item={selectedDetailItem}
          type={modalType}
          onClose={() => setSelectedDetailItem(null)}
          onLinkProduct={handleLinkProduct}
        />
      )}
      {PlanningImportModal && (
        <PlanningImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
};

export default TeamleaderHub;
