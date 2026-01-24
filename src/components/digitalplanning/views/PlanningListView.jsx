import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  Clock,
  Search,
  FileText,
  Play,
  Filter,
  Info,
  GitMerge,
  Package,
  ChevronRight,
  CalendarDays,
  ArrowLeftCircle,
  ArrowRightCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  format,
  differenceInCalendarDays,
  isValid,
  parseISO,
  getISOWeek,
  getISOWeekYear,
} from "date-fns";
import { nl } from "date-fns/locale";

// --- HULPFUNCTIES ---

const parseDateSafe = (dateInput) => {
  if (!dateInput) return null;
  // Firestore Timestamp
  if (dateInput.toDate) return dateInput.toDate();
  // String (ISO)
  if (typeof dateInput === "string") {
    // Probeer standaard ISO
    const d = new Date(dateInput);
    if (isValid(d)) return d;
    // Probeer parseISO voor strictere strings
    const dIso = parseISO(dateInput);
    if (isValid(dIso)) return dIso;
  }
  // Date object
  if (dateInput instanceof Date && isValid(dateInput)) return dateInput;

  return null;
};

const formatDate = (dateInput) => {
  const d = parseDateSafe(dateInput);
  if (!d) return "-";
  return format(d, "dd MMM", { locale: nl }); // Korter formaat voor lijst
};

// Bepaal kleur op basis van leverdatum vs vandaag
const getUrgencyStyles = (dateInput) => {
  const d = parseDateSafe(dateInput);
  if (!d)
    return {
      text: "text-slate-500",
      border: "border-transparent",
      bg: "bg-white",
    };

  const days = differenceInCalendarDays(d, new Date());

  if (days < 7)
    return {
      text: "text-rose-600 font-bold",
      border: "border-rose-200",
      bg: "bg-rose-50",
    }; // Urgent (Rood)
  if (days < 14)
    return {
      text: "text-blue-600",
      border: "border-blue-200",
      bg: "bg-blue-50",
    }; // Starten (Blauw)
  return {
    text: "text-slate-700",
    border: "border-transparent",
    bg: "bg-white",
  }; // Normaal (Zwart/Grijs)
};

