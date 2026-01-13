import React, { useState, useMemo, useCallback } from "react";
import { LayoutGrid, Factory, Loader2, CheckCircle2 } from "lucide-react";
import {
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db, appId } from "../../config/firebase";

// INTERNE IMPORTS
import PlanningSidebar from "./PlanningSidebar";
import OrderDetail from "./OrderDetail";
import Terminal from "./Terminal";
import LossenView from "./LossenView";

/**
 * WorkstationHub: Lichtgewicht module voor operators aan de machine.
 * Filtert data direct op machine-ID voor optimale snelheid.
 */
const WorkstationHub = ({
  station,
  orders,
  products,
  isManager,
  onBackToSelection,
}) => {
  const [activeTab, setActiveTab] = useState("planning");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Zeer snelle filtering: Alleen orders voor DIT station
  const stationData = useMemo(() => {
    const statsMap = {};
    const stationOrders = orders.filter((o) => o.machine === station.id);

    products.forEach((p) => {
      if (p.orderId) {
        if (!statsMap[p.orderId])
          statsMap[p.orderId] = { started: 0, finished: 0 };
        statsMap[p.orderId].started++;
        if (p.currentStep === "Finished") statsMap[p.orderId].finished++;
      }
    });

    const enriched = stationOrders.map((o) => {
      const s = statsMap[o.orderId] || { started: 0, finished: 0 };
      return {
        ...o,
        liveToDo: Math.max(0, Number(o.plan || 0) - s.started),
        liveFinish: s.finished,
      };
    });

    const enrichedMap = {};
    enriched.forEach((o) => {
      enrichedMap[o.orderId] = o;
    });

    return { enriched, enrichedMap };
  }, [station.id, orders, products]);

  // --- ACTIES ---
  const handleStartProduction = async (orderObj) => {
    setLoading(true);
    try {
      const now = new Date();
      const yy = now.getFullYear().toString().slice(-2);
      const ww = String(
        Math.ceil(
          ((now - new Date(Date.UTC(now.getFullYear(), 0, 1))) / 86400000 + 1) /
            7
        )
      ).padStart(2, "0");
      const mmm = station.code || "000";
      const lotPrefix = `40${yy}${ww}${mmm}40`;
      const seq = String(
        products.filter((p) => p.lotNumber?.startsWith(lotPrefix)).length + 1
      ).padStart(4, "0");
      const lotId = `${lotPrefix}${seq}`;

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
          articleCode: orderObj.articleCode || "",
          item: orderObj.item || "",
          drawing: orderObj.drawing || "",
          referenceCode: orderObj.referenceCode || "",
          originMachine: station.id,
          currentStation: station.id,
          currentStep: "Wikkelen",
          startTime: now.toISOString(),
          status: "Active",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = async (product) => {
    setLoading(true);
    try {
      const current = product.currentStep;
      const isFlange = (product.item || "").toUpperCase().includes("FL");
      const steps = [
        "Wikkelen",
        "Lossen",
        isFlange ? "Mazak" : "Nabewerken",
        "Eindinspectie",
        "Finished",
      ];
      const nextStep = steps[steps.indexOf(current) + 1] || "Finished";

      const updates = {
        currentStep: nextStep,
        currentStation:
          nextStep === "Finished"
            ? "GEREED"
            : nextStep === "Mazak"
            ? "Mazak"
            : nextStep === "Nabewerken"
            ? "Nabewerking"
            : nextStep === "Eindinspectie"
            ? "BM01"
            : product.currentStation,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "tracked_products",
          product.lotNumber
        ),
        updates
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in slide-in-from-right duration-500 text-left">
      <div className="p-4 bg-white border-b flex justify-between items-center shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-4 text-left">
          <button
            onClick={onBackToSelection}
            className="p-2.5 hover:bg-slate-50 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 border border-slate-100 transition-all text-left"
          >
            <LayoutGrid size={18} /> Stations
          </button>
          <div className="h-8 w-px bg-slate-100 mx-1" />
          <h2 className="text-base font-black text-slate-900 tracking-tighter uppercase italic">
            {station.id}
          </h2>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-left">
          <button
            onClick={() => setActiveTab("planning")}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
              activeTab === "planning"
                ? "bg-white text-blue-600 shadow-md"
                : "text-slate-400"
            }`}
          >
            Werklijst
          </button>
          {station.type === "machine" && (
            <button
              onClick={() => setActiveTab("lossen")}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                activeTab === "lossen"
                  ? "bg-white text-emerald-600 shadow-md"
                  : "text-slate-400"
              }`}
            >
              Lossen
            </button>
          )}
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
      </div>

      <div className="flex-1 overflow-hidden p-6 text-left">
        {activeTab === "planning" ? (
          <div className="grid grid-cols-12 gap-6 h-full text-left">
            <PlanningSidebar
              orders={stationData.enriched}
              selectedOrder={stationData.enrichedMap[selectedOrderId]}
              onSelect={(o) => setSelectedOrderId(o.orderId)}
            />
            <div className="col-span-8 bg-white rounded-[40px] border shadow-sm overflow-hidden h-full flex flex-col">
              <OrderDetail
                order={stationData.enrichedMap[selectedOrderId]}
                onClose={() => setSelectedOrderId(null)}
                isManager={isManager}
                products={products}
                currentStation={station}
                onStartProduction={handleStartProduction}
                onNextStep={handleNextStep}
                loading={loading}
              />
            </div>
          </div>
        ) : activeTab === "lossen" ? (
          <LossenView
            currentStation={station}
            products={products}
            onNextStep={handleNextStep}
            loading={loading}
          />
        ) : (
          <Terminal
            currentStation={station}
            products={products}
            onNextStep={handleNextStep}
            notify={() => {}}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};

export default WorkstationHub;
