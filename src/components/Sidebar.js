import React from "react";
import {
  Filter,
  Info,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

/**
 * Sidebar.js - Hersteld & Beveiligd tegen 'undefined' errors.
 */
const Sidebar = ({
  filters = {},
  setFilters,
  uniqueTypes = [],
  uniqueDiameters = [],
  uniquePressures = [],
  uniqueConnections = [],
  uniqueAngles = [],
  uniqueLabels = [],
  isOpen,
  toggleSidebar,
}) => {
  const resetFilters = () => {
    setFilters({
      type: "Alle",
      diameter: "Alle",
      pressure: "Alle",
      connection: "Alle",
      angle: "Alle",
      productLabel: "Alle",
    });
  };

  // Sub-component voor een filtergroep met extra beveiliging op 'options'
  const FilterGroup = ({ label, value, options = [], field }) => (
    <div className="space-y-1 mb-4 animate-in">
      <div className="flex items-center justify-between text-left px-1">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
          {label}
        </label>
      </div>
      <select
        value={value || "Alle"}
        onChange={(e) => setFilters({ ...filters, [field]: e.target.value })}
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer hover:border-blue-200"
      >
        {/* Beveiliging: als options undefined is, wordt een lege array gebruikt door de default param */}
        {Array.isArray(options) &&
          options.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "Alle" ? `Alle ${label}` : opt}
            </option>
          ))}
      </select>
    </div>
  );

  return (
    <aside
      className={`bg-white border-r border-slate-200 transition-all duration-300 relative z-20 ${
        isOpen ? "w-64" : "w-12"
      }`}
    >
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1 shadow-md z-30 hover:text-blue-600 transition-colors"
      >
        {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {isOpen && (
        <div className="p-4 h-full flex flex-col animate-in">
          <div className="flex items-center justify-between mb-6 text-left border-b pb-4 border-slate-50 px-1">
            <h3 className="text-xs font-black text-slate-800 uppercase italic flex items-center gap-2">
              <Filter size={14} className="text-blue-600" />
              Database Filters
            </h3>
            <button
              onClick={resetFilters}
              className="text-slate-300 hover:text-red-500 transition-colors p-1"
              title="Filters herstellen"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pb-10 text-left pr-1">
            <FilterGroup
              label="Product Type"
              value={filters?.type}
              options={uniqueTypes}
              field="type"
            />
            <FilterGroup
              label="Product Serie"
              value={filters?.productLabel}
              options={uniqueLabels}
              field="productLabel"
            />
            <FilterGroup
              label="Diameter (ID)"
              value={filters?.diameter}
              options={uniqueDiameters}
              field="diameter"
            />
            <FilterGroup
              label="Drukklasse (PN)"
              value={filters?.pressure}
              options={uniquePressures}
              field="pressure"
            />
            <FilterGroup
              label="Verbinding"
              value={filters?.connection}
              options={uniqueConnections}
              field="connection"
            />
            <FilterGroup
              label="Hoek (°)"
              value={filters?.angle}
              options={uniqueAngles}
              field="angle"
            />
          </div>

          <div className="mt-4 pt-4 border-t border-slate-50">
            <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100/50 shadow-inner">
              <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-[8px] font-bold text-blue-700 leading-tight uppercase tracking-tight">
                Data is gekoppeld aan de live database.
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