const PlanningListView = ({
  stationOrders,
  selectedStation,
  onStartProduction,
  onOpenInfo,
}) => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFinished, setShowFinished] = useState(false);

  // Week Filter State
  const [weekFilter, setWeekFilter] = useState("all"); // 'prev', 'curr', 'next', 'all'

  // Huidige datum info voor filters
  const today = new Date();
  const currentWeek = getISOWeek(today);
  const currentYear = getISOWeekYear(today);
  const currentWeekCode = currentYear * 100 + currentWeek;

  // 1. Filter en Sorteer de orders
  const filteredAndSortedOrders = useMemo(() => {
    let list = stationOrders.filter((order) => {
      // A. Zoekterm
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        order.orderId?.toLowerCase().includes(searchLower) ||
        order.item?.toLowerCase().includes(searchLower) ||
        order.lotNumber?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // B. Status Filter
      const isFinished =
        order.status === "completed" ||
        (order.liveFinish >= order.plan && order.plan > 0);
      if (!showFinished && isFinished) return false;

      // C. Week Filter
      const orderYear = parseInt(order.year || order.weekYear || currentYear);
      const orderWeek = parseInt(order.week || order.weekNumber || 0);
      const orderWeekCode = orderYear * 100 + orderWeek;

      if (weekFilter === "prev" && orderWeekCode >= currentWeekCode)
        return false;
      if (weekFilter === "curr" && orderWeekCode !== currentWeekCode)
        return false;
      if (weekFilter === "next" && orderWeekCode <= currentWeekCode)
        return false;

      return true;
    });

    // Sorteer: Jaar -> Week -> Datum
    list.sort((a, b) => {
      const yearA = parseInt(a.year || a.weekYear || 2099);
      const yearB = parseInt(b.year || b.weekYear || 2099);
      if (yearA !== yearB) return yearA - yearB;

      const weekA = parseInt(a.week || a.weekNumber || 99);
      const weekB = parseInt(b.week || b.weekNumber || 99);
      if (weekA !== weekB) return weekA - weekB;

      return 0;
    });

    return list;
  }, [stationOrders, searchTerm, showFinished, weekFilter, currentWeekCode]);

  // 2. Groepeer op Week (voor weergave met headers)
  const groupedOrders = useMemo(() => {
    const groups = {};
    filteredAndSortedOrders.forEach((order) => {
      const year = order.year || order.weekYear || currentYear;
      const week = order.week || order.weekNumber || "?";
      const key = `${year}-W${week}`;

      if (!groups[key]) {
        groups[key] = { id: key, year, week, orders: [] };
      }
      groups[key].orders.push(order);
    });
    return Object.values(groups);
  }, [filteredAndSortedOrders]);

  // 3. Selecteer automatisch de eerste order bij laden
  useEffect(() => {
    if (!selectedOrder && filteredAndSortedOrders.length > 0) {
      // setSelectedOrder(filteredAndSortedOrders[0]);
    }
  }, [filteredAndSortedOrders, selectedOrder]);

  // 4. Zoek gerelateerde orders (Optimalisatie Suggestie)
  const optimizationSuggestions = useMemo(() => {
    if (!selectedOrder) return [];

    return stationOrders.filter(
      (o) =>
        o.id !== selectedOrder.id && // Niet zichzelf
        o.item === selectedOrder.item && // Zelfde product
        o.status !== "completed" // Nog niet klaar
    );
  }, [selectedOrder, stationOrders]);

  return (
    <div className="flex h-full gap-6 overflow-hidden">
      {/* --- LINKER KOLOM: LIJST --- */}
      <div className="w-1/3 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Zoek order, item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* Week Filter Knoppen */}
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 mb-3 overflow-x-auto no-scrollbar">
            {[
              {
                id: "prev",
                label: "Vorige",
                icon: <ArrowLeftCircle size={14} />,
              },
              { id: "curr", label: "Deze", icon: <CalendarDays size={14} /> },
              {
                id: "next",
                label: "Volgende",
                icon: <ArrowRightCircle size={14} />,
              },
              { id: "all", label: "Alles", icon: <Filter size={14} /> },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setWeekFilter(f.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold uppercase rounded-lg transition-all whitespace-nowrap ${
                  weekFilter === f.id
                    ? "bg-slate-800 text-white shadow-md"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                }`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>

          {/* Teller & Gereed Toggle */}
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              {filteredAndSortedOrders.length} Orders
            </span>
            <button
              onClick={() => setShowFinished(!showFinished)}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                showFinished
                  ? "bg-emerald-100 text-emerald-600"
                  : "text-slate-400 hover:bg-slate-100"
              }`}
            >
              <CheckCircle2 size={12} />{" "}
              {showFinished ? "Verberg Gereed" : "Toon Gereed"}
            </button>
          </div>
        </div>

        {/* Scrollable Lijst met Week Breaks */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
          {groupedOrders.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <p className="text-sm italic">Geen orders gevonden.</p>
            </div>
          ) : (
            groupedOrders.map((group) => (
              <div key={group.id}>
                {/* WEEK HEADER */}
                <div className="flex items-center gap-2 mb-2 px-2 sticky top-0 bg-white/95 backdrop-blur-sm z-10 py-2 border-b border-slate-50">
                  <div
                    className={`text-xs font-black px-2 py-1 rounded ${
                      group.week === currentWeek && group.year === currentYear
                        ? "bg-blue-100 text-blue-600"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    WEEK {group.week}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {group.year}
                  </span>
                </div>

                {/* ORDERS IN DEZE WEEK */}
                <div className="space-y-2">
                  {group.orders.map((order) => {
                    const isSelected = selectedOrder?.id === order.id;
                    const urgency = getUrgencyStyles(
                      order.deliveryDate || order.plannedDate
                    );

                    const isNew = order.createdAt?.toDate
                      ? differenceInCalendarDays(
                          new Date(),
                          order.createdAt.toDate()
                        ) < 2
                      : order.isNew;

                    return (
                      <div
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`p-4 rounded-2xl cursor-pointer border-2 transition-all relative group ${
                          isSelected
                            ? "bg-blue-50 border-blue-500 shadow-md"
                            : "bg-white border-transparent hover:border-slate-200 hover:shadow-sm"
                        }`}
                      >
                        {/* NIEUW BADGE */}
                        {isNew && (
                          <span className="absolute top-3 right-3 px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-black uppercase rounded-full shadow-sm animate-pulse">
                            NIEUW
                          </span>
                        )}

                        <div className="flex flex-col gap-1 mb-2">
                          <span className="font-mono text-xs font-bold text-slate-500">
                            {order.orderId}
                          </span>
                          <h4
                            className={`font-bold text-sm leading-tight pr-8 ${
                              isSelected ? "text-blue-900" : "text-slate-800"
                            }`}
                          >
                            {order.item}
                          </h4>

                          {/* PRODUCT CODE LABEL */}
                          {order.productCode && (
                            <div className="inline-block mt-1">
                              <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                {order.productCode}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold flex items-center gap-1 ${urgency.text}`}
                            >
                              <Clock size={12} />
                              {formatDate(
                                order.deliveryDate || order.plannedDate
                              )}
                            </span>
                          </div>

                          {/* Voortgangsindicator */}
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  order.liveFinish >= order.plan
                                    ? "bg-emerald-500"
                                    : "bg-blue-500"
                                }`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (order.liveFinish / order.plan) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-600">
                              {order.liveFinish}/{order.plan}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- RECHTER KOLOM: DETAILS --- */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        {selectedOrder ? (
          <>
            <div className="p-8 border-b border-slate-100 bg-slate-50/30">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1 pr-8">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">
                      {selectedOrder.orderId}
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase bg-white border border-slate-200 px-2 py-1 rounded-lg">
                      Week {selectedOrder.week}
                    </span>
                    {selectedOrder.productCode && (
                      <span className="text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg uppercase">
                        {selectedOrder.productCode}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800 uppercase italic leading-tight">
                    {selectedOrder.item}
                  </h2>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-5xl font-black text-blue-600 leading-none">
                    {selectedOrder.plan}
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Stuks
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                <DetailBlock
                  label="Leverdatum"
                  value={formatDate(
                    selectedOrder.deliveryDate || selectedOrder.plannedDate
                  )}
                  icon={<Clock size={14} />}
                  colorClass={
                    getUrgencyStyles(
                      selectedOrder.deliveryDate || selectedOrder.plannedDate
                    ).text
                  }
                />
                <DetailBlock
                  label="Lotnummer"
                  value={selectedOrder.lotNumber || "-"}
                  icon={<Package size={14} />}
                />
                <DetailBlock
                  label="Machine"
                  value={selectedOrder.machine || selectedStation}
                />
                <DetailBlock
                  label="Tekening"
                  value={selectedOrder.drawing || "-"}
                  font="font-mono"
                />
              </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
              {/* 1. OPTIMALISATIE MELDING (Uit Import) */}
              {selectedOrder.optimizationNote && (
                <div className="mb-6 mx-auto max-w-2xl p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-center gap-4 text-center">
                  <div className="p-2 bg-orange-100 rounded-xl text-orange-600 shrink-0">
                    <GitMerge size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-orange-800 uppercase tracking-wide mb-1">
                      Optimalisatie Mogelijk
                    </h4>
                    <p className="text-sm text-orange-800 font-medium">
                      {selectedOrder.optimizationNote}
                    </p>
                  </div>
                </div>
              )}

              {/* 2. LIVE OPTIMALISATIE SUGGESTIES */}
              {optimizationSuggestions.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <GitMerge size={14} className="text-orange-500" /> Order
                    komt ook nog voor in:
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {optimizationSuggestions.map((suggest) => (
                      <div
                        key={suggest.id}
                        className="flex items-center justify-between p-3 bg-orange-50 border-2 border-orange-200 rounded-xl hover:border-orange-400 transition-all cursor-pointer group"
                        onClick={() => setSelectedOrder(suggest)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                              Week {suggest.week}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-700">
                              {suggest.orderId}
                            </span>
                          </div>
                          <div className="h-8 w-px bg-orange-200"></div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              Leverdatum
                            </span>
                            <span
                              className={`text-xs font-bold ${
                                getUrgencyStyles(suggest.deliveryDate).text
                              }`}
                            >
                              {formatDate(suggest.deliveryDate)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-slate-800">
                            {suggest.plan} stuks
                          </span>
                          <ChevronRight size={16} className="text-orange-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTIE KNOPPEN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <button
                  onClick={() => onStartProduction(selectedOrder)}
                  className="py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-blue-200 flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  <Play size={20} fill="currentColor" /> Start Productie
                </button>

                <button
                  onClick={() => {
                    if (selectedOrder.drawing) {
                      onOpenInfo(selectedOrder.linkedProductId);
                    }
                  }}
                  disabled={!selectedOrder.drawing}
                  className={`py-5 border-2 rounded-2xl font-bold uppercase text-sm tracking-widest flex items-center justify-center gap-3 transition-all ${
                    selectedOrder.drawing
                      ? "bg-white border-slate-200 hover:border-slate-300 text-slate-600 active:scale-95"
                      : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                  }`}
                >
                  {selectedOrder.drawing ? (
                    <>
                      <FileText size={20} /> Bekijk Tekening
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={20} /> Geen Tekening Bekend
                    </>
                  )}
                </button>
              </div>

              {/* Details */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Info size={14} /> Technische Specificaties
                </h4>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4 text-sm text-slate-600">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-400 font-medium">Project</span>
                    <span className="font-bold text-slate-800">
                      {selectedOrder.project || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-400 font-medium">
                      Artikelcode
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedOrder.item || "-"}
                    </span>
                  </div>
                  {selectedOrder.description && (
                    <div className="pt-2">
                      <span className="block text-xs font-bold text-slate-400 uppercase mb-2">
                        Volledige Omschrijving
                      </span>
                      <p className="leading-relaxed bg-white p-3 rounded-xl border border-slate-100 italic">
                        {selectedOrder.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8 text-center bg-slate-50/30">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
              <FileText size={64} className="opacity-20 text-slate-400" />
            </div>
            <h3 className="text-2xl font-black uppercase italic tracking-tight mb-2 text-slate-400">
              Selecteer een order
            </h3>
            <p className="text-sm font-medium max-w-xs mx-auto text-slate-400">
              Klik op een order in de linker lijst om details, optimalisaties en
              acties te zien.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const DetailBlock = ({
  label,
  value,
  icon,
  font = "font-bold",
  colorClass = "text-slate-800",
}) => (
  <div>
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
      {label}
    </span>
    <span className={`text-base ${font} ${colorClass} flex items-center gap-2`}>
      {icon} {value}
    </span>
  </div>
);

export default PlanningListView;
