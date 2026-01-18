import React, { useState } from "react";
import {
  Search,
  PlayCircle,
  BookOpen,
  Link as LinkIcon,
  FileText,
} from "lucide-react";
import {
  getISOWeekInfo,
  getMaterialInfo,
} from "../../../utils/workstationLogic";

const PlanningListView = ({
  stationOrders,
  selectedStation,
  onStartProduction,
  onLinkOrder,
  onOpenInfo,
}) => {
  const [weekFilter, setWeekFilter] = useState("current");
  const [searchTerm, setSearchTerm] = useState("");

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
          selectedStation !== "BM01" && selectedStation !== "Station BM01"
            ? "lg:col-span-8"
            : ""
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
                  {groupedByWeek[weekKey].map((order) => {
                    const matInfo = getMaterialInfo(order.item);
                    return (
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
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-bold border flex items-center gap-1 mr-4 ${matInfo.colorClasses}`}
                              >
                                {matInfo.icon} {matInfo.shortLabel}
                              </span>
                              {selectedStation !== "BM01" &&
                                selectedStation !== "Station BM01" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onStartProduction(order);
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white p-1.5 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1"
                                    title="Start Productie"
                                  >
                                    <PlayCircle size={14} />{" "}
                                    <span className="text-[10px] font-black uppercase tracking-wide">
                                      Start
                                    </span>
                                  </button>
                                )}
                            </div>
                            <p className="text-sm font-medium text-gray-600 line-clamp-1">
                              {order.item}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="block text-sm font-black text-blue-600">
                              {order.liveToDo}
                            </span>
                            <span className="text-[9px] font-bold text-gray-400 block">
                              van {order.plan} st
                            </span>
                          </div>
                          {order.linkedProductId ? (
                            <button
                              onClick={() => onOpenInfo(order.linkedProductId)}
                              className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                            >
                              <BookOpen size={18} />
                            </button>
                          ) : (
                            <button
                              onClick={() => onLinkOrder(order)}
                              className="text-slate-300 hover:text-blue-500 p-2 transition-colors"
                            >
                              <LinkIcon size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
    </div>
  );
};

export default PlanningListView;
