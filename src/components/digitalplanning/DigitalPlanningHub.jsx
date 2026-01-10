import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  LayoutGrid,
  ShieldCheck,
  Database,
  Monitor,
  BarChart3,
  Activity,
  Loader2,
  X,
  Search,
  Scan,
  Factory,
} from "lucide-react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  setDoc,
  getDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db, appId } from "../../config/firebase";

// MODULAIRE IMPORTS
import DashboardView from "./DashboardView";
import PlanningSidebar from "./PlanningSidebar";
import OrderDetail from "./OrderDetail";
import Terminal from "./Terminal";
import OrderEditModal from "./modals/OrderEditModal";
import DrillDownModal from "./modals/DrillDownModal";

const STATIONS = [
  {
    id: "TEAMLEAD",
    name: "Teamleader Dashboard",
    type: "master",
    color: "text-rose-600",
    bg: "bg-rose-50",
    icon: <BarChart3 size={32} />,
  },
  {
    id: "BM01",
    name: "Eindinspectie (Master)",
    type: "master",
    code: "401",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: <Monitor size={32} />,
  },
  {
    id: "BH11",
    name: "Wikkelmachine 11",
    type: "machine",
    code: "411",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: <Activity size={32} />,
  },
  {
    id: "BH12",
    name: "Wikkelmachine 12",
    type: "machine",
    code: "412",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: <Activity size={32} />,
  },
  {
    id: "BH15",
    name: "Wikkelmachine 15",
    type: "machine",
    code: "415",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: <Activity size={32} />,
  },
  {
    id: "BH16",
    name: "Wikkelmachine 16",
    type: "machine",
    code: "416",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: <Activity size={32} />,
  },
  {
    id: "BH17",
    name: "Wikkelmachine 17",
    type: "machine",
    code: "417",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: <Activity size={32} />,
  },
  {
    id: "BH18",
    name: "Wikkelmachine 18",
    type: "machine",
    code: "418",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: <Activity size={32} />,
  },
  {
    id: "BH31",
    name: "Wikkelmachine 31",
    type: "machine",
    code: "431",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: <Activity size={32} />,
  },
  {
    id: "Mazak",
    name: "CNC Mazak",
    type: "machine",
    code: "901",
    color: "text-orange-600",
    bg: "bg-orange-50",
    icon: <Database size={32} />,
  },
  {
    id: "Nabewerking",
    name: "Nabewerking / Finish",
    type: "finish",
    code: "902",
    color: "text-purple-600",
    bg: "bg-purple-50",
    icon: <LayoutGrid size={32} />,
  },
];

