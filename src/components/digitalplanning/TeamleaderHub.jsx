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
  List
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
const FITTING_MACHINES = ["BM01", "BH11", "BH12", "BH15", "BH16", "BH17", "BH18", "BH31", "Mazak", "Nabewerking"];
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
  return d.toLocaleString("nl-NL", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

// --- DETAIL MODAL ---
const ProductPassportModal = ({ item, type, onClose, onLinkProduct }) => {
  const [isLinking, setIsLinking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  if (!item) return null;

  const searchCatalog = async () => {
    if (!searchQuery || searchQuery.length < 2) return;
    setSearching(true);
    try {
      const appId = getAppId();
      const productsRef = collection(db, "artifacts", appId, "public", "data", "products");
      const q = query(productsRef, where("name", ">=", searchQuery), where("name", "<=", searchQuery + "\uf8ff"), limit(10));
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSearchResults(results);
    } catch (err) {
      console.error("Zoekfout:", err);
      alert("Kan niet zoeken.");
    } finally {
      setSearching(false);
    }
  };

  const labels = [];
  if (item.currentStep === "REJECTED" || item.status === "rejected") labels.push({ text: "AFKEUR", color: "bg-rose-100 text-rose-700", icon: AlertOctagon });
  if (item.inspection?.status === "Tijdelijke afkeur" || item.status === "hold") labels.push({ text: "REPARATIE", color: "bg-orange-100 text-orange-700", icon: AlertTriangle });
  if (item.orderId && (item.orderId.includes("RUSH") || item.orderId.includes("SPOED"))) labels.push({ text: "SPOED", color: "bg-red-100 text-red-700", icon: Zap });
  if (item.currentStep === "Finished" || item.status === "completed") labels.push({ text: "GEREED", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 });

  const details = [
    { 
      group: "Identificatie", 
      fields: [
        { k: "Order ID", v: item.orderId }, 
        { k: "Item", v: item.item }, 
        { k: "Lotnummer", v: item.lotNumber }
      ] 
    },
    { 
      group: "Planning", 
      fields: [
        { k: "Machine", v: item.machine || item.originMachine }, 
        { k: "Aantal", v: item.plan || "-" }, 
        { k: "Gereed", v: item.liveFinish !== undefined ? item.liveFinish : "-" }
      ] 
    },
    { 
      group: "Status", 
      fields: [
        { k: "Stap", v: item.currentStep }, 
        { k: "Status", v: item.status }, 
        { k: "Laatste Update", v: formatDate(item.updatedAt || item.lastUpdated) }
      ] 
    },
    {
      group: "Doorlooptijd Analyse",
      fields: [
        { k: "Start Wikkelen", v: formatDate(item.startTime) },
        { k: "Tijd Gelost", v: formatDate(item.unloadedAt || item.productionFinishedAt) },
        { k: "Naar Nabewerking/Mazak", v: formatDate(item.sentToPostProcessingAt || item.transportToProcessingAt) },
        { k: "Bij Eindinspectie", v: formatDate(item.readyForInspectionAt || item.arrivedAtInspectionAt) },
        { k: "Geheel Gereed", v: formatDate(item.completedAt || (item.status === 'completed' ? item.updatedAt : null)) }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div><h2 className="text-xl font-black text-gray-800 uppercase italic">Details</h2><p className="text-xs text-gray-500 font-mono">{item.orderId}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-6 h-6 text-slate-500" /></button>
        </div>
        <div className="p-8 overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-start mb-6">
            <div><h3 className="text-xl font-bold text-slate-900">{item.item}</h3>
            {type === "orders" && <button onClick={() => setIsLinking(!isLinking)} className="text-blue-600 text-xs font-bold underline flex items-center gap-1 mt-2"><LinkIcon size={12} /> {item.linkedProductId ? "Wijzig Koppeling" : "Koppel Catalogus"}</button>}</div>
            <div className="flex gap-2 flex-wrap justify-end">{labels.map((l, i) => <span key={i} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase ${l.color}`}><l.icon size={12} /> {l.text}</span>)}</div>
          </div>
          {isLinking && (
            <div className="mb-8 p-6 bg-blue-50 rounded-2xl border border-blue-100">
              <h4 className="text-sm font-black text-blue-800 mb-4 flex items-center gap-2"><Search size={16} /> Zoek in Catalogus</h4>
              <div className="flex gap-2 mb-4">
                <input type="text" placeholder="Productnaam..." className="flex-1 p-3 rounded-xl border border-blue-200 text-sm outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchCatalog()} />
                <button onClick={searchCatalog} disabled={searching} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-700">{searching ? <Loader2 className="animate-spin" /> : "Zoek"}</button>
              </div>
              <div className="bg-white rounded-xl border border-blue-100 overflow-hidden max-h-48 overflow-y-auto">
                {searchResults.map((prod) => (
                  <div key={prod.id} className="p-3 border-b border-gray-50 hover:bg-blue-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">{prod.imageUrl ? <img src={prod.imageUrl} alt="" className="w-10 h-10 object-cover rounded-lg" /> : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><ImageIcon size={16} /></div>}<div><p className="text-sm font-bold">{prod.name}</p><p className="text-xs text-gray-400">{prod.articleCode}</p></div></div>
                    <button onClick={() => { onLinkProduct(item.id || item.orderId, prod); setIsLinking(false); }} className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-600">Koppel</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-6">
            {details.map((section, idx) => (
              <div key={idx} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
                  <Info size={12} /> {section.group}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-6">
                  {section.fields.map((field, fIdx) => (
                    <div key={fIdx}>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{field.k}</span>
                      {field.k === "Status" ? (
                        <div className="flex items-center mt-1">
                           <StatusBadge status={field.v} />
                        </div>
                      ) : (
                        <span className="block text-sm font-medium text-slate-800 break-words font-mono">{String(field.v || '-')}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
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

  const currentAppId = getAppId();

  // Robuuste Scope Detectie
  const currentScope = String(fixedScope || '').toLowerCase();
  const isPipeScope = currentScope.includes('pipe');
  const isFittingScope = currentScope.includes('fitting');
  const isSpoolScope = currentScope.includes('spool');

  useEffect(() => {
    if (!currentAppId) return;
    const unsubOrders = onSnapshot(query(collection(db, "artifacts", currentAppId, "public", "data", "digital_planning")), (snap) => {
      setRawOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => { console.error("Fout bij orders:", error); setLoading(false); });

    const unsubProds = onSnapshot(query(collection(db, "artifacts", currentAppId, "public", "data", "tracked_products")), (snap) => {
      setRawProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Fout bij producten:", error));

    return () => { unsubOrders(); unsubProds(); };
  }, [currentAppId]);

  const dataStore = useMemo(() => {
    const orderStats = {}, machineMap = {};
    const safeProducts = Array.isArray(rawProducts) ? rawProducts : [];
    
    safeProducts.forEach((p) => {
      if (!p.orderId) return;
      if (!orderStats[p.orderId]) orderStats[p.orderId] = { started: 0, finished: 0 };
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

    let enriched = rawOrders.map((o) => {
      const s = orderStats[o.orderId] || { started: 0, finished: 0 };
      const mOrig = String(o.machine || "");
      const mNorm = normalizeMachine(mOrig);

      const itemStr = (o.item || "").toUpperCase();
      const planVal = Number(o.plan || 0);
      const isDecimal = !Number.isInteger(planVal) && planVal < 50;
      const isPipe = itemStr.includes("PIPE") || itemStr.includes("BUIS") || isDecimal;
      
      return { 
        ...o, 
        isPipe, 
        liveToDo: Math.max(0, planVal - s.started), 
        liveFinish: s.finished, 
        normMachine: mNorm, 
        originalMachine: mOrig 
      };
    }).sort((a, b) => (b.importDate?.seconds || 0) - (a.importDate?.seconds || 0));

    // Scope Filtering
    if (fixedScope) {
      if (isPipeScope) {
        const pipeNorms = PIPE_MACHINES.map(m => normalizeMachine(m));
        enriched = enriched.filter(o => pipeNorms.includes(o.normMachine));
      } else if (isFittingScope) {
        enriched = enriched.filter(o => !o.item?.toUpperCase().includes("SPOOL"));
      } else if (isSpoolScope) {
        enriched = enriched.filter(o => o.item?.toUpperCase().includes("SPOOL"));
      }
    }
    return { enriched, machineMap };
  }, [rawOrders, rawProducts, fixedScope, isPipeScope, isFittingScope, isSpoolScope]);

  const dashboardMetrics = useMemo(() => {
    let STATIONS = [];
    if (isPipeScope) {
      STATIONS = PIPE_MACHINES;
    } else if (isFittingScope) {
      STATIONS = FITTING_MACHINES;
    } else {
      STATIONS = [...FITTING_MACHINES, ...PIPE_MACHINES];
    }
    
    const machineMetrics = STATIONS.map((mId) => {
      const mNorm = normalizeMachine(mId);
      const mStats = dataStore.machineMap[mNorm] || { running: 0, finished: 0 };
      const mOrders = dataStore.enriched.filter((o) => o.normMachine === mNorm);
      return { id: mId, plan: mOrders.reduce((s, o) => s + (o.isPipe ? 0 : Number(o.plan || 0)), 0), fin: mStats.finished, running: mStats.running };
    });
    
    let totalFittings = 0;
    let totalPipesMeters = 0;

    dataStore.enriched.forEach((o) => {
      const val = Number(o.plan || 0);
      if (o.isPipe) {
        totalPipesMeters += val;
      } else {
        totalFittings += val;
      }
    });

    const validOrderIds = new Set(dataStore.enriched.map(o => o.orderId));
    const scopedProducts = rawProducts.filter(p => validOrderIds.has(p.orderId));
    
    return {
      totalPlanned: Math.round(totalFittings + totalPipesMeters),
      totalPipes: totalPipesMeters, 
      activeCount: scopedProducts.filter((p) => p.currentStep !== "Finished").length,
      rejectedCount: scopedProducts.filter((p) => p.currentStep === "REJECTED").length,
      finishedCount: scopedProducts.filter((p) => p.currentStep === "Finished").length,
      tempRejectedCount: scopedProducts.filter((p) => p.inspection?.status === "Tijdelijke afkeur").length,
      machineMetrics
    };
  }, [dataStore, rawProducts, isPipeScope, isFittingScope]);

  // AANGEPAST: Logica gesplitst
  const handleDashboardClick = (id) => {
    // 1. Machine Tegels -> Ga naar planning van die machine
    const ALL_MACHINES = [...FITTING_MACHINES, ...PIPE_MACHINES];
    const mNorm = normalizeMachine(id);
    const isMachine = ALL_MACHINES.some(m => normalizeMachine(m) === mNorm);

    if (isMachine) {
      setPlanningFilter({ type: 'machine', value: mNorm, label: `Machine ${id}` });
      setActiveTab("planning");
      return;
    }

    // 2. Planning Tegels (Gepland, Pipes) -> Ga naar Planning
    if (id === 'gepland') {
        setPlanningFilter(null); // Reset filter, toon alles
        setActiveTab("planning");
        return;
    }
    if (id === 'pipes') {
        setPlanningFilter({ type: 'pipes', value: true, label: "Pipes" });
        setActiveTab("planning");
        return;
    }
    
    // 3. KPI Tegels (Actief, Gereed, Afkeur) -> Open Pop-up (Zoals vroeger)
    let filteredData = [];
    let title = "";
    let type = "products";

    const validOrderIds = new Set(dataStore.enriched.map(o => o.orderId));

    switch (id) {
      case "in_proces":
        filteredData = rawProducts.filter(
          (p) => p.currentStep !== "Finished" && p.currentStep !== "REJECTED" && validOrderIds.has(p.orderId)
        );
        title = "Live Productie Inzicht (Actief)";
        break;
      case "gereed":
        filteredData = rawProducts.filter((p) => p.currentStep === "Finished" && validOrderIds.has(p.orderId));
        title = "Gereedgemelde Producten";
        break;
      case "def_afkeur":
        filteredData = rawProducts.filter((p) => p.currentStep === "REJECTED" && validOrderIds.has(p.orderId));
        title = "Definitieve Afkeur";
        break;
      case "tijdelijke_afkeur":
        filteredData = rawProducts.filter(
          (p) => p.inspection?.status === "Tijdelijke afkeur" && validOrderIds.has(p.orderId)
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
    return modalData.filter((item) => (item.orderId?.toLowerCase().includes(term) || item.item?.toLowerCase().includes(term) || item.lotNumber?.toLowerCase().includes(term)));
  }, [modalData, modalSearch]);

  const visibleOrders = useMemo(() => {
    let orders = dataStore.enriched;

    if (planningFilter) {
        if (planningFilter.type === 'machine') {
             orders = orders.filter(o => o.normMachine === planningFilter.value);
        } else if (planningFilter.type === 'pipes') {
             orders = orders.filter(o => o.isPipe);
        }
    }
    
    // Altijd zoeken
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        orders = orders.filter(o => 
            o.orderId?.toLowerCase().includes(term) || 
            o.item?.toLowerCase().includes(term)
        );
    }

    return orders;
  }, [dataStore.enriched, planningFilter, searchTerm]);

  // Helper voor item klik in modal
  const handleItemClick = (item) => {
    let itemToSet = { ...item };
    // Verrijk met order data als het een product is (modal)
    if (modalType === 'products' || !item.plan) {
        const parentOrder = dataStore.enriched.find(o => o.orderId === item.orderId);
        if (parentOrder) {
            itemToSet.plan = parentOrder.plan;
            itemToSet.liveFinish = parentOrder.liveFinish;
            if (!itemToSet.machine && !itemToSet.originMachine) {
                itemToSet.machine = parentOrder.machine;
            }
        }
    }
    setSelectedDetailItem(itemToSet);
  };

  const handleArchiveOrder = async (order) => {
    if (!window.confirm(`Archiveer order ${order.orderId}?`)) return;
    setIsArchiving(true);
    try {
      const success = await archiveOrder(currentAppId, order, order.status === "completed" ? "completed" : "manual_cleanup");
      if (success) setSelectedOrderId(null);
    } catch (error) { alert("Fout: " + error.message); } finally { setIsArchiving(false); }
  };

  const handleLinkProduct = async (docId, product) => {
    try {
      const orderRef = doc(db, "artifacts", currentAppId, "public", "data", "digital_planning", docId);
      await updateDoc(orderRef, { linkedProductId: product.id, linkedProductImage: product.imageUrl, lastUpdated: new Date() });
      alert("Gekoppeld: " + product.name);
    } catch (error) { console.error(error); alert("Fout bij koppelen"); }
  };

  const getPageTitle = () => {
    if (fixedScope === 'fitting') return 'Fittings Teamlead';
    if (fixedScope === 'pipe') return 'Pipes Teamlead';
    if (fixedScope === 'spool') return 'Spools Teamlead';
    return "Management Hub";
  };

  if (loading) return <div className="flex h-full items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600 mb-4" size={48} /></div>;
  const currentSelectedOrder = dataStore.enriched.find((o) => o.orderId === selectedOrderId);

  return (
    <div className="flex flex-col h-full bg-slate-50 text-left animate-in fade-in duration-300 w-full">
      <div className="sticky top-0 p-4 bg-white border-b flex justify-between items-center shrink-0 z-50 shadow-sm px-6 w-full">
        <div className="flex items-center gap-4 text-left">
          {onExit && <button onClick={onExit} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors tooltip flex items-center gap-2 font-bold"><LogOut className="w-6 h-6" /></button>}
          <div className="p-2 bg-rose-50 rounded-xl text-rose-600 border border-rose-100"><BarChart3 size={24} /></div>
          <div className="text-left"><h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter leading-none">FPi Future Factory</h2><p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest leading-none mt-1">{getPageTitle()}</p></div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button onClick={() => setActiveTab("dashboard")} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === "dashboard" ? "bg-white text-rose-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>Dashboard</button>
          <button onClick={() => setActiveTab("planning")} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === "planning" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>Planning</button>
          <button onClick={() => setShowImportModal(true)} className="px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"><FileUp size={14} /> Import</button>
        </div>
        <div className="flex items-center gap-3">
           {fixedScope && <div className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2"><Layers size={12} /> {fixedScope}</div>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 text-left w-full">
        <div className="w-full h-full mx-auto text-left">
          
          {/* DASHBOARD VIEW MET KPI'S */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* KPI Tegels (De cijfers) */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div onClick={() => handleDashboardClick('gepland')} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2"><Layers size={12} className="text-blue-500" /> Totaal</p>
                  <p className="text-2xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">{dashboardMetrics.totalPlanned}</p>
                </div>
                
                {/* PIPES KPI - Alleen tonen als scope NIET fitting is */}
                {!isFittingScope && (
                  <div onClick={() => handleDashboardClick('pipes')} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-cyan-300 transition-all group">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2"><Clock size={12} className="text-cyan-500" /> Pipes (m)</p>
                    <p className="text-2xl font-black text-slate-800 group-hover:text-cyan-600 transition-colors">{Math.round(dashboardMetrics.totalPipes)}</p>
                  </div>
                )}

                <div onClick={() => handleDashboardClick('in_proces')} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2"><Zap size={12} className="text-indigo-500" /> Actief</p>
                  <p className="text-2xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{dashboardMetrics.activeCount}</p>
                </div>
                <div onClick={() => handleDashboardClick('gereed')} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all group">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-500" /> Gereed</p>
                  <p className="text-2xl font-black text-slate-800 group-hover:text-emerald-600 transition-colors">{dashboardMetrics.finishedCount}</p>
                </div>
                <div onClick={() => handleDashboardClick('def_afkeur')} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-rose-300 transition-all group">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2"><AlertOctagon size={12} className="text-rose-500" /> Afkeur</p>
                  <p className="text-2xl font-black text-slate-800 group-hover:text-rose-600 transition-colors">{dashboardMetrics.rejectedCount}</p>
                </div>
                <div onClick={() => handleDashboardClick('tijdelijke_afkeur')} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-orange-300 transition-all group">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2"><AlertTriangle size={12} className="text-orange-500" /> Reparatie</p>
                  <p className="text-2xl font-black text-slate-800 group-hover:text-orange-600 transition-colors">{dashboardMetrics.tempRejectedCount}</p>
                </div>
              </div>

              {/* Machine Overzicht - Toont nu alleen relevante machines! */}
              <DashboardView 
                metrics={dashboardMetrics} 
                onStationSelect={(machineId) => {
                   // Direct naar planning van deze machine
                   const mNorm = normalizeMachine(machineId);
                   setPlanningFilter({ type: 'machine', value: mNorm, label: `Machine ${machineId}` });
                   setActiveTab("planning");
                }} 
              />
            </div>
          )}

          {/* PLANNING VIEW */}
          {activeTab === "planning" && (
            <div className="grid grid-cols-12 gap-6 h-full min-h-[700px] text-left">
              <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
                {/* Filter Feedback Balkje */}
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
                
                {/* De sidebar krijgt nu de gefilterde lijst 'visibleOrders' */}
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
                    <h3 className="text-4xl font-black text-slate-800 uppercase italic mb-2">Order {selectedOrderId}</h3>
                    <div className="mt-8 p-8 bg-slate-50 rounded-3xl border border-slate-100 text-left">
                      <div className="grid grid-cols-2 gap-8">
                        <div><span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Item</span><p className="font-bold text-slate-800 text-lg mt-1">{currentSelectedOrder.item}</p></div>
                        <div><span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Machine</span><p className="font-bold text-slate-800 text-lg mt-1">{currentSelectedOrder.machine}</p></div>
                        <div><span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Voortgang</span><p className="font-bold text-blue-600 text-lg mt-1 flex items-center gap-2">{currentSelectedOrder.liveFinish} / {currentSelectedOrder.plan}</p></div>
                      </div>
                      <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end gap-4">
                        <button onClick={() => setSelectedDetailItem(currentSelectedOrder)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2"><FileText size={18} /> Details</button>
                        {currentSelectedOrder.status === "completed" && <button onClick={() => handleArchiveOrder(currentSelectedOrder)} disabled={isArchiving} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2">{isArchiving ? <Loader2 className="animate-spin" /> : <Archive size={18} />} Archiveer</button>}
                      </div>
                    </div>
                  </div>
                ) : <div className="text-center opacity-30"><List size={64} className="mx-auto mb-4 text-slate-400" /><p className="text-2xl font-black text-slate-400 uppercase tracking-widest italic leading-none">Selecteer een order</p></div>}
              </div>
            </div>
          )}
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-7xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border border-slate-100">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 gap-4">
              <div><h3 className="text-xl font-black uppercase text-slate-900 tracking-tight">{modalTitle}</h3><p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{filteredModalData.length} items</p></div>
              <div className="flex-1 max-w-md relative"><Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" /><input type="text" placeholder="Zoek..." value={modalSearch} onChange={(e) => setModalSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm outline-none" autoFocus /></div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-6 h-6 text-slate-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white shadow-sm z-10"><tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider"><th className="p-4">ID</th><th className="p-4">Item</th><th className="p-4">Stap</th><th className="p-4">Tijd</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{filteredModalData.map((item, idx) => (<tr key={idx} onClick={() => handleItemClick(item)} className="hover:bg-blue-50/50 cursor-pointer"><td className="p-4 font-mono font-bold text-blue-600">{item.lotNumber || item.orderId}</td><td className="p-4 text-sm font-bold">{item.item}</td><td className="p-4 text-xs font-bold uppercase">{item.currentStep}</td><td className="p-4 text-xs font-mono">{formatDate(item.updatedAt)}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {selectedDetailItem && <ProductPassportModal item={selectedDetailItem} type={modalType} onClose={() => setSelectedDetailItem(null)} onLinkProduct={handleLinkProduct} />}
      {PlanningImportModal && <PlanningImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onSuccess={() => setShowImportModal(false)} />}
    </div>
  );
};

export default TeamleaderHub;