import React, { useState, useEffect } from "react";
import { Filter, X, ChevronRight, ChevronLeft, Lightbulb } from "lucide-react";

// De lijst met tips
const TIPS = [
  "Gebruik de filters om snel specifieke fittingen te vinden.",
  "Wist je dat je datasheets direct als PDF kunt exporteren?",
  "In het Admin Dashboard kun je nieuwe producten toevoegen.",
  "Gebruik de Calculator om nauwkeurig Z-maten te berekenen.",
  "Controleer regelmatig de voorraadstatus in het overzicht.",
  "Je kunt de sidebar inklappen voor meer schermruimte.",
  "Dubbelklik op een product voor alle technische details.",
];

// Sub-component voor de wisselende tip
const SidebarTip = () => {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false); // Start fade out
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % TIPS.length);
        setFade(true); // Start fade in
      }, 300); // Wacht kort voor de wissel
    }, 10000); // 10 seconden

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 bg-slate-50 border-t border-slate-200">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 relative shadow-sm h-28 flex flex-col">
        {/* Icoon en Titel */}
        <div className="flex items-center gap-2 mb-2 text-blue-600">
          <Lightbulb size={16} className="fill-blue-100" />
          <span className="text-[10px] font-black uppercase tracking-wider">
            Wist je dat?
          </span>
        </div>

        {/* Tekst container met vaste hoogte en animatie */}
        <div
          className={`flex-1 flex items-center transition-opacity duration-300 ${
            fade ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="text-xs font-medium text-slate-600 leading-relaxed">
            {TIPS[index]}
          </p>
        </div>

        {/* Decoratief pijltje voor ballon effect */}
        <div className="absolute -bottom-2 left-6 w-3 h-3 bg-blue-50 border-b border-r border-blue-100 transform rotate-45"></div>
      </div>
    </div>
  );
};

const Sidebar = ({
  filters,
  setFilters,
  uniqueTypes,
  uniqueDiameters,
  uniquePressures,
  uniqueConnections,
  uniqueAngles,
  uniqueLabels,
  isOpen,
  toggleSidebar,
}) => {
  const handleReset = () => {
    setFilters({
      type: "-",
      diameter: "-",
      pressure: "-",
      connection: "-",
      angle: "-",
      productLabel: "-",
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Helper voor select class - Aangepast voor compactere weergave
  const selectClass =
    "w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-md py-1.5 px-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block";
  const labelClass =
    "block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider";

  return (
    <div
      className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out relative ${
        isOpen ? "w-64" : "w-0"
      }`}
    >
      {/* Toggle Button (Buiten de sidebar als hij dicht is, binnen als open) */}
      <button
        onClick={toggleSidebar}
        className={`absolute top-4 -right-3 z-50 bg-white border border-slate-200 rounded-full p-1 shadow-sm hover:bg-slate-50 text-slate-500 ${
          !isOpen && "translate-x-full right-[-12px]"
        }`}
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      <div
        className={`flex-1 flex flex-col overflow-hidden ${
          !isOpen && "hidden"
        }`}
      >
        {/* Header - Compactere padding */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm">
            <Filter size={16} className="text-blue-600" />
            Filters
          </h3>
          <button
            onClick={handleReset}
            className="text-[10px] font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
          >
            <X size={10} /> Reset
          </button>
        </div>

        {/* Filter Content - Compactere spacing */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {/* 1. Type */}
          <div>
            <label className={labelClass}>Product Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange("type", e.target.value)}
              className={selectClass}
            >
              <option value="-">-</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Diameter */}
          <div>
            <label className={labelClass}>Diameter (DN)</label>
            <select
              value={filters.diameter}
              onChange={(e) => handleFilterChange("diameter", e.target.value)}
              className={selectClass}
            >
              <option value="-">-</option>
              {uniqueDiameters.map((d) => (
                <option key={d} value={d}>
                  DN {d}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Druk */}
          <div>
            <label className={labelClass}>Drukklasse (PN)</label>
            <select
              value={filters.pressure}
              onChange={(e) => handleFilterChange("pressure", e.target.value)}
              className={selectClass}
            >
              <option value="-">-</option>
              {uniquePressures.map((p) => (
                <option key={p} value={p}>
                  PN {p}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Verbinding */}
          <div>
            <label className={labelClass}>Verbinding</label>
            <select
              value={filters.connection}
              onChange={(e) => handleFilterChange("connection", e.target.value)}
              className={selectClass}
            >
              <option value="-">-</option>
              {uniqueConnections.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Hoek */}
          <div>
            <label className={labelClass}>Hoek</label>
            <select
              value={filters.angle}
              onChange={(e) => handleFilterChange("angle", e.target.value)}
              className={selectClass}
            >
              <option value="-">-</option>
              {uniqueAngles.map((a) => (
                <option key={a} value={a}>
                  {a}°
                </option>
              ))}
            </select>
          </div>

          {/* 6. Label */}
          <div>
            <label className={labelClass}>Label</label>
            <select
              value={filters.productLabel}
              onChange={(e) =>
                handleFilterChange("productLabel", e.target.value)
              }
              className={selectClass}
            >
              <option value="-">-</option>
              {uniqueLabels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer Info / Tip met vaste hoogte */}
        <SidebarTip />
      </div>
    </div>
  );
};

export default Sidebar;