export default function App({ onBack }) {
  const [currentStation, setCurrentStation] = useState(null);
  const [activeTab, setActiveTab] = useState("planning");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusMsg, setStatusMsg] = useState(null);

  const [modalState, setModalState] = useState({
    editOrder: false,
    editLot: false,
  });
  const [drillDown, setDrillDown] = useState({
    isOpen: false,
    title: "",
    items: [],
    type: "product",
  });

  // Sync data
  useEffect(() => {
    if (!appId) return;
    const unsubOrders = onSnapshot(
      query(
        collection(db, "artifacts", appId, "public", "data", "digital_planning")
      ),
      (snap) => {
        setOrders(
          snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }))
        );
      }
    );
    const unsubProds = onSnapshot(
      query(
        collection(db, "artifacts", appId, "public", "data", "tracked_products")
      ),
      (snap) => {
        setProducts(
          snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }))
        );
      }
    );
    return () => {
      unsubOrders();
      unsubProds();
    };
  }, []);

  const notify = useCallback((text, type = "success") => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  }, []);

  const formatExcelDate = useCallback((val) => {
    if (!val) return "-";
    if (!isNaN(val) && parseFloat(val) > 30000) {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toLocaleDateString("nl-NL");
    }
    return String(val);
  }, []);

  // --- ACTIONS ---

  // FIX: handleUpdateItem hersteld voor gebruik in DrillDownModal
  const handleUpdateItem = async (item, updates, type) => {
    const col = type === "order" ? "digital_planning" : "tracked_products";
    const id = item.id || item.lotNumber;
    try {
      await updateDoc(doc(db, "artifacts", appId, "public", "data", col, id), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      notify("Informatie bijgewerkt.");
    } catch (e) {
      console.error(e);
      notify("Opslaan mislukt.", "error");
    }
  };

  const handleStartProduction = async (orderObj, manualLot = null) => {
    if (loading) return;
    setLoading(true);
    try {
      let lotId = manualLot;
      if (!lotId) {
        const yy = new Date().getFullYear().toString().slice(-2);
        const ww = String(
          Math.ceil(
            ((new Date() - new Date(new Date().getFullYear(), 0, 1)) /
              86400000 +
              1) /
              7
          )
        ).padStart(2, "0");
        const mmm =
          STATIONS.find((s) => s.id === orderObj.machine)?.code || "000";
        const prefix = `40${yy}${ww}${mmm}40`;
        const seq = String(
          products.filter((p) => p.lotNumber?.startsWith(prefix)).length + 1
        ).padStart(4, "0");
        lotId = `${prefix}${seq}`;
      }

      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "tracked_products",
          lotId
        ),
        {
          lotNumber: lotId,
          orderId: orderObj.orderId,
          item: orderObj.item,
          originMachine: orderObj.machine,
          currentStation: orderObj.machine,
          currentStep: "Wikkelen",
          startTime: new Date().toISOString(),
          status: "Active",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      await updateDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "digital_planning",
          orderObj.id
        ),
        {
          toDo: (Number(orderObj.toDo) || 0) + 1,
          status: "IN PRODUCTIE",
        }
      );

      notify(`Start: ${lotId}`);
    } catch (e) {
      notify("Fout bij starten.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTileClick = (category) => {
    let list = [];
    let title = "";
    let type = "product";
    switch (category) {
      case "gepland":
        list = orders.filter((o) => o.status !== "GEREED");
        title = "Planning Overzicht";
        type = "order";
        break;
      case "in_proces":
        list = products.filter(
          (p) => p.currentStep !== "Finished" && p.currentStep !== "REJECTED"
        );
        title = "In Productie";
        break;
      case "def_afkeur":
        list = products.filter((p) => p.currentStep === "REJECTED");
        title = "Definitieve Afkeur";
        break;
      case "gereed":
        list = products.filter((p) => p.currentStep === "Finished");
        title = "Voltooid";
        break;
      default:
        return;
    }
    setDrillDown({ isOpen: true, title, items: list, type });
  };

  const dashboardMetrics = useMemo(() => {
    const activeU = products.filter(
      (p) => p.currentStep !== "Finished" && p.currentStep !== "REJECTED"
    );
    const machineMetrics = STATIONS.filter((s) => s.type === "machine").map(
      (m) => {
        const mOrders = orders.filter((o) =>
          String(o.machine || "").includes(m.id)
        );
        return {
          id: m.id,
          plan: mOrders.reduce((s, o) => s + Number(o.plan || 0), 0),
          fin: mOrders.reduce((s, o) => s + Number(o.finish || 0), 0),
        };
      }
    );
    return {
      totalPlanned: orders.reduce((s, o) => s + Number(o.plan || 0), 0),
      activeCount: activeU.length,
      rejectedCount: products.filter((p) => p.currentStep === "REJECTED")
        .length,
      finishedCount: products.filter((p) => p.currentStep === "Finished")
        .length,
      machineMetrics,
    };
  }, [orders, products]);

  const filteredOrdersList = useMemo(() => {
    return orders.filter((o) => {
      const match =
        (o.orderId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.item || "").toLowerCase().includes(searchTerm.toLowerCase());
      if (!currentStation || currentStation.type === "master") return match;
      return (
        String(o.machine || "")
          .toUpperCase()
          .includes(String(currentStation.id).toUpperCase()) && match
      );
    });
  }, [orders, currentStation, searchTerm]);

  // UI SELECTION
  if (!currentStation) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 min-h-full h-full text-center animate-in fade-in">
        <div className="max-w-5xl w-full flex flex-col items-center">
          <div className="mb-10">
            <h1 className="text-xl font-black text-slate-800 uppercase italic">
              FPI <span className="text-blue-600">Planning</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1">
              Management Hub
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {STATIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setCurrentStation(s);
                  setActiveTab(s.id === "TEAMLEAD" ? "dashboard" : "planning");
                }}
                className={`p-8 bg-white rounded-[32px] border-2 transition-all hover:shadow-xl text-left ${
                  s.id === "TEAMLEAD"
                    ? "border-rose-100 hover:border-rose-400"
                    : "border-slate-100 hover:border-blue-400"
                }`}
              >
                <div
                  className={`p-3 ${s.bg} ${s.color} rounded-2xl w-fit mb-4 shadow-sm`}
                >
                  {s.icon}
                </div>
                <h3 className="text-lg font-black uppercase italic text-slate-800">
                  {s.id}
                </h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {s.name}
                </p>
              </button>
            ))}
          </div>
          <button
            onClick={onBack}
            className="mt-12 p-3 text-slate-300 hover:text-slate-900 transition-all font-black uppercase text-[10px] flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Sluit Planning
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative text-left">
      <div className="p-4 bg-white border-b flex justify-between items-center z-10 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setCurrentStation(null);
              setSelectedOrder(null);
            }}
            className="p-2.5 hover:bg-slate-50 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 border border-slate-100 transition-all"
          >
            <LayoutGrid size={18} /> Stations
          </button>
          <div className="h-8 w-px bg-slate-100 mx-1" />
          <h2 className="text-base font-black text-slate-900 tracking-tighter uppercase italic">
            {currentStation.id}
          </h2>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          {currentStation.type === "master" && (
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                activeTab === "dashboard"
                  ? "bg-white text-rose-600 shadow-md"
                  : "text-slate-400"
              }`}
            >
              Dashboard
            </button>
          )}
          <button
            onClick={() => setActiveTab("planning")}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
              activeTab === "planning"
                ? "bg-white text-blue-600 shadow-md"
                : "text-slate-400"
            }`}
          >
            Planning
          </button>
          <button
            onClick={() => setActiveTab("terminal")}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
              activeTab === "terminal"
                ? "bg-white text-blue-600 shadow-md"
                : "text-slate-400"
            }`}
          >
            Terminal
          </button>
        </div>
        {statusMsg && (
          <div
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase border-2 ${
              statusMsg.type === "success"
                ? "bg-emerald-600 text-white border-emerald-500 shadow-lg"
                : "bg-red-600 text-white border-red-500 shadow-lg"
            }`}
          >
            {statusMsg.text}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden p-6 relative">
        {activeTab === "dashboard" ? (
          <DashboardView
            metrics={dashboardMetrics}
            products={products}
            onTileClick={handleTileClick}
          />
        ) : activeTab === "planning" ? (
          <div className="grid grid-cols-12 gap-6 h-full">
            <PlanningSidebar
              orders={filteredOrdersList}
              selectedOrder={selectedOrder}
              onSelect={(o) => setSelectedOrder(o)}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
            <div className="col-span-8 bg-white rounded-[32px] border shadow-sm overflow-hidden h-full flex flex-col">
              <OrderDetail
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                products={products}
                currentStation={currentStation}
                isMaster={currentStation.type === "master"}
                formatDate={formatExcelDate}
                onStartProduction={handleStartProduction}
                loading={loading}
              />
            </div>
          </div>
        ) : (
          <Terminal
            currentStation={currentStation}
            products={products}
            orders={orders}
            onNextStep={() => {}}
            notify={notify}
            loading={loading}
          />
        )}
      </div>

      <OrderEditModal
        isOpen={modalState.editOrder}
        formData={selectedOrder || {}}
        setFormData={(d) => setSelectedOrder(d)}
        onSave={() => {}}
        loading={loading}
        stations={STATIONS}
        onClose={() => setModalState((p) => ({ ...p, editOrder: false }))}
      />
      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown((p) => ({ ...p, isOpen: false }))}
        title={drillDown.title}
        items={drillDown.items}
        type={drillDown.type}
        onUpdate={handleUpdateItem}
      />
    </div>
  );
}
