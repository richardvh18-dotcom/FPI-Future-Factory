import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  ArrowLeft,
  LayoutGrid,
  BarChart3,
  Activity,
  Monitor,
  Database,
  Loader2,
  ShieldCheck,
  Settings,
  Factory,
  Search,
  FileUp,
  CheckCircle2,
  Clock,
  Trash2,
  Zap,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronRight,
  X,
  Calendar,
  FileText,
  Tag,
  ArrowRight,
  History,
  Timer,
  Package,
  RotateCcw,
  Info,
  ClipboardList,
  MessageSquare,
  Camera,
  Play,
  Box,
} from "lucide-react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  increment,
  addDoc,
} from "firebase/firestore";
import { db, appId } from "../../config/firebase";
import { useAdminAuth } from "../../hooks/useAdminAuth";

/**
 * ============================================================================
 * INTERN COMPONENT: TERMINAL (Compact)
 * ============================================================================
 */
const Terminal = ({
  currentStation,
  products,
  onNextStep,
  notify,
  loading,
}) => {
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleConfirm = () => {
    if (!input || loading) return;
    const cleanInput = input.trim().toUpperCase();
    const productMatch = products.find((p) => p.lotNumber === cleanInput);

    if (productMatch) {
      onNextStep(productMatch);
      setInput("");
    } else {
      notify("Lotnummer onbekend", "error");
    }
  };

  return (
    <div className="w-full flex items-center justify-center py-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full max-w-4xl bg-white p-8 rounded-[32px] border border-slate-200 shadow-xl">
        <div className="bg-slate-900 rounded-[24px] aspect-square relative overflow-hidden border-4 border-slate-50 shadow-inner group">
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
            <div className="w-full h-full border-2 border-blue-500/30 rounded-[20px] relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
              <div className="absolute left-4 right-4 h-0.5 bg-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,1)] animate-scan-move top-1/2" />
              <div className="h-full flex flex-col items-center justify-center opacity-20">
                <Camera size={48} className="text-white mb-2" />
                <p className="text-white text-[8px] font-black uppercase tracking-widest">
                  Scanner Ready
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col h-full justify-center space-y-6">
          <div className="text-left">
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-800">
              Scan <span className="text-blue-600">Unit</span>
            </h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">
              Station: {currentStation?.id}
            </p>
          </div>
          <div className="space-y-4">
            <input
              ref={inputRef}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-center text-xl font-black tracking-widest uppercase outline-none focus:border-blue-500 transition-all shadow-inner"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              placeholder="LOT NUMMER"
              maxLength={15}
            />
            <button
              disabled={input.length < 10 || loading}
              onClick={handleConfirm}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  Bevestig Stap <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes scan-move { 0% { top: 15%; opacity: 0; } 50% { opacity: 1; } 100% { top: 85%; opacity: 0; } }
        .animate-scan-move { animation: scan-move 3s infinite linear; position: absolute; }
      `}</style>
    </div>
  );
};

/**
 * ============================================================================
 * INTERN COMPONENT: DASHBOARD VIEW (Compact V6.7)
 * ============================================================================
 */
const DashboardView = ({ metrics, onTileClick, products }) => {
  if (!metrics) return null;

  return (
    <div className="w-full space-y-6 animate-in zoom-in-95 duration-500 pb-10">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          {
            id: "gepland",
            label: "Plan Totaal",
            val: metrics.totalPlanned,
            color: "text-slate-800",
            border: "border-slate-200",
          },
          {
            id: "in_proces",
            label: "Running",
            val: metrics.activeCount,
            color: "text-blue-600",
            border: "border-blue-200",
          },
          {
            id: "tijdelijke_afkeur",
            label: "Reparatie",
            val: metrics.tempRejectedCount,
            color: "text-orange-600",
            border: "border-orange-200",
            bg: "bg-orange-50/20",
          },
          {
            id: "def_afkeur",
            label: "Def. Afkeur",
            val: metrics.rejectedCount,
            color: "text-rose-600",
            border: "border-rose-200",
          },
          {
            id: "gereed",
            label: "Gereed",
            val: metrics.finishedCount,
            color: "text-emerald-600",
            border: "border-emerald-200",
          },
        ].map((tile) => (
          <div
            key={tile.id}
            onClick={() => onTileClick(tile.id)}
            className={`bg-white p-5 rounded-2xl border-2 ${tile.border} ${
              tile.bg || ""
            } shadow-sm flex flex-col justify-between group cursor-pointer hover:border-blue-400 transition-all`}
          >
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 italic text-left">
              {tile.label}
            </span>
            <h3 className={`text-2xl font-black ${tile.color} text-left`}>
              {tile.val || 0}
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-9 space-y-4">
          <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2 italic px-2">
            <Factory size={14} className="text-blue-500" /> Machine Voortgang
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.machineMetrics?.map((m) => {
              const progress = Math.min(
                100,
                (m.fin / Math.max(1, m.plan)) * 100
              );
              return (
                <div
                  key={m.id}
                  className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:border-blue-300 transition-all text-left"
                >
                  <div className="flex justify-between items-center mb-4 text-left">
                    <span className="font-black text-sm uppercase italic tracking-tighter text-slate-800">
                      {m.id}
                    </span>
                    <span className="text-[10px] font-black text-slate-400">
                      {m.fin} / {m.plan}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden shadow-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          progress === 100 ? "bg-emerald-500" : "bg-blue-600"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] font-black uppercase opacity-40">
                      <span>{m.running} Actief</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="xl:col-span-3 space-y-4">
          <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2 italic px-2">
            <ChevronRight size={14} className="text-emerald-500" /> Proces
            Status
          </h4>
          <div className="space-y-2">
            {["Wikkelen", "Lossen", "Nabewerken", "Eindinspectie"].map(
              (step) => (
                <div
                  key={step}
                  className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm hover:border-emerald-500 transition-all"
                >
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    {step}
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    {products.filter((p) => p.currentStep === step).length}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ============================================================================
 * INTERN COMPONENT: PLANNING SIDEBAR (Compact V6.7)
 * ============================================================================
 */
const PlanningSidebar = ({
  orders,
  selectedOrderId,
  onSelect,
  searchTerm,
  setSearchTerm,
  onImport,
}) => {
  const [visibleCount, setVisibleCount] = useState(40);
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        (o.orderId || "").toLowerCase().includes(q) ||
        (o.item || "").toLowerCase().includes(q)
    );
  }, [orders, searchTerm]);

  useEffect(() => setVisibleCount(40), [searchTerm]);

  return (
    <div className="col-span-12 lg:col-span-3 bg-white rounded-3xl border border-slate-200 p-6 flex flex-col h-[calc(100vh-140px)] overflow-hidden shadow-sm text-left">
      <div className="flex justify-between items-center mb-6">
        <div className="text-left">
          <h3 className="font-black text-[10px] uppercase text-slate-400 italic tracking-widest">
            Werklijst
          </h3>
          <p className="text-xs font-black text-slate-900 uppercase">
            {filtered.length} Orders
          </p>
        </div>
        {onImport && (
          <button
            onClick={onImport}
            className="p-2 bg-slate-900 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-md active:scale-95"
          >
            <FileUp size={16} />
          </button>
        )}
      </div>
      <div className="relative mb-6 text-left">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
          size={16}
        />
        <input
          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-blue-400 transition-all shadow-inner"
          placeholder="Zoeken..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {filtered.slice(0, visibleCount).map((o) => (
          <div
            key={o.id}
            onClick={() => onSelect(o.orderId)}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer group ${
              selectedOrderId === o.orderId
                ? "border-blue-500 bg-blue-50/50"
                : "border-transparent bg-slate-50 hover:border-slate-200"
            }`}
          >
            <div className="flex justify-between mb-1">
              <span className="text-[9px] font-mono font-black text-blue-600 uppercase">
                {o.orderId}
              </span>
              <span className="text-[8px] font-black uppercase text-slate-400 italic">
                {o.machine}
              </span>
            </div>
            <h4 className="font-black text-[11px] text-slate-800 leading-tight italic uppercase line-clamp-2">
              {o.item}
            </h4>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-1000"
                  style={{
                    width: `${(o.liveFinish / Math.max(1, o.plan)) * 100}%`,
                  }}
                />
              </div>
              <span className="text-[9px] font-black text-slate-400">
                {o.liveFinish}/{o.plan}
              </span>
            </div>
          </div>
        ))}
        {filtered.length > visibleCount && (
          <button
            onClick={() => setVisibleCount((p) => p + 50)}
            className="w-full py-3 text-[10px] font-black uppercase text-blue-500 bg-blue-50 rounded-xl border-2 border-blue-100 border-dashed hover:bg-blue-100 transition-all"
          >
            Laad meer orders
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * ============================================================================
 * MAIN HUB COMPONENT: V6.7 (COMPACT & FLUID)
 * ============================================================================
 */
const DigitalPlanningHub = ({ onBack }) => {
  const { role } = useAdminAuth();
  const isManager = role === "admin" || role === "teamleader";

  const [currentStation, setCurrentStation] = useState(null);
  const [activeTab, setActiveTab] = useState("planning");
  const [rawOrders, setRawOrders] = useState([]);
  const [rawProducts, setRawProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusMsg, setStatusMsg] = useState(null);

  // Sync Logica
  useEffect(() => {
    if (!appId) return;
    const unsubOrders = onSnapshot(
      query(
        collection(db, "artifacts", appId, "public", "data", "digital_planning")
      ),
      (snap) => {
        setRawOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    const unsubProds = onSnapshot(
      query(
        collection(db, "artifacts", appId, "public", "data", "tracked_products")
      ),
      (snap) => {
        setRawProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => {
      unsubOrders();
      unsubProds();
    };
  }, []);

  const dataStore = useMemo(() => {
    const orderStats = {};
    const machineMap = {};
    rawProducts.forEach((p) => {
      if (!p.orderId) return;
      if (!orderStats[p.orderId])
        orderStats[p.orderId] = { started: 0, finished: 0 };
      orderStats[p.orderId].started++;
      if (p.currentStep === "Finished") orderStats[p.orderId].finished++;
      const m = String(p.originMachine || "000").replace(/\D/g, "");
      if (!machineMap[m]) machineMap[m] = { running: 0, finished: 0 };
      if (p.currentStep === "Finished") machineMap[m].finished++;
      else machineMap[m].running++;
    });
    const enriched = rawOrders
      .map((o) => {
        const s = orderStats[o.orderId] || { started: 0, finished: 0 };
        return {
          ...o,
          liveToDo: Math.max(0, Number(o.plan || 0) - s.started),
          liveFinish: s.finished,
          normMachine: String(o.machine || "").replace(/\D/g, ""),
        };
      })
      .sort(
        (a, b) => (b.importDate?.seconds || 0) - (a.importDate?.seconds || 0)
      );

    const enrichedMap = {};
    enriched.forEach((o) => {
      enrichedMap[o.orderId] = o;
    });
    return { enriched, enrichedMap, machineMap };
  }, [rawOrders, rawProducts]);

  const dashboardMetrics = useMemo(() => {
    if (activeTab !== "dashboard") return null;
    const STATIONS_LIST = [
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
    const machineMetrics = STATIONS_LIST.map((mId) => {
      const mNorm = mId.replace(/\D/g, "");
      const mStats = dataStore.machineMap[mNorm] || { running: 0, finished: 0 };
      const mOrders = dataStore.enriched.filter((o) => o.normMachine === mNorm);
      return {
        id: mId,
        plan: mOrders.reduce((s, o) => s + Number(o.plan || 0), 0),
        fin: mStats.finished,
        running: mStats.running,
      };
    });
    return {
      totalPlanned: dataStore.enriched.reduce(
        (s, o) => s + Number(o.plan || 0),
        0
      ),
      activeCount: rawProducts.filter((p) => p.currentStep !== "Finished")
        .length,
      rejectedCount: rawProducts.filter((p) => p.currentStep === "REJECTED")
        .length,
      finishedCount: rawProducts.filter((p) => p.currentStep === "Finished")
        .length,
      tempRejectedCount: rawProducts.filter(
        (p) => p.inspection?.status === "Tijdelijke afkeur"
      ).length,
      machineMetrics,
    };
  }, [dataStore, rawProducts, activeTab]);

  const handleTabChange = useCallback(
    (tab) => {
      if (tab === activeTab) return;
      setIsProcessing(true);
      setActiveTab(tab);
      setTimeout(() => setIsProcessing(false), 200);
    },
    [activeTab]
  );

  const stationOrders = useMemo(() => {
    if (!currentStation) return [];
    if (currentStation.id === "TEAMLEAD" || currentStation.type === "master")
      return dataStore.enriched;
    const mNorm = currentStation.id.replace(/\D/g, "");
    return dataStore.enriched.filter((o) => o.normMachine === mNorm);
  }, [dataStore.enriched, currentStation]);

  if (loading && !currentStation)
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 h-full">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );

  // VIEW 1: STATION SELECTOR (COMPACT)
  if (!currentStation) {
    const GRID = [
      {
        id: "TEAMLEAD",
        name: "Management",
        type: "master",
        color: "text-rose-600",
        bg: "bg-rose-50",
        icon: <BarChart3 size={32} />,
      },
      {
        id: "BM01",
        name: "QC Master",
        type: "master",
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        icon: <Monitor size={32} />,
      },
      { id: "BH11", name: "M-11", type: "machine" },
      { id: "BH12", name: "M-12", type: "machine" },
      { id: "BH15", name: "M-15", type: "machine" },
      { id: "BH16", name: "M-16", type: "machine" },
      { id: "BH17", name: "M-17", type: "machine" },
      { id: "BH18", name: "M-18", type: "machine" },
      { id: "BH31", name: "M-31", type: "machine" },
      { id: "Mazak", name: "CNC", type: "machine" },
    ];

    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-6 h-full overflow-y-auto animate-in fade-in duration-500">
        <div className="w-full max-w-5xl flex flex-col items-center">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter leading-none mb-2">
              FPI{" "}
              <span className="text-blue-600 tracking-normal">
                Technical Hub
              </span>
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[8px] italic opacity-60">
              Digital Process Control V6.7
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full">
            {GRID.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setCurrentStation(s);
                  setActiveTab(s.id === "TEAMLEAD" ? "dashboard" : "planning");
                }}
                className="p-6 bg-white rounded-3xl border-2 border-slate-100 hover:border-blue-400 hover:shadow-xl transition-all shadow-sm active:scale-95 group flex flex-col items-center text-center"
              >
                <div
                  className={`p-4 ${s.bg || "bg-blue-50"} ${
                    s.color || "text-blue-600"
                  } rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-sm`}
                >
                  {s.icon || <Activity size={32} />}
                </div>
                <h3 className="text-lg font-black uppercase italic text-slate-800 tracking-tighter leading-none mb-1">
                  {s.id}
                </h3>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-60 italic">
                  {s.name}
                </p>
              </button>
            ))}
          </div>
          <button
            onClick={onBack}
            className="mt-12 p-3 text-slate-400 hover:text-slate-900 transition-all font-black uppercase text-[10px] flex items-center gap-3 border-none bg-transparent shadow-none"
          >
            <ArrowLeft size={16} /> Terug naar Catalogus
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative text-left animate-in fade-in duration-300">
      {/* HEADER (Sticky & Compact) */}
      <div className="sticky top-0 p-4 bg-white border-b flex justify-between items-center shrink-0 z-50 shadow-sm text-left w-full px-6 lg:px-10">
        <div className="flex items-center gap-4 text-left">
          <button
            onClick={() => setCurrentStation(null)}
            className="p-2.5 hover:bg-slate-50 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 border border-slate-100 transition-all shadow-sm bg-white"
          >
            <LayoutGrid size={18} /> Menu
          </button>
          <div className="h-6 w-px bg-slate-100 mx-1" />
          <h2
            className={`text-xl font-black tracking-tighter uppercase italic ${
              currentStation.id === "TEAMLEAD"
                ? "text-rose-600"
                : "text-slate-900"
            }`}
          >
            {currentStation.id}
          </h2>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-left">
          {currentStation.id === "TEAMLEAD" && (
            <button
              onClick={() => handleTabChange("dashboard")}
              className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                activeTab === "dashboard"
                  ? "bg-white text-rose-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Dashboard
            </button>
          )}
          <button
            onClick={() => handleTabChange("planning")}
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
              activeTab === "planning"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Planning
          </button>
          <button
            onClick={() => handleTabChange("terminal")}
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
              activeTab === "terminal"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Terminal
          </button>
        </div>

        <div className="flex items-center gap-3 text-left">
          {statusMsg && (
            <div
              className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border-2 shadow-sm animate-in zoom-in ${
                statusMsg.type === "success"
                  ? "bg-emerald-600 text-white border-emerald-500"
                  : "bg-red-600 text-white border-red-500"
              }`}
            >
              {statusMsg.text}
            </div>
          )}
          <div className="bg-slate-900 text-white p-2 rounded-xl border border-slate-700 shadow-sm">
            <ShieldCheck size={18} className="text-emerald-400" />
          </div>
        </div>
      </div>

      {/* CONTENT AREA (Fluid) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative bg-slate-50/50">
        <div className="w-full">
          {isProcessing ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
              <Loader2 className="animate-spin mb-6" size={48} />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] italic animate-pulse text-center">
                Rendering Viewport...
              </p>
            </div>
          ) : activeTab === "dashboard" ? (
            <DashboardView
              metrics={dashboardMetrics}
              products={rawProducts}
              onTileClick={() => {}}
            />
          ) : activeTab === "terminal" ? (
            <div className="flex justify-center w-full min-h-[500px] items-center">
              <Terminal
                currentStation={currentStation}
                products={rawProducts}
                onNextStep={() => {}}
                notify={setStatusMsg}
                loading={loading}
              />
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-6 h-full w-full text-left min-h-[700px]">
              <PlanningSidebar
                orders={stationOrders}
                selectedOrderId={selectedOrderId}
                onSelect={setSelectedOrderId}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onImport={currentStation.id === "TEAMLEAD" ? () => {} : null}
              />

              <div className="col-span-12 lg:col-span-9 bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden h-full flex flex-col min-h-[600px] text-left">
                {selectedOrderId ? (
                  <div className="p-8 lg:p-10 animate-in slide-in-from-right duration-500 h-full flex flex-col text-left">
                    <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-6 text-left">
                      <div className="text-left flex-1 pr-4">
                        <div className="flex items-center gap-3 mb-4 text-left">
                          <span className="bg-slate-900 text-white px-3 py-1 rounded-lg font-mono text-[10px] font-black uppercase tracking-widest">
                            {selectedOrderId}
                          </span>
                          {dataStore.enrichedMap[selectedOrderId]
                            ?.referenceCode && (
                            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-[9px] font-black uppercase border border-amber-200">
                              Ref:{" "}
                              {
                                dataStore.enrichedMap[selectedOrderId]
                                  .referenceCode
                              }
                            </span>
                          )}
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none text-left mb-6">
                          {dataStore.enrichedMap[selectedOrderId]?.item}
                        </h2>
                        <div className="flex flex-wrap gap-4 text-left">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 italic text-left bg-slate-50 px-4 py-2 rounded-xl border">
                            <FileText size={14} /> Tek:{" "}
                            {dataStore.enrichedMap[selectedOrderId]?.drawing ||
                              "GEEN DATA"}
                          </p>
                          {dataStore.enrichedMap[selectedOrderId]?.project && (
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2 italic text-left bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                              <Package size={14} /> Proj:{" "}
                              {dataStore.enrichedMap[selectedOrderId].project}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex bg-slate-900 p-4 rounded-3xl border-2 border-slate-800 gap-8 shadow-xl text-left text-white">
                        <div className="text-center px-4 border-r border-white/10 text-left">
                          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic text-left">
                            Plan
                          </span>
                          <span className="text-3xl font-black text-white text-left tracking-tighter">
                            {dataStore.enrichedMap[selectedOrderId]?.plan}
                          </span>
                        </div>
                        <div className="text-center px-4 text-left">
                          <span className="block text-[8px] font-black text-orange-400 uppercase tracking-widest mb-1 italic text-left">
                            To Do
                          </span>
                          <span className="text-3xl font-black text-orange-400 text-left tracking-tighter">
                            {dataStore.enrichedMap[selectedOrderId]?.liveToDo}
                          </span>
                        </div>
                      </div>
                    </div>

                    {dataStore.enrichedMap[selectedOrderId]?.poText && (
                      <div className="mb-6 p-5 bg-slate-50 rounded-3xl border border-slate-100 flex gap-4 text-left animate-in fade-in duration-700">
                        <MessageSquare
                          size={20}
                          className="text-slate-300 shrink-0"
                        />
                        <div className="text-left">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 italic">
                            Productie Opmerkingen
                          </span>
                          <p className="text-sm font-bold text-slate-600 leading-relaxed italic text-left">
                            "{dataStore.enrichedMap[selectedOrderId].poText}"
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex-1 flex flex-col justify-center items-center py-6 text-center">
                      {currentStation.type === "machine" && (
                        <button
                          onClick={() => {}}
                          className="w-full max-w-xl py-8 bg-blue-600 text-white rounded-3xl font-black text-2xl uppercase tracking-widest shadow-xl hover:bg-blue-700 hover:shadow-blue-300 transition-all active:scale-95 flex items-center justify-center gap-6 group"
                        >
                          <Zap
                            size={32}
                            fill="currentColor"
                            className="group-hover:rotate-12 transition-transform"
                          />
                          <span>Start Productie</span>
                          <ArrowRight size={24} />
                        </button>
                      )}
                    </div>

                    <div className="mt-auto p-5 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4 italic text-left">
                      <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600 border border-blue-50">
                        <Info size={24} />
                      </div>
                      <p className="text-[10px] font-bold text-blue-800 uppercase leading-relaxed tracking-wider text-left">
                        Live Master Data Sync: Alle wijzigingen in Infor-LN
                        worden real-time verwerkt in dit werkstation.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-200 opacity-20 py-20 text-center">
                    <Database size={150} strokeWidth={1} />
                    <p className="text-xl font-black uppercase tracking-[0.5em] mt-6 italic leading-none">
                      Selecteer Werkorder
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DigitalPlanningHub;
