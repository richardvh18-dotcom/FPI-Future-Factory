import React, { useState, useMemo } from "react";
import {
  Activity,
  X,
  Zap,
  Calendar as CalendarIcon,
  History,
} from "lucide-react";
import {
  normalizeMachine,
  formatDate,
  getISOWeekInfo,
} from "../../../utils/hubHelpers";

const StationDetailModal = ({ stationId, allOrders, allProducts, onClose }) => {
  const [activeTab, setActiveTab] = useState("active");
  const [historyFilter, setHistoryFilter] = useState("week");
  const stationNorm = normalizeMachine(stationId);

  // 1. Nu Actief (Live)
  const activeItems = useMemo(() => {
    return allProducts.filter((p) => {
      if (p.currentStep === "Finished" || p.currentStep === "REJECTED")
        return false;
      const pMachine = String(p.originMachine || p.currentStation || "");
      return normalizeMachine(pMachine) === stationNorm;
    });
  }, [allProducts, stationNorm]);

  // 2. Planning (Wachtrij)
  const groupedPlanning = useMemo(() => {
    const relevantOrders = allOrders
      .filter((o) => {
        return o.normMachine === stationNorm && o.status !== "completed";
      })
      .sort((a, b) => {
        if (a.weekYear !== b.weekYear) return a.weekYear - b.weekYear;
        if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber;
        return a.dateObj - b.dateObj;
      });

    const groups = relevantOrders.reduce((acc, order) => {
      const week = order.weekNumber || getISOWeekInfo(new Date()).week;
      if (!acc[week]) acc[week] = [];
      acc[week].push(order);
      return acc;
    }, {});

    const sortedWeeks = Object.keys(groups).sort((a, b) => a - b);

    return { groups, sortedWeeks, total: relevantOrders.length };
  }, [allOrders, stationNorm]);

  // 3. Historie (Recent gereed)
  const historyItems = useMemo(() => {
    const now = new Date();
    const currentWeekInfo = getISOWeekInfo(now);

    return allProducts
      .filter((p) => {
        const pMachine = String(p.originMachine || p.currentStation || "");

        if (
          normalizeMachine(pMachine) !== stationNorm ||
          p.currentStep !== "Finished"
        ) {
          return false;
        }

        const updatedAt = p.updatedAt?.toDate
          ? p.updatedAt.toDate()
          : new Date(p.updatedAt || 0);
        const itemWeekInfo = getISOWeekInfo(updatedAt);

        if (historyFilter === "week") {
          return (
            itemWeekInfo.year === currentWeekInfo.year &&
            itemWeekInfo.week === currentWeekInfo.week
          );
        }

        if (historyFilter === "2weeks") {
          const diffTime = Math.abs(now - updatedAt);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 14;
        }

        if (historyFilter === "month") {
          const diffTime = Math.abs(now - updatedAt);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 30;
        }

        return true;
      })
      .sort(
        (a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)
      );
  }, [allProducts, stationNorm, historyFilter]);

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-xl ${
                activeItems.length > 0
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <Activity
                size={24}
                className={activeItems.length > 0 ? "animate-pulse" : ""}
              />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 uppercase italic tracking-tight">
                {stationId}
              </h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {activeItems.length > 0
                  ? "Productie Actief"
                  : "Station Standby"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 gap-6 bg-white sticky top-0 z-10">
          <button
            onClick={() => setActiveTab("active")}
            className={`py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "active"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <Zap size={16} /> Nu Actief ({activeItems.length})
          </button>
          <button
            onClick={() => setActiveTab("planning")}
            className={`py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "planning"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <CalendarIcon size={16} /> Planning ({groupedPlanning.total})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "history"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <History size={16} /> Historie
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50/30 flex-1">
          {activeTab === "active" && (
            <div className="space-y-3">
              {activeItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Zap size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-bold uppercase">
                    Geen actieve productie op dit moment.
                  </p>
                </div>
              ) : (
                activeItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex justify-between items-center border-l-4 border-l-green-500 animate-in slide-in-from-bottom-2"
                  >
                    <div>
                      <h4 className="text-lg font-black text-gray-800">
                        {item.lotNumber}
                      </h4>
                      <p className="text-sm font-bold text-gray-500">
                        {item.item}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-bold uppercase animate-pulse inline-block mb-1">
                        Draaiend
                      </span>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">
                        Operator: {item.operator?.split("@")[0] || "Unknown"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "planning" && (
            <div className="space-y-6">
              {groupedPlanning.sortedWeeks.map((week) => (
                <div key={week} className="animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Week {week}
                    </span>
                    <div className="h-px bg-slate-200 flex-1"></div>
                  </div>
                  <div className="space-y-2">
                    {groupedPlanning.groups[week].map((order) => (
                      <div
                        key={order.id}
                        className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center font-black text-blue-600 text-xs">
                            {order.plan}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-gray-800">
                              {order.orderId}
                            </h4>
                            <p className="text-xs text-gray-500 line-clamp-1">
                              {order.item}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                              order.status === "in_progress"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {order.status === "in_progress"
                              ? "Actief"
                              : "Gepland"}
                          </span>
                          {order.liveFinish > 0 && (
                            <p className="text-[10px] text-green-600 font-bold mt-1">
                              {order.liveFinish} gereed
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {groupedPlanning.total === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <CalendarIcon size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-xs font-bold uppercase">
                    Geen orders gepland
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="flex bg-white p-1 rounded-lg border border-gray-200 w-fit">
                {["week", "2weeks", "month", "all"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setHistoryFilter(f)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                      historyFilter === f
                        ? "bg-blue-50 text-blue-600 shadow-sm"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {f === "all" ? "Alles" : f}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest pl-1">
                {historyItems.length} items gereed
              </p>
              <div className="space-y-2">
                {historyItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center opacity-75 hover:opacity-100 transition-opacity"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-gray-700">
                        {item.lotNumber}
                      </h4>
                      <p className="text-xs text-gray-400 line-clamp-1">
                        {item.item}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        Gereed
                      </span>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {formatDate(item.updatedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StationDetailModal;
