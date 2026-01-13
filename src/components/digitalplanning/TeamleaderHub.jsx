import React, { useState, useMemo } from "react";
import {
  LayoutGrid,
  ShieldCheck,
  Database,
  Loader2,
  Settings,
} from "lucide-react";

// INTERNE IMPORTS
import DashboardView from "./DashboardView";
import PlanningSidebar from "./PlanningSidebar";
import OrderDetail from "./OrderDetail";
import DrillDownModal from "./modals/DrillDownModal";

/**
 * TeamleaderHub: De zware management module.
 * Handelt alle complexe data-aggregatie af voor de hele fabriek.
 */
const TeamleaderHub = ({ orders, products, isManager, onBackToSelection }) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [drillDown, setDrillDown] = useState({
    isOpen: false,
    title: "",
    category: "",
  });

  // Krachtige O(N) data aggregatie engine voor het dashboard
  const dataStore = useMemo(() => {
    const orderStats = {};
    const machineMap = {};

    products.forEach((p) => {
      if (!p.orderId) return;
      if (!orderStats[p.orderId])
        orderStats[p.orderId] = { started: 0, finished: 0 };
      orderStats[p.orderId].started++;
      if (p.currentStep === "Finished") orderStats[p.orderId].finished++;

      const m = p.originMachine || "000";
      if (!machineMap[m]) machineMap[m] = { running: 0, finished: 0 };
      if (p.currentStep === "Finished") machineMap[m].finished++;
      else machineMap[m].running++;
    });

    const enriched = orders
      .map((o) => {
        const s = orderStats[o.orderId] || { started: 0, finished: 0 };
        return {
          ...o,
          liveToDo: Math.max(0, Number(o.plan || 0) - s.started),
          liveFinish: s.finished,
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
  }, [orders, products]);

  const dashboardMetrics = useMemo(() => {
    // Hier berekenen we de voortgangsbalken per machine
    const machines = [
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
    const machineMetrics = machines.map((mId) => {
      const mStats = dataStore.machineMap[mId] || { running: 0, finished: 0 };
      const mOrders = dataStore.enriched.filter((o) => o.machine === mId);
      return {
        id: mId,
        plan: mOrders.reduce((s, o) => s + Number(o.plan || 0), 0),
        fin: mStats.finished,
        running: mStats.running,
        orders: mOrders,
      };
    });

    return {
      totalPlanned: dataStore.enriched.reduce(
        (s, o) => s + Number(o.plan || 0),
        0
      ),
      activeCount: products.filter(
        (p) => p.currentStep !== "Finished" && p.currentStep !== "REJECTED"
      ).length,
      rejectedCount: products.filter((p) => p.currentStep === "REJECTED")
        .length,
      finishedCount: products.filter((p) => p.currentStep === "Finished")
        .length,
      tempRejectedCount: products.filter(
        (p) => p.inspection?.status === "Tijdelijke afkeur"
      ).length,
      machineMetrics,
    };
  }, [dataStore, products]);

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-500 text-left">
      <div className="p-4 bg-white border-b flex justify-between items-center shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-4 text-left">
          <button
            onClick={onBackToSelection}
            className="p-2.5 hover:bg-slate-50 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 border border-slate-100 transition-all"
          >
            <LayoutGrid size={18} /> Stations
          </button>
          <div className="h-8 w-px bg-slate-100 mx-1" />
          <h2 className="text-base font-black text-rose-600 tracking-tighter uppercase italic flex items-center gap-2">
            <ShieldCheck size={20} /> Teamleader Hub
          </h2>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-left">
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
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6 relative">
        {activeTab === "dashboard" ? (
          <DashboardView
            metrics={dashboardMetrics}
            products={products}
            onTileClick={(cat) =>
              setDrillDown({ isOpen: true, title: cat, category: cat })
            }
            hasActiveFilters={false}
          />
        ) : (
          <div className="grid grid-cols-12 gap-6 h-full text-left">
            <PlanningSidebar
              orders={dataStore.enriched}
              selectedOrder={dataStore.enrichedMap[selectedOrderId]}
              onSelect={(o) => setSelectedOrderId(o.orderId)}
            />
            <div className="col-span-8 bg-white rounded-[40px] border shadow-sm overflow-hidden h-full flex flex-col">
              <OrderDetail
                order={dataStore.enrichedMap[selectedOrderId]}
                onClose={() => setSelectedOrderId(null)}
                isManager={isManager}
                products={products}
                currentStation={{ id: "TEAMLEAD", type: "master" }}
              />
            </div>
          </div>
        )}
      </div>

      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown((p) => ({ ...p, isOpen: false }))}
        title={drillDown.title}
        category={drillDown.category}
        allProducts={products}
        allOrders={orders}
        ordersMap={dataStore.enrichedMap}
        isManager={isManager}
      />
    </div>
  );
};

export default TeamleaderHub;
