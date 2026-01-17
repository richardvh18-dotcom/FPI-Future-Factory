import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  PlayCircle,
  Package,
  Monitor,
  Search,
  Clock,
  ChevronDown,
  X,
  CheckCircle,
  LogOut,
  Loader2,
  FileText,
  ArrowRight,
  Info,
  Printer,
  QrCode,
  RefreshCw,
  Edit3,
  Maximize,
  Minimize,
  Activity,
  Check,
  ImageIcon,
  BookOpen, // Icoon voor dossier
  Link as LinkIcon,
  ShieldCheck,
  Lightbulb,
  Zap,
  Repeat,
  AlertOctagon,
  MessageSquare,
} from "lucide-react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  addDoc, // Toegevoegd voor het maken van berichten
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAdminAuth } from "../../hooks/useAdminAuth";
import StatusBadge from "./common/StatusBadge";
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

// Stations configuratie
const WORKSTATIONS = [
  { id: "BM01", name: "De eindinspectie", type: "inspection" },
  { id: "BH11", name: "BH11", type: "winding" },
  { id: "BH12", name: "BH12", type: "winding" },
  { id: "BH15", name: "BH15", type: "winding" },
  { id: "BH16", name: "BH16", type: "winding" },
  { id: "BH17", name: "BH17", type: "winding" },
  { id: "BH18", name: "BH18", type: "winding" },
  { id: "BH31", name: "BH31", type: "winding" },
  { id: "Mazak", name: "Mazak", type: "machining" },
  { id: "Nabewerking", name: "Nabewerking", type: "finishing" },
  { id: "BH05", name: "BH05", type: "pipe" },
  { id: "BH07", name: "BH07", type: "pipe" },
  { id: "BH08", name: "BH08", type: "pipe" },
  { id: "BH09", name: "BH09", type: "pipe" },
];

