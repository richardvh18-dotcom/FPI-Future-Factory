import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Zap,
  CheckCircle2,
  AlertOctagon,
  FileText,
  X,
  Layers,
  List,
  Activity,
  ArrowLeft,
  Cpu,
  Users,
  Monitor,
  FileSpreadsheet,
  ClipboardList,
  TrendingUp,
  Clock,
  CalendarDays,
  UserCheck,
} from "lucide-react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase.js";
import { getISOWeek } from "date-fns";

// Helpers & Modals
import { getAppId, normalizeMachine } from "../../utils/hubHelpers";
import PersonnelOccupancy from "./PersonnelOccupancy";
import StatusBadge from "./common/StatusBadge.jsx";
import StationDetailModal from "./modals/StationDetailModal";
import TerminalSelectionModal from "./modals/TerminalSelectionModal";
import TraceModal from "./modals/TraceModal";
import PlanningSidebar from "./PlanningSidebar.jsx";
import PlanningImportModal from "./modals/PlanningImportModal";

/**
 * TeamleaderHub V6 - Nu met personeelsbezetting in de Live Monitor.
 */
const TeamleaderHub = ({
  onBack,
  onExit,
  fixedScope = "all",
  departmentName = "Algemeen",
  allowedMachines = [],
}) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [rawOrders, setRawOrders] = useState([]);
  const [rawProducts, setRawProducts] = useState([]);
  const [bezetting, setBezetting] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Modals state
  const [showTraceModal, setShowTraceModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalData, setModalData] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedStationDetail, setSelectedStationDetail] = useState(null);
  const [showTerminalSelection, setShowTerminalSelection] = useState(false);

  const currentAppId = getAppId();

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
    const unsubOcc = onSnapshot(
      query(
        collection(
          db,
          "artifacts",
          currentAppId,
          "public",
          "data",
          "machine_occupancy"
        )
      ),
      (snap) => {
        setBezetting(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => {
      unsubOrders();
      unsubProds();
      unsubOcc();
    };
  }, [currentAppId]);

  const allowedNorms = useMemo(
    () => allowedMachines.map((m) => normalizeMachine(m)),
    [allowedMachines]
  );

  const dataStore = useMemo(() => {
    return rawOrders
      .map((o) => ({ ...o, normMachine: normalizeMachine(o.machine || "") }))
      .filter(
        (o) => allowedNorms.includes(o.normMachine) || allowedNorms.length === 0
      );
  }, [rawOrders, allowedNorms]);

  const metrics = useMemo(() => {
    const currentWeek = getISOWeek(new Date());
    const validOrderIds = new Set(dataStore.map((o) => o.orderId));

    const machineGridData = allowedMachines.map((mId) => {
      const mNorm = normalizeMachine(mId);
      const mProducts = rawProducts.filter(
        (p) => normalizeMachine(p.machine || "") === mNorm
      );

      // NIEUW: Tel hoeveel personen aan deze machine gekoppeld zijn
      const currentOccupancy = bezetting.filter(
        (b) => normalizeMachine(b.machineId) === mNorm
      );

      return {
        id: mId,
        planned: dataStore
          .filter((o) => o.normMachine === mNorm)
          .reduce((acc, o) => acc + Number(o.plan || 0), 0),
        finished: mProducts.filter((p) => p.status === "Finished").length,
        active: mProducts.filter((p) => p.status === "In Production").length,
        operatorCount: currentOccupancy.length,
        operatorNames: currentOccupancy.map((o) => o.operatorName).join(", "),
      };
    });

    return {
      totalPlanned: dataStore.reduce((acc, o) => acc + Number(o.plan || 0), 0),
      activeCount: rawProducts.filter(
        (p) => p.status === "In Production" && validOrderIds.has(p.orderId)
      ).length,
      finishedCount: rawProducts.filter(
        (p) =>
          p.status === "Finished" &&
          validOrderIds.has(p.orderId) &&
          parseInt(p.lotNumber?.substring(4, 6)) === currentWeek
      ).length,
      rejectedCount: rawProducts.filter(
        (p) => p.status === "Rejected" && validOrderIds.has(p.orderId)
      ).length,
      bezettingAantal: bezetting.filter((b) =>
        allowedNorms.includes(normalizeMachine(b.machineId))
      ).length,
      machineGridData,
    };
  }, [dataStore, rawProducts, bezetting, allowedMachines, allowedNorms]);

  const handleDashboardClick = (id) => {
    if (id === "bezetting") {
      setActiveTab("bezetting");
      return;
    }

    let fData = [],
      title = "";
    const validIds = new Set(dataStore.map((o) => o.orderId));
    const currentWeek = getISOWeek(new Date());

    switch (id) {
      case "gepland":
        fData = [...dataStore];
        title = "Geplande Orders";
        break;
      case "in_proces":
        fData = rawProducts.filter(
          (p) => p.status === "In Production" && validIds.has(p.orderId)
        );
        title = "Lopend in Productie";
        break;
      case "gereed":
        fData = rawProducts.filter(
          (p) =>
            p.status === "Finished" &&
            validIds.has(p.orderId) &&
            parseInt(p.lotNumber?.substring(4, 6)) === currentWeek
        );
        title = "Gereed (Week)";
        break;
      case "afkeur":
        fData = rawProducts.filter(
          (p) => p.status === "Rejected" && validIds.has(p.orderId)
        );
        title = "Afkeur Dossiers";
        break;
      default:
        return;
    }

    setModalData(fData);
    setModalTitle(title);
    setShowTraceModal(true);
  };

  if (loading)
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );

  return (
    <div className="flex flex-col h-full bg-slate-50 text-left w-full animate-in fade-in duration-300 overflow-hidden">
      {/* HEADER */}
      <div className="sticky top-0 p-4 bg-white border-b flex justify-between items-center shrink-0 z-50 shadow-sm px-6 w-full text-left">
        <div className="flex items-center gap-6">
          <button
            onClick={onBack || onExit}
            className="p-3 bg-slate-100 hover:bg-rose-50 text-slate-500 rounded-2xl border border-slate-200 transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="text-left text-left">
            <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter leading-none">
              Teamleader Hub
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
              {departmentName} Dashboard
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow-lg font-black text-[10px] uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all"
          >
            <FileSpreadsheet size={16} /> Import
          </button>
          <button
            onClick={() => setShowTerminalSelection(true)}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-2 hover:bg-slate-50"
          >
            <Monitor size={14} /> Terminal
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6 w-full flex flex-col text-left">
        {/* TABS */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 w-fit shrink-0">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "dashboard"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("bezetting")}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "bezetting"
                ? "bg-white text-emerald-600 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Personeel & Capaciteit
          </button>
          <button
            onClick={() => setActiveTab("planning")}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "planning"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Planning
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {activeTab === "dashboard" ? (
            <div className="h-full overflow-y-auto custom-scrollbar space-y-8 pr-2">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  {
                    id: "gepland",
                    label: "Totaal Plan",
                    val: metrics.totalPlanned,
                    icon: Layers,
                  },
                  {
                    id: "in_proces",
                    label: "Actief",
                    val: metrics.activeCount,
                    icon: Zap,
                  },
                  {
                    id: "gereed",
                    label: "Gereed (W)",
                    val: metrics.finishedCount,
                    icon: CheckCircle2,
                  },
                  {
                    id: "afkeur",
                    label: "Afkeur",
                    val: metrics.rejectedCount,
                    icon: AlertOctagon,
                  },
                  {
                    id: "bezetting",
                    label: "Bezetting",
                    val: metrics.bezettingAantal,
                    icon: Users,
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleDashboardClick(item.id)}
                    className="bg-white p-6 rounded-[35px] border-2 border-slate-100 shadow-sm cursor-pointer hover:border-blue-300 transition-all group text-left"
                  >
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2 group-hover:text-blue-500">
                      <item.icon size={14} className="text-blue-500" />{" "}
                      {item.label}
                    </p>
                    <p className="text-3xl font-black text-slate-800 italic">
                      {item.val}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-4 text-left">
                <h3 className="text-sm font-black text-slate-800 uppercase italic tracking-widest ml-1">
                  Live Station Monitor
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {metrics.machineGridData.map((machine) => (
                    <div
                      key={machine.id}
                      onClick={() => setSelectedStationDetail(machine.id)}
                      className="bg-white border border-slate-200 rounded-[35px] p-6 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all cursor-pointer group relative overflow-hidden text-left"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Cpu size={80} />
                      </div>
                      <div className="text-left mb-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                          Station
                        </span>
                        <div className="flex justify-between items-center">
                          <h4 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">
                            {machine.id}
                          </h4>
                          {/* NIEUWE BEZETTING INDICATOR OP DASHBOARD */}
                          {machine.operatorCount > 0 && (
                            <div className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg text-[9px] font-black flex items-center gap-1 animate-in fade-in zoom-in">
                              <Users size={10} /> {machine.operatorCount}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-50">
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">
                            Plan
                          </span>
                          <span className="text-sm font-black text-slate-700 italic">
                            {machine.planned}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-blue-400 uppercase block mb-0.5">
                            Actief
                          </span>
                          <span className="text-sm font-black text-blue-600 italic">
                            {machine.active}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-emerald-400 uppercase block mb-0.5">
                            Klaar
                          </span>
                          <span className="text-sm font-black text-emerald-600 italic">
                            {machine.finished}
                          </span>
                        </div>
                      </div>
                      {machine.operatorNames && (
                        <div className="mt-3 pt-2 border-t border-slate-50 flex items-center gap-1.5 opacity-60">
                          <UserCheck size={10} className="text-emerald-500" />
                          <span className="text-[8px] font-bold text-slate-400 uppercase truncate">
                            {machine.operatorNames}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === "bezetting" ? (
            <div className="h-full overflow-y-auto custom-scrollbar">
              <PersonnelOccupancy
                scope={fixedScope}
                machines={allowedMachines}
                editable={true}
              />
            </div>
          ) : (
            <div className="h-full flex gap-6 overflow-hidden text-left text-left">
              <div className="w-80 shrink-0 flex flex-col min-h-0 text-left">
                <PlanningSidebar
                  orders={dataStore}
                  selectedOrderId={selectedOrderId}
                  onSelect={setSelectedOrderId}
                />
              </div>
              <div className="flex-1 bg-white rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-center items-center opacity-40 italic">
                <ClipboardList size={64} className="mb-4 text-slate-300" />
                <p className="font-black uppercase tracking-widest text-xs text-slate-400">
                  Selecteer een order voor dossier details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {showTraceModal && (
        <TraceModal
          isOpen={true}
          onClose={() => setShowTraceModal(false)}
          title={modalTitle}
          data={modalData}
        />
      )}
      {showImportModal && (
        <PlanningImportModal
          isOpen={true}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => setActiveTab("planning")}
        />
      )}
      {showTerminalSelection && (
        <TerminalSelectionModal
          onClose={() => setShowTerminalSelection(false)}
        />
      )}
      {selectedStationDetail && (
        <StationDetailModal
          stationId={selectedStationDetail}
          allOrders={dataStore}
          allProducts={rawProducts}
          onClose={() => setSelectedStationDetail(null)}
        />
      )}
    </div>
  );
};

export default TeamleaderHub;
