import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LogOut, Loader2 } from "lucide-react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  addDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
// Imports zonder extensies voor maximale compatibiliteit
import { db } from "../../config/firebase";
import { useAdminAuth } from "../../hooks/useAdminAuth";

// Imports van de nieuwe sub-componenten en logic
import {
  WORKSTATIONS,
  getISOWeekInfo,
  isInspectionOverdue,
} from "../../utils/workstationLogic";
import PlanningListView from "./views/PlanningListView";
import ActiveProductionView from "./views/ActiveProductionView";
import PostProcessingFinishModal from "./modals/PostProcessingFinishModal";

import Terminal from "./Terminal";
import LossenView from "./LossenView";
import ProductDetailModal from "../products/ProductDetailModal";
import ProductionStartModal from "./modals/ProductionStartModal";
import OperatorLinkModal from "./modals/OperatorLinkModal";

const COLLECTION_NAME = "digital_planning";

const getAppId = () => {
  if (typeof window !== "undefined" && window.__app_id) return window.__app_id;
  return "fittings-app-v1";
};

const WorkstationHub = ({ initialStationId, onExit }) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAdminAuth();

  const [selectedStation, setSelectedStation] = useState(
    initialStationId || "BH11"
  );
  const [activeTab, setActiveTab] = useState("planning");
  const [rawOrders, setRawOrders] = useState([]);
  const [rawProducts, setRawProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Selecties
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [linkedProductData, setLinkedProductData] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [orderToLink, setOrderToLink] = useState(null);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [itemToFinish, setItemToFinish] = useState(null);

  const currentAppId = getAppId();
  // Check of dit een post-processing station is (Mazak, Nabewerking OF BM01)
  const isPostProcessing = [
    "Mazak",
    "Nabewerking",
    "BM01",
    "Station BM01",
  ].includes(selectedStation);

  // Initiele Tab en Station Setup
  useEffect(() => {
    if (initialStationId) {
      setSelectedStation(initialStationId);
      // Zet default tab
      if (
        ["Mazak", "Nabewerking", "BM01", "Station BM01"].includes(
          initialStationId
        )
      ) {
        setActiveTab("winding"); // Dit is de "Productie/Inspectie" tab
      } else {
        setActiveTab("planning");
      }
    }
  }, [initialStationId]);

  // Data Fetching
  useEffect(() => {
    if (!currentAppId) return;
    setLoading(true);

    // Haal orders op
    const ordersRef = collection(
      db,
      "artifacts",
      currentAppId,
      "public",
      "data",
      "digital_planning"
    );
    const unsubOrders = onSnapshot(query(ordersRef), (snap) => {
      const loadedOrders = snap.docs.map((doc) => {
        const data = doc.data();
        let dateObj = data.plannedDate?.toDate
          ? data.plannedDate.toDate()
          : new Date();
        let { week, year } = getISOWeekInfo(dateObj);

        return {
          id: doc.id,
          ...data,
          orderId: data.orderId || data.orderNumber || doc.id,
          item: data.item || data.productCode || "Onbekend Item",
          plan: data.plan || data.quantity || 0,
          dateObj: dateObj,
          weekNumber: parseInt(data.week || data.weekNumber || week),
          weekYear: parseInt(data.year || year),
        };
      });
      setRawOrders(loadedOrders);
      setLoading(false);
    });

    // Haal producten op
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

  // Reminder Logic (Auto-check voor tijdelijke afkeur > 7 dagen)
  useEffect(() => {
    const checkAndSendReminders = async () => {
      if (!currentAppId || !rawProducts.length) return;

      const overdueItems = rawProducts.filter((p) => {
        const pMachine = String(p.originMachine || p.currentStation || "");
        const currentStationNorm = selectedStation.replace(/\D/g, "");
        const pMachineNorm = pMachine.replace(/\D/g, "");

        // Check of item op DIT station is
        const isHere =
          p.currentStation === selectedStation ||
          pMachineNorm === currentStationNorm;
        if (!isHere) return false;

        const isTempReject = p.inspection?.status === "Tijdelijke afkeur";
        const isOverdue =
          isTempReject && isInspectionOverdue(p.inspection?.timestamp);
        const alreadySent = p.reminderSent === true;

        return isOverdue && !alreadySent;
      });

      for (const item of overdueItems) {
        try {
          // Stuur bericht naar messages collectie
          await addDoc(
            collection(
              db,
              "artifacts",
              currentAppId,
              "public",
              "data",
              "messages"
            ),
            {
              title: "⏰ Automatische Reminder: Tijdelijke Afkeur",
              message: `Product ${item.lotNumber} ligt al meer dan 7 dagen op ${selectedStation} ter reparatie. Graag actie.`,
              type: "alert",
              status: "unread",
              createdAt: serverTimestamp(),
              source: "WorkstationHub",
              relatedLot: item.lotNumber,
            }
          );

          // Markeer product als 'reminder sent'
          const productRef = doc(
            db,
            "artifacts",
            currentAppId,
            "public",
            "data",
            "tracked_products",
            item.id || item.lotNumber
          );
          await updateDoc(productRef, {
            reminderSent: true,
            reminderSentAt: serverTimestamp(),
          });
        } catch (err) {
          console.error("Fout bij versturen auto-reminder:", err);
        }
      }
    };
    // Check elke 2 seconden (in praktijk misschien minder vaak, maar dit is voor reactiviteit)
    const timer = setTimeout(checkAndSendReminders, 2000);
    return () => clearTimeout(timer);
  }, [rawProducts, currentAppId, selectedStation]);

  // Bereken Derived Data (Memoized)
  const stationOrders = useMemo(() => {
    if (!selectedStation) return [];
    if (selectedStation === "BM01" || selectedStation === "Station BM01")
      return rawOrders;

    const currentStationNorm = selectedStation.replace(/\D/g, "");
    const orderStats = {};
    rawProducts.forEach((p) => {
      if (!p.orderId) return;
      // Afgekeurde items tellen niet mee voor 'gestart' -> Nog te doen gaat omhoog
      if (p.status === "rejected" || p.currentStep === "REJECTED") return;

      if (!orderStats[p.orderId])
        orderStats[p.orderId] = { started: 0, finished: 0 };
      orderStats[p.orderId].started++;
      if (p.currentStep === "Finished") orderStats[p.orderId].finished++;
    });

    return rawOrders
      .filter((o) => {
        if (o.status === "cancelled") return false;
        const orderMachineNorm = String(o.machine || "").replace(/\D/g, "");
        return (
          o.machine === selectedStation ||
          orderMachineNorm === currentStationNorm
        );
      })
      .map((o) => {
        const stats = orderStats[o.orderId] || { started: 0, finished: 0 };
        return {
          ...o,
          liveToDo: Math.max(0, Number(o.plan || 0) - stats.started),
          liveFinish: stats.finished,
        };
      })
      .sort(
        (a, b) =>
          a.dateObj - b.dateObj ||
          String(a.orderId).localeCompare(String(b.orderId))
      );
  }, [rawOrders, rawProducts, selectedStation]);

  const activeUnitsHere = useMemo(() => {
    if (!selectedStation) return [];
    const currentStationNorm = selectedStation.replace(/\D/g, "");
    return rawProducts.filter((p) => {
      // Afkeur niet tonen, maar 'Tijdelijke afkeur' (HOLD_AREA) WEL tonen als het op dit station staat
      if (p.currentStep === "Finished" || p.currentStep === "REJECTED")
        return false;

      const pMachine = String(p.originMachine || p.currentStation || "");
      const pMachineNorm = pMachine.replace(/\D/g, "");

      if (selectedStation === "Mazak")
        return p.currentStation === "Mazak" || p.currentStation === "MAZAK";
      if (selectedStation === "Nabewerking")
        return (
          p.currentStation === "Nabewerking" || p.currentStation === "NABW"
        );
      if (selectedStation === "BM01" || selectedStation === "Station BM01")
        return p.currentStation === "BM01";

      if (selectedStation.startsWith("BH")) {
        return (
          (pMachine === selectedStation ||
            pMachineNorm === currentStationNorm) &&
          (p.currentStep === "Wikkelen" || p.currentStep === "HOLD_AREA")
        );
      }
      return false;
    });
  }, [rawProducts, selectedStation]);

  // Handlers
  const handleStartProduction = async (
    order,
    customLotNumber,
    stringCount = 1,
    isPrinterEnabled = false,
    selectedLabel = null
  ) => {
    if (!currentUser || !currentAppId || !customLotNumber) return;
    try {
      const now = new Date();
      const prefix = customLotNumber.slice(0, -4);
      const startSeq = parseInt(customLotNumber.slice(-4), 10);
      let overflowItems = [];

      for (let i = 0; i < stringCount; i++) {
        const currentSeq = startSeq + i;
        const currentLotNumber = `${prefix}${String(currentSeq).padStart(
          4,
          "0"
        )}`;
        const productRef = doc(
          db,
          "artifacts",
          currentAppId,
          "public",
          "data",
          "tracked_products",
          currentLotNumber
        );

        const currentStartedCount = rawProducts.filter(
          (p) => p.orderId === order.orderId
        ).length;
        const plannedAmount = Number(order.plan || 0);
        const isOverflow = currentStartedCount + i + 1 > plannedAmount;

        const unitData = {
          lotNumber: currentLotNumber,
          orderId: isOverflow ? "NOG_TE_BEPALEN" : order.orderId,
          item: order.item,
          drawing: order.drawing || "",
          originMachine: selectedStation,
          currentStation: selectedStation,
          currentStep: "Wikkelen",
          status: "in_progress",
          startTime: now.toISOString(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          operator: currentUser.email,
        };
        if (isOverflow) {
          unitData.isOverproduction = true;
          unitData.originalOrderId = order.orderId;
          unitData.note = "Overproductie uit string-run";
          overflowItems.push(currentLotNumber);
        }
        await setDoc(productRef, unitData);
      }

      if (overflowItems.length > 0) {
        // Log overproductie
        await addDoc(
          collection(
            db,
            "artifacts",
            currentAppId,
            "public",
            "data",
            "messages"
          ),
          {
            title: "⚠ Overproductie Melding",
            message: `Op ${selectedStation} zijn ${overflowItems.length} extra producten gemaakt.`,
            type: "warning",
            status: "unread",
            createdAt: serverTimestamp(),
            source: "WorkstationHub",
          }
        );
        alert(
          `Let op: Er zijn ${overflowItems.length} producten meer gemaakt dan gepland.`
        );
      }

      if (order.status !== "completed") {
        await updateDoc(
          doc(
            db,
            "artifacts",
            currentAppId,
            "public",
            "data",
            COLLECTION_NAME,
            order.id
          ),
          {
            status: "in_progress",
            lastUpdated: serverTimestamp(),
          }
        );
      }
      setShowStartModal(false);
    } catch (error) {
      console.error(error);
      alert("Fout bij starten: " + error.message);
    }
  };

  const handleLinkProduct = async (docId, product) => {
    try {
      await updateDoc(
        doc(
          db,
          "artifacts",
          currentAppId,
          "public",
          "data",
          "digital_planning",
          docId
        ),
        {
          linkedProductId: product.id,
          linkedProductImage: product.imageUrl,
          lastUpdated: new Date(),
        }
      );
      alert("Gekoppeld!");
      setShowLinkModal(false);
      setOrderToLink(null);
    } catch (error) {
      alert("Koppelen mislukt");
    }
  };

  const handlePostProcessingFinish = async (status, data) => {
    if (!itemToFinish || !currentAppId) return;
    try {
      const productRef = doc(
        db,
        "artifacts",
        currentAppId,
        "public",
        "data",
        "tracked_products",
        itemToFinish.id || itemToFinish.lotNumber
      );
      const updates = {
        updatedAt: serverTimestamp(),
        note: data.note || "",
        processedBy: currentUser?.email || "Unknown",
      };

      if (status === "completed") {
        if (selectedStation === "BM01" || selectedStation === "Station BM01") {
          updates.currentStation = "GEREED";
          updates.currentStep = "Finished";
          updates.status = "completed";
        } else {
          updates.currentStation = "BM01";
          updates.currentStep = "Eindinspectie";
        }
      } else if (status === "temp_reject") {
        updates.inspection = {
          status: "Tijdelijke afkeur",
          reasons: data.reasons,
          timestamp: new Date().toISOString(),
        };
        updates.currentStep = "HOLD_AREA";
        // Behoud huidig station voor zichtbaarheid
      } else if (status === "rejected") {
        updates.status = "rejected";
        updates.currentStep = "REJECTED";
        updates.currentStation = "AFKEUR";
        updates.inspection = {
          status: "Afkeur",
          reasons: data.reasons,
          timestamp: new Date().toISOString(),
        };
      }
      await updateDoc(productRef, updates);
      setFinishModalOpen(false);
      setItemToFinish(null);
    } catch (error) {
      console.error("Fout bij afronden:", error);
      alert("Fout bij opslaan.");
    }
  };

  // Deze handler bepaalt wat er gebeurt als je op 'Klaar/Verder' klikt
  const handleProcessUnit = async (product) => {
    if (!currentAppId) return;
    const stationCheck = String(selectedStation).toLowerCase();

    // Voor Nabewerking, Mazak EN BM01: Open direct de finish modal
    if (
      stationCheck === "nabewerking" ||
      stationCheck === "mazak" ||
      stationCheck === "bm01" ||
      selectedStation === "Station BM01"
    ) {
      setItemToFinish(product);
      setFinishModalOpen(true);
      return;
    }

    // Voor BH stations: Ga naar 'Lossen'
    try {
      const productRef = doc(
        db,
        "artifacts",
        currentAppId,
        "public",
        "data",
        "tracked_products",
        product.id || product.lotNumber
      );
      await updateDoc(productRef, {
        currentStep: "Lossen",
        updatedAt: serverTimestamp(),
      });
      setActiveTab("lossen");
    } catch (error) {
      console.error("Fout bij proces:", error);
      alert("Fout bij updaten status");
    }
  };

  const handleOpenProductInfo = async (productId) => {
    try {
      const productSnap = await getDoc(
        doc(
          db,
          "artifacts",
          currentAppId,
          "public",
          "data",
          "products",
          productId
        )
      );
      if (productSnap.exists()) {
        setLinkedProductData({ id: productSnap.id, ...productSnap.data() });
      } else {
        alert("Product niet gevonden.");
      }
    } catch (error) {
      console.error(error);
      alert("Fout bij laden.");
    }
  };

  const handleActiveUnitClick = (unit) => {
    // Probeer order data te vinden
    const parentOrder = rawOrders.find((o) => o.orderId === unit.orderId);
    if (parentOrder && parentOrder.linkedProductId) {
      handleOpenProductInfo(parentOrder.linkedProductId);
    } else if (unit.originalOrderId) {
      const origOrder = rawOrders.find(
        (o) => o.orderId === unit.originalOrderId
      );
      if (origOrder && origOrder.linkedProductId)
        handleOpenProductInfo(origOrder.linkedProductId);
      else alert(`Geen dossier bij order ${unit.originalOrderId}`);
    } else {
      alert(`Geen dossier gekoppeld aan order ${unit.orderId}`);
    }
  };

  // Render Logic
  return (
    <div className="flex flex-col w-full h-full bg-gray-50/50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              {onExit && (
                <button
                  onClick={onExit}
                  className="mr-4 px-4 py-2 bg-white border border-gray-200 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 font-bold text-xs uppercase tracking-wider"
                >
                  <LogOut className="w-4 h-4" /> Terug naar Overzicht
                </button>
              )}
              <span className="text-xl font-black text-gray-900 italic tracking-tight">
                {WORKSTATIONS.find((w) => w.id === selectedStation)?.name ||
                  selectedStation}
              </span>
            </div>
            <nav className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
              {!isPostProcessing && (
                <button
                  onClick={() => setActiveTab("planning")}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase ${
                    activeTab === "planning"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  Planning
                </button>
              )}
              <button
                onClick={() => setActiveTab("winding")}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase ${
                  activeTab === "winding"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                {selectedStation === "BM01" ||
                selectedStation === "Station BM01"
                  ? "Inspectie"
                  : "Productie"}
              </button>
              {!["BM01", "Station BM01", "Mazak", "Nabewerking"].includes(
                selectedStation
              ) && (
                <button
                  onClick={() => setActiveTab("lossen")}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase ${
                    activeTab === "lossen"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  Lossen
                </button>
              )}
              <button
                onClick={() => setActiveTab("terminal")}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase ${
                  activeTab === "terminal"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                Terminal
              </button>
            </nav>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden w-full p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-full">
            <Loader2 className="animate-spin rounded-full h-12 w-12 text-blue-600 mb-4" />
          </div>
        ) : (
          <>
            {activeTab === "planning" && (
              <PlanningListView
                stationOrders={stationOrders}
                selectedStation={selectedStation}
                onStartProduction={(o) => {
                  setSelectedOrder(o);
                  setShowStartModal(true);
                }}
                onLinkOrder={(o) => {
                  setOrderToLink(o);
                  setShowLinkModal(true);
                }}
                onOpenInfo={handleOpenProductInfo}
              />
            )}
            {activeTab === "winding" && (
              <ActiveProductionView
                activeUnits={activeUnitsHere}
                // Geen smart suggestions nodig bij post-processing
                smartSuggestions={isPostProcessing ? [] : []} // Zet tijdelijk uit of gebruik derived data indien nodig
                selectedStation={selectedStation}
                onProcessUnit={handleProcessUnit}
                onClickUnit={handleActiveUnitClick}
              />
            )}
            {activeTab === "lossen" && (
              <div className="h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <LossenView
                  currentUser={currentUser}
                  products={rawProducts}
                  currentStation={selectedStation}
                />
              </div>
            )}
            {activeTab === "terminal" && (
              <div className="h-full">
                <Terminal
                  currentUser={currentUser}
                  initialStation={selectedStation}
                  products={rawProducts}
                />
              </div>
            )}
          </>
        )}
      </div>
      <ProductionStartModal
        order={selectedOrder}
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        onStart={handleStartProduction}
        stationId={selectedStation}
        existingProducts={rawProducts}
        onOpenProductInfo={handleOpenProductInfo}
      />
      {linkedProductData && (
        <ProductDetailModal
          product={linkedProductData}
          onClose={() => setLinkedProductData(null)}
          userRole={currentUser?.role || "operator"}
        />
      )}
      {showLinkModal && orderToLink && (
        <OperatorLinkModal
          order={orderToLink}
          onClose={() => {
            setShowLinkModal(false);
            setOrderToLink(null);
          }}
          onLinkProduct={handleLinkProduct}
        />
      )}
      {finishModalOpen && itemToFinish && (
        <PostProcessingFinishModal
          product={itemToFinish}
          onClose={() => {
            setFinishModalOpen(false);
            setItemToFinish(null);
          }}
          onConfirm={handlePostProcessingFinish}
          currentStation={selectedStation}
        />
      )}
    </div>
  );
};

export default WorkstationHub;
