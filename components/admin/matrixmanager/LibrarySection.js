import React, { useState } from "react";
import { Plus, X } from "lucide-react";

/**
 * LibrarySection: De herbruikbare component voor de lijsten in de bibliotheek.
 * Bevat extra checks om 'undefined' errors te voorkomen.
 */
const LibrarySection = ({
  title,
  items = [],
  onAdd,
  onRemove,
  placeholder,
  icon,
}) => {
  const [val, setVal] = useState("");

  const handleAdd = () => {
    const trimmed = val.trim();
    if (trimmed) {
      onAdd(trimmed);
      setVal("");
    }
  };

  // Zorg dat items altijd een array is om .map errors te voorkomen
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow h-full min-h-[350px]">
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Veilig icoon renderen */}
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <h3 className="font-bold text-slate-700 text-sm uppercase tracking-tight">
            {title || "Lijst"}
          </h3>
        </div>
        <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-2 py-1 rounded-md">
          {safeItems.length}
        </span>
      </div>

      {/* Body: De lijst met items */}
      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-white">
        <div className="flex flex-wrap gap-2 mb-4">
          {safeItems.length > 0 ? (
            safeItems.map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-2 shadow-sm animate-in zoom-in duration-200"
              >
                {item}
                <button
                  onClick={() => onRemove(item)}
                  className="text-slate-300 hover:text-red-500 transition-colors p-0.5"
                  type="button"
                >
                  <X size={12} />
                </button>
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-300 italic py-2">
              Geen items gevonden...
            </span>
          )}
        </div>
      </div>

      {/* Footer: Input voor nieuwe items */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
        <input
          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
          placeholder={placeholder || "Toevoegen..."}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!val.trim()}
          className="bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 disabled:opacity-30 disabled:hover:bg-slate-900 transition-all flex items-center justify-center shadow-sm"
          type="button"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

// CRUCIAAL: Exporteer als default
export default LibrarySection;
