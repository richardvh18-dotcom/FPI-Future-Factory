import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Loader2,
  LogOut,
  Filter,
  Clock,
  AlertTriangle,
  Zap,
  Droplets,
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
  Package,
  CheckCircle,
  Calendar,
  Printer,
  Scan,
  ScanBarcode,
  Camera,
  ArrowRight,
  Monitor,
  Smartphone,
  Tv,
  Share,
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
  deleteField,
  orderBy,
} from "firebase/firestore";
import { db } from "../../config/firebase.js";
import { archiveOrder } from "../../utils/archiveService.js";

// Hulpfuncties
import {
  getAppId,
  normalizeMachine,
  formatDate,
  getISOWeekInfo,
  getMaterialInfo,
  FITTING_MACHINES,
  PIPE_MACHINES,
} from "../../utils/hubHelpers";

// Componenten
import DashboardView from "./DashboardView.jsx";
import PlanningSidebar from "./PlanningSidebar.jsx";
import PlanningImportModal from "./modals/PlanningImportModal.jsx";
import StatusBadge from "./common/StatusBadge.jsx";
import TeamleaderOrderDetailModal from "./modals/TeamleaderOrderDetailModal.jsx";
import ProductionStartModal from "./modals/ProductionStartModal";

// Nieuwe Modals
import TerminalSelectionModal from "./modals/TerminalSelectionModal";
import TraceModal from "./modals/TraceModal";
import AssignOrderModal from "./modals/AssignOrderModal";
import StationDetailModal from "./modals/StationDetailModal";
import ProductPassportModal from "./modals/ProductPassportModal";

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
  // State voor uitgebreide detail modal
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

  // Print State
  const [printOrder, setPrintOrder] = useState(null);

  // Terminal selectie state
  const [showTerminalSelection, setShowTerminalSelection] = useState(false);

  // Trace Modal state
  const [showTraceModal, setShowTraceModal] = useState(false);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  const navigate = useNavigate();
  const currentAppId = getAppId();
  const currentScope = String(fixedScope || "").toLowerCase();
  const isPipeScope = currentScope.includes("pipe");
  const isFittingScope = currentScope.includes("fitting");
  const isSpoolScope = currentScope.includes("spool");

  // PWA Install Prompt Listener
  useEffect(() => {
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      alert(
        "Om te installeren op iOS:\n1. Tik op de 'Deel' knop (vierkant met pijl omhoog)\n2. Kies 'Zet op beginscherm'"
      );
    }
  };

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

  // RESTORED: Full Data Logic (Enriched Orders & Machines)
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

  const orphanedProducts = useMemo(() => {
    return rawProducts.filter(
      (p) =>
        p.orderId === "NOG_TE_BEPALEN" ||
        p.isOverproduction === true ||
        !p.orderId
    );
  }, [rawProducts]);

  // RESTORED: Full Dashboard Metrics Logic
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

  const handleDashboardClick = (id) => {
    const ALL_MACHINES = [...FITTING_MACHINES, ...PIPE_MACHINES];
    const mNorm = normalizeMachine(id);
    const isMachine = ALL_MACHINES.some((m) => normalizeMachine(m) === mNorm);

    if (isMachine) {
      setSelectedStationDetail(id);
      return;
    }

    if (id === "pipes") {
      setPlanningFilter({ type: "pipes", value: true, label: "Pipes" });
      setActiveTab("planning");
      return;
    }

    let filteredData = [];
    let title = "";
    let type = "products";

    const validOrderIds = new Set(dataStore.enriched.map((o) => o.orderId));

    switch (id) {
      case "gepland":
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

  const handleItemClick = (item) => {
    if (item.plan && item.orderId) {
      setSelectedOrderDetail(item);
      return;
    }

    if (item.orderId) {
      const parentOrder = dataStore.enriched.find(
        (o) => o.orderId === item.orderId
      );

      if (parentOrder) {
        setSelectedOrderDetail(parentOrder);
      } else {
        let itemToSet = { ...item };
        setSelectedDetailItem(itemToSet);
      }
      return;
    }

    setSelectedDetailItem(item);
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
      {/* HEADER */}
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
          {(deferredPrompt || isIOS) && (
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 animate-pulse hover:bg-slate-800 shadow-md"
            >
              <Smartphone size={14} />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}
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
          {/* TERMINAL KNOP */}
          <button
            onClick={() => setShowTerminalSelection(true)}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-200 rounded-lg transition-all flex items-center gap-2 shadow-sm font-bold text-[10px] uppercase tracking-wider"
          >
            <Monitor size={14} />
            Terminal
          </button>
          {/* TRACE KNOP */}
          <button
            onClick={() => setShowTraceModal(true)}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 rounded-lg transition-all flex items-center gap-2 shadow-sm font-bold text-[10px] uppercase tracking-wider"
          >
            <Scan size={14} /> Traceer
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
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* KPI Tegels */}
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
                    <div className="mb-4 flex justify-center">
                      {(() => {
                        const matInfo = getMaterialInfo(
                          currentSelectedOrder.item
                        );
                        return (
                          <div
                            className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 ${matInfo.colorClasses}`}
                          >
                            {matInfo.icon}
                            {matInfo.label}
                          </div>
                        );
                      })()}
                    </div>

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
                        {/* PRINT KNOP TOEGEVOEGD */}
                        <button
                          onClick={() => setPrintOrder(currentSelectedOrder)}
                          className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm flex items-center gap-2"
                        >
                          <Printer size={18} /> Labels
                        </button>

                        <button
                          onClick={() =>
                            setSelectedOrderDetail(currentSelectedOrder)
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
                            )}
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
                    <th className="p-4 text-right">Acties</th>
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
                      <td className="p-4 text-sm font-bold">
                        {item.item}
                        {(() => {
                          const matInfo = getMaterialInfo(item.item);
                          if (matInfo.type !== "EST") {
                            return (
                              <span
                                className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold border inline-flex items-center gap-1 ${matInfo.colorClasses}`}
                              >
                                {matInfo.icon}
                                {matInfo.shortLabel}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </td>
                      <td className="p-4 text-xs font-bold uppercase">
                        {item.currentStep === "HOLD_AREA" ||
                        item.currentStation === "HOLD_AREA" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500 text-white font-bold text-[10px] shadow-sm">
                            <AlertTriangle size={12} />
                            HOLD AREA
                          </span>
                        ) : (
                          item.currentStep
                        )}
                      </td>
                      <td className="p-4 text-xs font-mono">
                        {formatDate(item.updatedAt)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          {/* PRINT KNOP */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrintOrder(item);
                            }}
                            className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 rounded-lg transition-all"
                            title="Labels Printen"
                          >
                            <Printer size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RENDER NIEUWE MODALS */}
      {showTerminalSelection && (
        <TerminalSelectionModal
          onClose={() => setShowTerminalSelection(false)}
        />
      )}

      {showTraceModal && (
        <TraceModal
          onClose={() => setShowTraceModal(false)}
          products={rawProducts}
          orders={dataStore.enriched}
          onFound={(item, type) =>
            type === "product"
              ? handleItemClick(item)
              : setSelectedOrderDetail(item)
          }
        />
      )}

      {selectedOrderDetail && (
        <TeamleaderOrderDetailModal
          order={selectedOrderDetail}
          onClose={() => setSelectedOrderDetail(null)}
        />
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

      {/* LABEL MODAL - TOEGEVOEGD */}
      {printOrder && (
        <ProductionStartModal
          isOpen={true}
          onClose={() => setPrintOrder(null)}
          order={printOrder}
          // TEAMLEAD activeert de "Stroken Printen" optie
          stationId="TEAMLEAD"
          onStart={() => setPrintOrder(null)}
          existingProducts={[]}
        />
      )}
    </div>
  );
};

export default TeamleaderHub;
