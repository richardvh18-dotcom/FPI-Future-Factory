import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  List,
  BarChart3,
  Loader2,
  Users,
  LayoutGrid,
  X,
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
  CheckCircle,
  BookOpen,
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
import { useAdminAuth } from "../../hooks/useAdminAuth.js";
import { archiveOrder } from "../../utils/archiveService.js";

import DashboardView from "./DashboardView.jsx";
import PlanningSidebar from "./PlanningSidebar.jsx";
import PlanningImportModal from "./modals/PlanningImportModal";

// Fallback voor appId
const getAppId = () => {
  if (typeof window !== "undefined" && window.__app_id) return window.__app_id;
  return "fittings-app-v1";
};

/**
 * ProductPassportModal
 * Pop-up voor alle details + Koppelen met Catalogus
 */
const ProductPassportModal = ({ item, type, onClose, onLinkProduct }) => {
  const [isLinking, setIsLinking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  if (!item) return null;

  // Zoekfunctie Catalogus
  const searchCatalog = async () => {
    if (!searchQuery || searchQuery.length < 2) return;
    setSearching(true);
    try {
      const appId = getAppId();
      const productsRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "products"
      );

      const q = query(
        productsRef,
        where("name", ">=", searchQuery),
        where("name", "<=", searchQuery + "\uf8ff"),
        limit(10)
      );

      const snapshot = await getDocs(q);
      const results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSearchResults(results);
    } catch (err) {
      console.error("Zoekfout:", err);
      alert("Kan niet zoeken. Controleer je invoer.");
    } finally {
      setSearching(false);
    }
  };

  // Labels bepalen
  const labels = [];
  if (item.currentStep === "REJECTED" || item.status === "rejected")
    labels.push({
      text: "AFKEUR",
      color: "bg-rose-100 text-rose-700",
      icon: AlertOctagon,
    });
  if (item.inspection?.status === "Tijdelijke afkeur" || item.status === "hold")
    labels.push({
      text: "REPARATIE",
      color: "bg-orange-100 text-orange-700",
      icon: AlertTriangle,
    });
  if (
    item.orderId &&
    (item.orderId.includes("RUSH") || item.orderId.includes("SPOED"))
  )
    labels.push({ text: "SPOED", color: "bg-red-100 text-red-700", icon: Zap });
  if (item.currentStep === "Finished" || item.status === "completed")
    labels.push({
      text: "GEREED",
      color: "bg-emerald-100 text-emerald-700",
      icon: CheckCircle2,
    });

  const formatDate = (ts) => {
    if (!ts) return "-";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleString("nl-NL");
  };

  // Data Groepering
  const details = [
    {
      group: "Identificatie",
      fields: [
        { k: "Order ID", v: item.orderId },
        { k: "Item Omschrijving", v: item.item },
        { k: "Item Code", v: item.itemCode || item.code },
        { k: "Lotnummer", v: item.lotNumber },
        { k: "Referentie", v: item.referenceCode },
      ],
    },
    {
      group: "Planning & Locatie",
      fields: [
        { k: "Machine", v: item.machine || item.originMachine },
        { k: "Week", v: item.week || item.weekNumber },
        {
          k: "Geplande Datum",
          v: item.dateObj
            ? formatDate(item.dateObj)
            : item.plannedDate
            ? formatDate(item.plannedDate)
            : "-",
        },
        { k: "Plan Aantal/Meters", v: item.plan },
        { k: "Gereed Aantal", v: item.liveFinish },
      ],
    },
    {
      group: "Specificaties & Instructies",
      fields: [
        { k: "Tekening", v: item.drawing },
        { k: "Project", v: item.project },
        { k: "Project Omschr.", v: item.projectDesc },
        { k: "PO Tekst / Opmerking", v: item.poText },
      ],
    },
    {
      group: "Status & Voortgang",
      fields: [
        { k: "Huidige Stap", v: item.currentStep },
        { k: "Huidige Status", v: item.status },
        { k: "Starttijd", v: formatDate(item.startTime) },
        {
          k: "Laatste Update",
          v: formatDate(item.updatedAt || item.lastUpdated),
        },
        { k: "Operator", v: item.operator },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 scale-100 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <div>
            <h2 className="text-xl font-black text-gray-800 uppercase italic tracking-tight">
              {type === "products" ? "Product Paspoort" : "Order Details"}
            </h2>
            <p className="text-xs text-gray-500 font-medium font-mono">
              ID: {item.lotNumber || item.orderId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar">
          {/* Header Info Block */}
          <div className="flex justify-between items-start mb-6">
            <div className="max-w-[70%]">
              <h3 className="text-xl font-bold text-slate-900 leading-tight">
                {item.item}
              </h3>
              {item.drawing && (
                <p className="text-sm text-slate-500 font-mono mt-1">
                  DWG: {item.drawing}
                </p>
              )}

              {/* LINK STATUS & ACTIE */}
              <div className="mt-3 flex items-center gap-3">
                {item.linkedProductId ? (
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold uppercase border border-emerald-100">
                    <CheckCircle2 size={14} /> Gekoppeld aan Catalogus
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-bold uppercase border border-slate-100">
                    <AlertTriangle size={14} /> Geen Tekening Gekoppeld
                  </div>
                )}

                {type === "orders" && (
                  <button
                    onClick={() => setIsLinking(!isLinking)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-bold uppercase underline flex items-center gap-1"
                  >
                    <LinkIcon size={12} />{" "}
                    {item.linkedProductId ? "Wijzig Koppeling" : "Nu Koppelen"}
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap justify-end">
              {labels.map((l, i) => (
                <span
                  key={i}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase ${l.color}`}
                >
                  <l.icon size={12} /> {l.text}
                </span>
              ))}
            </div>
          </div>

          {/* CATALOGUS LINKER */}
          {isLinking && (
            <div className="mb-8 p-6 bg-blue-50 rounded-2xl border border-blue-100 animate-in slide-in-from-top-2">
              <h4 className="text-sm font-black text-blue-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Search size={16} /> Zoek in Catalogus
              </h4>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Productnaam (Hoofdlettergevoelig)..."
                  className="flex-1 p-3 rounded-xl border border-blue-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchCatalog()}
                />
                <button
                  onClick={searchCatalog}
                  disabled={searching}
                  className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {searching ? <Loader2 className="animate-spin" /> : "Zoek"}
                </button>
              </div>

              {searchResults.length > 0 ? (
                <div className="bg-white rounded-xl border border-blue-100 overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                  {searchResults.map((prod) => (
                    <div
                      key={prod.id}
                      className="p-3 border-b border-gray-50 hover:bg-blue-50 flex justify-between items-center transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt=""
                            className="w-10 h-10 object-cover rounded-lg bg-gray-100"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300">
                            <ImageIcon size={16} />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-gray-800">
                            {prod.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {prod.articleCode}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onLinkProduct(item.id || item.orderId, prod);
                          setIsLinking(false);
                        }}
                        className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-600 shadow-sm"
                      >
                        Koppel
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-blue-400 italic text-center">
                  Zoek en selecteer een product om te koppelen.
                </p>
              )}
            </div>
          )}

          {/* Data Grid */}
          <div className="space-y-6">
            {details.map((section, idx) => {
              const validFields = section.fields.filter(
                (f) => f.v !== undefined && f.v !== null && f.v !== ""
              );
              if (validFields.length === 0) return null;

              return (
                <div
                  key={idx}
                  className="bg-slate-50 rounded-2xl p-5 border border-slate-100"
                >
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
                    <Info size={12} /> {section.group}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-6">
                    {validFields.map((field, fIdx) => (
                      <div key={fIdx}>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                          {field.k}
                        </span>
                        <span className="block text-sm font-medium text-slate-800 break-words">
                          {String(field.v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const TeamleaderHub = ({ onExit, onEnterWorkstation }) => {
  const { user } = useAdminAuth();
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

  // Zoekfilter voor modal
  const [modalSearch, setModalSearch] = useState("");

  const currentAppId = getAppId();

  // DATA LOADING
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
      },
      (error) => {
        console.error("Fout bij laden orders:", error);
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
      },
      (error) => {
        console.error("Fout bij laden producten:", error);
      }
    );

    return () => {
      unsubOrders();
      unsubProds();
    };
  }, [currentAppId]);

  // DATA PROCESSING (VEILIGE FOREACH)
  const dataStore = useMemo(() => {
    const orderStats = {};
    const machineMap = {};

    // FIX: Gebruik een veilige fallback als rawProducts nog undefined is
    const safeProducts = Array.isArray(rawProducts) ? rawProducts : [];

    safeProducts.forEach((p) => {
      if (!p.orderId) return;
      if (!orderStats[p.orderId])
        orderStats[p.orderId] = { started: 0, finished: 0 };
      orderStats[p.orderId].started++;
      if (p.currentStep === "Finished") orderStats[p.orderId].finished++;

      const mOrig = String(p.originMachine || "000");
      const m = mOrig.replace(/\D/g, "") || mOrig;

      if (!machineMap[m]) machineMap[m] = { running: 0, finished: 0 };
      if (p.currentStep === "Finished") machineMap[m].finished++;
      else machineMap[m].running++;
    });

    const enriched = rawOrders
      .map((o) => {
        const s = orderStats[o.orderId] || { started: 0, finished: 0 };
        const mOrig = String(o.machine || "");

        const itemStr = (o.item || "").toUpperCase();
        const planVal = Number(o.plan || 0);
        const isDecimal = !Number.isInteger(planVal) && planVal < 50;
        const isPipe =
          itemStr.includes("PIPE") || itemStr.includes("BUIS") || isDecimal;

        return {
          ...o,
          isPipe,
          liveToDo: Math.max(0, planVal - s.started),
          liveFinish: s.finished,
          normMachine: mOrig.replace(/\D/g, "") || mOrig,
        };
      })
      .sort(
        (a, b) => (b.importDate?.seconds || 0) - (a.importDate?.seconds || 0)
      );

    return { enriched, machineMap };
  }, [rawOrders, rawProducts]);

  const dashboardMetrics = useMemo(() => {
    const STATIONS = [
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
    const machineMetrics = STATIONS.map((mId) => {
      const mNorm = mId.replace(/\D/g, "") || mId;
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
        orders: mOrders,
      };
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

    return {
      totalPlanned: Math.round(totalFittings),
      totalPipes: totalPipesMeters,
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
  }, [dataStore, rawProducts]);

  // --- ACTIONS ---

  const handleDashboardClick = (id) => {
    const isMachine = [
      "BH11",
      "BH12",
      "BH15",
      "BH16",
      "BH17",
      "BH18",
      "BH31",
      "Mazak",
      "Nabewerking",
    ].includes(id);

    if (isMachine && onEnterWorkstation) {
      onEnterWorkstation(id);
      return;
    }

    let filteredData = [];
    let title = "";
    let type = "orders";

    switch (id) {
      case "gepland":
        filteredData = dataStore.enriched.filter((o) => !o.isPipe);
        title = "Geplande Orders (Fittings)";
        type = "orders";
        break;
      case "pipes":
        filteredData = dataStore.enriched.filter((o) => o.isPipe);
        title = "Geplande Orders (Pipes)";
        type = "orders";
        break;
      case "in_proces":
        filteredData = rawProducts.filter(
          (p) => p.currentStep !== "Finished" && p.currentStep !== "REJECTED"
        );
        title = "Live Productie Inzicht";
        type = "products";
        break;
      case "gereed":
        filteredData = rawProducts.filter((p) => p.currentStep === "Finished");
        title = "Gereedgemelde Producten";
        type = "products";
        break;
      case "def_afkeur":
        filteredData = rawProducts.filter((p) => p.currentStep === "REJECTED");
        title = "Definitieve Afkeur";
        type = "products";
        break;
      case "tijdelijke_afkeur":
        filteredData = rawProducts.filter(
          (p) => p.inspection?.status === "Tijdelijke afkeur"
        );
        title = "Tijdelijke Afkeur (Reparatie)";
        type = "products";
        break;
      default:
        return;
    }

    setModalData(filteredData);
    setModalTitle(title);
    setModalType(type);
    setModalSearch(""); // Reset search
    setShowModal(true);
  };

  // Gefilterde data voor de modal
  const filteredModalData = useMemo(() => {
    if (!modalSearch) return modalData;
    const term = modalSearch.toLowerCase();

    return modalData.filter((item) => {
      return (
        (item.orderId && String(item.orderId).toLowerCase().includes(term)) ||
        (item.item && String(item.item).toLowerCase().includes(term)) ||
        (item.lotNumber &&
          String(item.lotNumber).toLowerCase().includes(term)) ||
        (item.machine && String(item.machine).toLowerCase().includes(term)) ||
        (item.status && String(item.status).toLowerCase().includes(term))
      );
    });
  }, [modalData, modalSearch]);

  const handleArchiveOrder = async (order) => {
    if (
      !window.confirm(
        `Weet je zeker dat je order ${order.orderId} wilt archiveren?`
      )
    )
      return;
    setIsArchiving(true);
    try {
      const reason =
        order.status === "completed" ? "completed" : "manual_cleanup";
      const success = await archiveOrder(currentAppId, order, reason);
      if (success) {
        setSelectedOrderId(null);
      }
    } catch (error) {
      alert("Fout bij archiveren: " + error.message);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleLinkProduct = async (docId, product) => {
    try {
      // docId is het order.id (document ID in digital_planning)
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
        linkedProductImage: product.imageUrl || product.drawingUrl || null,
        linkedProductSpecs: {
          dim1: product.diameter || "",
          dim2: product.pressure || "",
        },
        lastUpdated: new Date(),
      });

      alert("Succesvol gekoppeld aan: " + product.name);
    } catch (error) {
      console.error("Fout bij koppelen:", error);
      alert("Koppelen mislukt: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
            Data laden...
          </p>
        </div>
      </div>
    );
  }

  // Geselecteerde order voor de center view
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
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors tooltip flex items-center gap-2 font-bold"
              title="Sluiten"
            >
              <LogOut className="w-6 h-6" />
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
              Management Hub
            </p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
              activeTab === "dashboard"
                ? "bg-white text-rose-600 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("planning")}
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
              activeTab === "planning"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Planning
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
          >
            <FileUp size={14} /> Import
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border rounded-lg text-[9px] font-black text-slate-400 uppercase">
            <Users size={12} /> {user?.email?.split("@")[0] || "Admin"}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 text-left w-full">
        <div className="w-full h-full mx-auto text-left">
          {activeTab === "dashboard" && (
            <DashboardView
              metrics={dashboardMetrics}
              products={rawProducts}
              onTileClick={handleDashboardClick}
              onStationSelect={onEnterWorkstation}
            />
          )}
          {activeTab === "planning" && (
            <div className="grid grid-cols-12 gap-6 h-full min-h-[700px] text-left">
              <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
                <PlanningSidebar
                  orders={dataStore.enriched}
                  selectedOrderId={selectedOrderId}
                  onSelect={(orderId) => setSelectedOrderId(orderId)}
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
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 border-b pb-2">
                        Order Details
                      </h4>
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
                            <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded border">
                              {Math.round(
                                (currentSelectedOrder.liveFinish /
                                  currentSelectedOrder.plan) *
                                  100
                              )}
                              %
                            </span>
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                            Status
                          </span>
                          <div className="mt-1">
                            <span
                              className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${
                                currentSelectedOrder.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : currentSelectedOrder.status ===
                                    "in_progress"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {currentSelectedOrder.status || "Pending"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end gap-4">
                        <button
                          onClick={() =>
                            setSelectedDetailItem(currentSelectedOrder)
                          }
                          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
                        >
                          <FileText size={18} /> Toon Alles / Koppel
                        </button>
                        {currentSelectedOrder.status === "completed" && (
                          <button
                            onClick={() =>
                              handleArchiveOrder(currentSelectedOrder)
                            }
                            disabled={isArchiving}
                            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
                          >
                            {isArchiving ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <Archive size={18} />
                            )}{" "}
                            Archiveren
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

      {/* KPI MODAL (LIJST) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-7xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border border-slate-100">
            {/* HEADER + ZOEKBALK */}
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 gap-4">
              <div>
                <h3 className="text-xl font-black uppercase text-slate-900 tracking-tight">
                  {modalTitle}
                </h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  {filteredModalData.length} items gevonden
                </p>
              </div>

              {/* NIEUW: Zoekbalk in Modal */}
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Zoek in lijst..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
                  autoFocus
                />
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
              {filteredModalData.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white shadow-sm z-10">
                    <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      {modalType === "orders" ? (
                        <>
                          <th className="p-4 bg-white">Order ID</th>
                          <th className="p-4 bg-white">Item</th>
                          <th className="p-4 bg-white text-right">
                            Aantal / Meters
                          </th>
                          <th className="p-4 bg-white">Machine</th>
                          <th className="p-4 bg-white">Status</th>
                        </>
                      ) : (
                        <>
                          <th className="p-4 bg-white">Lotnummer</th>
                          <th className="p-4 bg-white">Order / Item</th>
                          <th className="p-4 bg-white">Huidige Stap</th>
                          <th className="p-4 bg-white">Starttijd</th>
                          <th className="p-4 bg-white">Laatste Update</th>
                          <th className="p-4 bg-white">Labels</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredModalData.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        onClick={() => setSelectedDetailItem(item)}
                        className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                      >
                        {modalType === "orders" ? (
                          <>
                            <td className="p-4 font-mono font-bold text-blue-600 group-hover:text-blue-700">
                              {item.orderId}
                            </td>
                            <td className="p-4 text-sm font-bold text-slate-700">
                              {item.item}
                            </td>
                            <td className="p-4 font-black text-slate-900 text-right">
                              {item.plan} {item.isPipe ? "m" : "st"}
                            </td>
                            <td className="p-4 text-xs font-bold text-slate-500 uppercase">
                              {item.machine}
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-500">
                                {item.status || "Pending"}
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-4 font-mono font-bold text-blue-600">
                              {item.lotNumber}
                            </td>
                            <td className="p-4">
                              <div className="text-xs font-bold text-slate-800">
                                {item.orderId}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                                {item.item}
                              </div>
                            </td>
                            <td className="p-4 font-bold text-slate-700 uppercase text-xs">
                              {item.currentStep}
                            </td>
                            <td className="p-4 text-xs font-mono text-slate-500 flex items-center gap-2">
                              <Clock size={12} /> {formatTime(item.startTime)}
                            </td>
                            <td className="p-4 text-xs font-mono text-slate-500">
                              {formatTime(item.updatedAt)}
                            </td>
                            <td className="p-4"></td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <List size={48} className="mb-4 opacity-30" />
                  <p className="text-sm font-bold uppercase tracking-widest">
                    Geen data gevonden
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL (PRODUCT PASPOORT) */}
      {selectedDetailItem && (
        <ProductPassportModal
          item={selectedDetailItem}
          type={modalType}
          onClose={() => setSelectedDetailItem(null)}
          onLinkProduct={handleLinkProduct}
        />
      )}

      {/* IMPORT MODAL */}
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