// Helper die zowel week als jaar teruggeeft volgens ISO standaarden
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
  const [error, setError] = useState(null);

  const [weekFilter, setWeekFilter] = useState("current");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showStationSelector, setShowStationSelector] = useState(false);

  // States voor de Linked Product Modal en Koppel Modal
  const [linkedProductData, setLinkedProductData] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [orderToLink, setOrderToLink] = useState(null);

  // State voor de Actieve Unit info
  const [selectedActiveUnit, setSelectedActiveUnit] = useState(null);

  const currentAppId = getAppId();

  // Bepaal of we Mazak of Nabewerking zijn (geen planning tab nodig)
  const isPostProcessing = ["Mazak", "Nabewerking"].includes(selectedStation);

  // Load Data
  useEffect(() => {
    if (initialStationId) {
      setSelectedStation(initialStationId);
      // Zet default tab voor post-processing stations direct op 'winding' (productie)
      if (["Mazak", "Nabewerking"].includes(initialStationId)) {
        setActiveTab("winding");
      } else {
        setActiveTab("planning");
      }
    }
  }, [initialStationId]);

  useEffect(() => {
    if (!currentAppId) return;
    setLoading(true);

    // Luister naar Orders
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
        let dateObj = null;
        if (data.plannedDate?.toDate) {
          dateObj = data.plannedDate.toDate();
        } else if (data.importDate?.toDate) {
          dateObj = data.importDate.toDate();
        } else {
          dateObj = new Date();
        }

        let { week, year } = getISOWeekInfo(dateObj);
        if (data.week || data.weekNumber)
          week = parseInt(data.week || data.weekNumber);
        if (data.year) year = parseInt(data.year);

        return {
          id: doc.id,
          ...data,
          orderId: data.orderId || data.orderNumber || doc.id,
          item: data.item || data.productCode || "Onbekend Item",
          plan: data.plan || data.quantity || 0,
          dateObj: dateObj,
          weekNumber: parseInt(week),
          weekYear: parseInt(year),
        };
      });
      setRawOrders(loadedOrders);
      setLoading(false);
    });

    // Luister naar Producten
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

  // Derived Data: Station Orders (Planning)
  const stationOrders = useMemo(() => {
    if (!selectedStation) return [];
    if (selectedStation === "BM01") return rawOrders; // BM01 ziet alles

    const currentStationNorm = selectedStation.replace(/\D/g, "");
    const orderStats = {};
    rawProducts.forEach((p) => {
      if (!p.orderId) return;
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
      .sort((a, b) => {
        const dateDiff = a.dateObj - b.dateObj;
        if (dateDiff !== 0) return dateDiff;
        return String(a.orderId).localeCompare(String(b.orderId));
      });
  }, [rawOrders, rawProducts, selectedStation]);

  // Derived Data: Active Units (Nu Draaiend / Werkvoorraad)
  const activeUnitsHere = useMemo(() => {
    if (!selectedStation) return [];
    const currentStationNorm = selectedStation.replace(/\D/g, "");
    return rawProducts.filter((p) => {
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
      if (selectedStation === "BM01") return p.currentStation === "BM01";

      if (selectedStation.startsWith("BH")) {
        return (
          (pMachine === selectedStation ||
            pMachineNorm === currentStationNorm) &&
          p.currentStep === "Wikkelen"
        );
      }
      return false;
    });
  }, [rawProducts, selectedStation]);

  // Derived Data: Smart Suggestions
  const smartSuggestions = useMemo(() => {
    const groups = {};
    stationOrders.forEach((o) => {
      if (o.status === "completed") return;
      const key = o.item;
      if (!groups[key]) groups[key] = [];
      groups[key].push(o);
    });

    const suggestions = [];
    Object.keys(groups).forEach((key) => {
      const group = groups[key];
      if (group.length > 1) {
        const weeks = [...new Set(group.map((o) => o.weekNumber))];
        if (weeks.length > 1) {
          suggestions.push({
            product: key,
            count: group.length,
            weeks: weeks.sort((a, b) => a - b),
            orders: group,
          });
        }
      }
    });
    return suggestions;
  }, [stationOrders]);

  const handleStartProduction = async (
    order,
    customLotNumber,
    stringCount = 1
  ) => {
    if (!currentUser || !currentAppId || !customLotNumber) return;
    try {
      const now = new Date();

      // Bereken hoeveel er al gestart zijn voor deze order
      const currentStartedCount = rawProducts.filter(
        (p) => p.orderId === order.orderId
      ).length;
      const plannedAmount = Number(order.plan || 0);

      // Parse de base lotnummer
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

        // CHECK VOOR OVERPRODUCTIE
        // (huidig aantal + 1 voor dit item + i voor voorgaande items in deze loop)
        const totalAfterThis = currentStartedCount + i + 1;
        const isOverflow = totalAfterThis > plannedAmount;

        const unitData = {
          lotNumber: currentLotNumber,
          // Als het overproductie is, geven we een tijdelijke placeholder als Order ID
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

      // Als er overproductie was, stuur een bericht naar Teamleader/Planning
      if (overflowItems.length > 0) {
        const messagesRef = collection(
          db,
          "artifacts",
          currentAppId,
          "public",
          "data",
          "messages"
        );
        await addDoc(messagesRef, {
          title: "⚠ Overproductie Melding",
          message: `Op ${selectedStation} zijn ${
            overflowItems.length
          } extra producten gemaakt bij order ${
            order.orderId
          }. Lotnummers: ${overflowItems.join(
            ", "
          )}. Graag nieuw ordernummer aanmaken.`,
          type: "warning", // of 'alert'
          status: "unread",
          createdAt: serverTimestamp(),
          source: "WorkstationHub",
          relatedLots: overflowItems,
        });

        // Visuele feedback voor de operator
        alert(
          `Let op: Er zijn ${overflowItems.length} producten meer gemaakt dan de ordergrootte (${plannedAmount}). Planning is geïnformeerd.`
        );
      }

      if (order.status !== "completed") {
        const orderRef = doc(
          db,
          "artifacts",
          currentAppId,
          "public",
          "data",
          COLLECTION_NAME,
          order.id
        );
        await updateDoc(orderRef, {
          status: "in_progress",
          lastUpdated: serverTimestamp(),
        });
      }
      setShowStartModal(false);
    } catch (error) {
      console.error(error);
      alert("Fout bij starten: " + error.message);
    }
  };

  const handleOpenProductInfo = async (productId) => {
    try {
      const productRef = doc(
        db,
        "artifacts",
        currentAppId,
        "public",
        "data",
        "products",
        productId
      );
      const productSnap = await getDoc(productRef);
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

  const handleActiveUnitClick = async (unit) => {
    // Probeer eerst via het unit object zelf (als we die data hebben opgeslagen)
    // Anders fallback naar zoeken in orders
    const parentOrder = rawOrders.find((o) => o.orderId === unit.orderId);

    if (parentOrder && parentOrder.linkedProductId) {
      handleOpenProductInfo(parentOrder.linkedProductId);
    } else if (unit.originalOrderId) {
      // Fallback voor overproductie items
      const origOrder = rawOrders.find(
        (o) => o.orderId === unit.originalOrderId
      );
      if (origOrder && origOrder.linkedProductId) {
        handleOpenProductInfo(origOrder.linkedProductId);
      } else {
        alert(
          `Geen productdossier gekoppeld aan originele order ${unit.originalOrderId}`
        );
      }
    } else {
      alert(`Geen productdossier gekoppeld aan order ${unit.orderId}`);
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
        linkedProductImage: product.imageUrl || product.drawingUrl || null,
        linkedProductSpecs: {
          dim1: product.diameter || "",
          dim2: product.pressure || "",
        },
        lastUpdated: new Date(),
      });
      alert("Gekoppeld!");
      setShowLinkModal(false);
      setOrderToLink(null);
    } catch (error) {
      alert("Koppelen mislukt: " + error.message);
    }
  };

  const handleProcessUnit = async (product) => {
    if (!currentAppId) return;
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
      if (selectedStation === "BM01") {
        await updateDoc(productRef, {
          currentStep: "Finished",
          currentStation: "GEREED",
          status: "completed",
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(productRef, {
          currentStep: "Lossen",
          updatedAt: serverTimestamp(),
        });
        setActiveTab("lossen");
      }
    } catch (error) {
      console.error("Fout bij proces:", error);
      alert("Fout bij updaten status");
    }
  };

  const renderPlanningContent = () => {
    const { week, year } = getISOWeekInfo(new Date());
    const currentWeek = week;
    const currentYear = year;

    const filteredOrders = stationOrders.filter((order) => {
      if (order.status === "completed") return false;
      if (weekFilter === "prev") {
        if (order.weekYear > currentYear) return false;
        if (order.weekYear === currentYear && order.weekNumber >= currentWeek)
          return false;
      }
      if (weekFilter === "current") {
        if (order.weekYear !== currentYear || order.weekNumber !== currentWeek)
          return false;
      }
      if (weekFilter === "next") {
        if (order.weekYear < currentYear) return false;
        if (order.weekYear === currentYear && order.weekNumber <= currentWeek)
          return false;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          String(order.orderId).toLowerCase().includes(term) ||
          String(order.item).toLowerCase().includes(term)
        );
      }
      return true;
    });

    const groupedByWeek = filteredOrders.reduce((acc, order) => {
      const w = order.weekNumber || "??";
      const y = order.weekYear || "????";
      const key = `${y}-${w}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(order);
      return acc;
    }, {});

    const sortedWeekKeys = Object.keys(groupedByWeek).sort((a, b) => {
      const [y1, w1] = a.split("-").map(Number);
      const [y2, w2] = b.split("-").map(Number);
      if (y1 !== y2) return y1 - y2;
      return w1 - w2;
    });

    return (
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        <div
          className={`col-span-12 ${
            selectedStation !== "BM01" ? "lg:col-span-8" : ""
          } overflow-y-auto pr-2 custom-scrollbar`}
        >
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm gap-3 mb-4 sticky top-0 z-10">
            <div className="flex bg-gray-50 rounded-lg p-1">
              {["prev", "current", "next", "all"].map((wf) => (
                <button
                  key={wf}
                  onClick={() => setWeekFilter(wf)}
                  className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                    weekFilter === wf
                      ? "bg-white shadow text-blue-600"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {wf === "prev"
                    ? "Vorige"
                    : wf === "current"
                    ? "Deze Week"
                    : wf === "next"
                    ? "Volgende"
                    : "Alles"}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Zoeken..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
              />
            </div>
          </div>
          <div className="space-y-6">
            {sortedWeekKeys.map((weekKey) => {
              const [year, weekNum] = weekKey.split("-");
              return (
                <div
                  key={weekKey}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
                >
                  <div className="bg-gray-50/50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide flex items-center gap-2">
                      Week {weekNum}{" "}
                      <span className="text-[10px] text-gray-400 font-normal">
                        ({year})
                      </span>
                    </h3>
                    <span className="text-[10px] font-bold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                      {groupedByWeek[weekKey].length} orders
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {groupedByWeek[weekKey].map((order) => (
                      <div
                        key={order.id}
                        className="p-4 hover:bg-blue-50 transition-all group flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-black text-gray-900 text-lg tracking-tight">
                                {order.orderId}
                              </span>
                              {selectedStation !== "BM01" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOrder(order);
                                    setShowStartModal(true);
                                  }}
                                  className="bg-green-600 hover:bg-green-700 text-white p-1.5 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1"
                                  title="Start Productie"
                                >
                                  <PlayCircle size={14} />
                                  <span className="text-[10px] font-black uppercase tracking-wide">
                                    Start
                                  </span>
                                </button>
                              )}
                            </div>
                            <p className="text-sm font-medium text-gray-600 line-clamp-1">
                              {order.item}
                            </p>
                            {selectedStation === "BM01" && (
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-bold w-fit mt-1">
                                Machine: {order.machine || "Onbekend"}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="block text-sm font-black text-blue-600">
                              {order.plan}{" "}
                              <span className="text-[10px] font-normal text-gray-400 uppercase">
                                st
                              </span>
                            </span>
                            {order.liveToDo > 0 &&
                              order.liveToDo !== order.plan && (
                                <span className="text-[9px] font-bold text-orange-500">
                                  Nog {order.liveToDo}
                                </span>
                              )}
                          </div>
                          {order.linkedProductId ? (
                            <button
                              onClick={() =>
                                handleOpenProductInfo(order.linkedProductId)
                              }
                              className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                            >
                              <BookOpen size={18} />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setOrderToLink(order);
                                setShowLinkModal(true);
                              }}
                              className="text-slate-300 hover:text-blue-500 p-2 transition-colors"
                            >
                              <LinkIcon size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {sortedWeekKeys.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <FileText size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">
                  Geen orders gevonden
                </p>
              </div>
            )}
          </div>
        </div>

        {selectedStation !== "BM01" && (
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="bg-blue-50/50 p-4 border-b border-blue-100 flex items-center justify-between">
                <h3 className="font-black text-blue-800 text-sm uppercase tracking-tight flex items-center gap-2">
                  <Activity size={16} /> Nu Actief
                </h3>
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {activeUnitsHere.length}
                </span>
              </div>
              <div className="p-2">
                {activeUnitsHere.length > 0 ? (
                  <div className="space-y-2">
                    {activeUnitsHere.map((unit) => (
                      <div
                        key={unit.lotNumber}
                        className="p-3 bg-white border border-blue-50 rounded-xl shadow-sm flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-black text-gray-800">
                            {unit.lotNumber}
                          </p>
                          {/* Toon evt. 'OVERPRODUCTIE' label */}
                          {unit.orderId === "NOG_TE_BEPALEN" && (
                            <span className="bg-red-100 text-red-600 px-1 py-0.5 rounded text-[8px] font-black mr-2">
                              EXTRA
                            </span>
                          )}
                          <p className="text-[10px] text-gray-500 truncate max-w-[150px]">
                            {unit.item}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                          {unit.startTime
                            ? new Date(unit.startTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-blue-300">
                    <Zap size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-[10px] font-bold uppercase">
                      Geen activiteit
                    </p>
                  </div>
                )}
              </div>
            </div>
            {smartSuggestions.length > 0 && (
              <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-500">
                <div className="bg-purple-50/50 p-4 border-b border-purple-100">
                  <h3 className="font-black text-purple-800 text-sm uppercase tracking-tight flex items-center gap-2">
                    <Lightbulb size={16} /> Slimme Suggesties
                  </h3>
                </div>
                <div className="p-3 space-y-3">
                  {smartSuggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      className="bg-purple-50 rounded-xl p-3 border border-purple-100"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-white rounded-lg text-purple-600 shadow-sm">
                          <Repeat size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-purple-900 leading-tight mb-1">
                            Combineer Orders?
                          </p>
                          <p className="text-[10px] text-purple-700 mb-2">
                            Product <strong>{sug.product}</strong> komt{" "}
                            <strong>{sug.count}x</strong> voor in week{" "}
                            {sug.weeks.join(" & ")}.
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {sug.orders.map((o) => (
                              <span
                                key={o.orderId}
                                className="px-1.5 py-0.5 bg-white rounded text-[9px] font-mono font-bold text-purple-500 border border-purple-100"
                              >
                                {o.orderId} (W{o.weekNumber})
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderActiveTab = () => {
    const currentStationNorm = selectedStation.replace(/\D/g, "");
    const activeUnits = rawProducts.filter((p) => {
      const pLoc = String(p.currentStation || "");
      if (selectedStation === "BM01")
        return pLoc === "BM01" || p.currentStep === "Eindinspectie";
      if (selectedStation === "Mazak")
        return pLoc === "MAZAK" || p.currentStep === "Mazak";
      if (selectedStation === "Nabewerking")
        return pLoc === "NABW" || p.currentStep === "Nabewerken";
      const pMachineNorm = pLoc.replace(/\D/g, "");
      return (
        (p.currentStation === selectedStation ||
          pMachineNorm === currentStationNorm) &&
        p.currentStep === "Wikkelen"
      );
    });

    return (
      <div className="space-y-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {activeUnits.map((unit) => (
            <div
              key={unit.lotNumber}
              onClick={() => handleActiveUnitClick(unit)}
              className={`bg-white border-l-4 ${
                unit.orderId === "NOG_TE_BEPALEN"
                  ? "border-red-500"
                  : "border-blue-500"
              } rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-md transition-all`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">{unit.lotNumber}</h2>
                  <p className="text-sm text-gray-500">{unit.item}</p>
                  {unit.orderId === "NOG_TE_BEPALEN" && (
                    <p className="text-xs font-black text-red-600 mt-1">
                      ⚠ EXTRA PRODUCTIE
                    </p>
                  )}
                </div>
                <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold uppercase">
                  {selectedStation === "Mazak"
                    ? "MAZAK"
                    : selectedStation === "Nabewerking"
                    ? "NABEWERKING"
                    : "WIKKELEN"}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProcessUnit(unit);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2"
                >
                  <ArrowRight size={16} /> Klaar / Verder
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActiveUnitClick(unit);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-3 rounded-lg"
                >
                  <Info size={16} />
                </button>
              </div>
            </div>
          ))}
          {activeUnits.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200">
              <Clock className="w-12 h-12 mb-3 text-gray-300" />
              <h3 className="text-lg font-bold text-gray-600">
                Geen items in productie
              </h3>
              <p className="text-sm text-gray-400">
                Items uit 'Lossen' verschijnen hier.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

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
                  <LogOut className="w-4 h-4" />
                  Terug naar Overzicht
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
                {selectedStation === "BM01" ? "Inspectie" : "Productie"}
              </button>
              {!["BM01", "Mazak", "Nabewerking"].includes(selectedStation) && (
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
            {activeTab === "planning" && renderPlanningContent()}
            {activeTab === "winding" && renderActiveTab()}
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
    </div>
  );
};

export default WorkstationHub;
