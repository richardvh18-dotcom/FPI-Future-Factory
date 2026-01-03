import React, { useState } from "react";
import { Plus, X } from "lucide-react";

const LibrarySection = ({
  title,
  items = [],
  onAdd,
  onRemove,
  placeholder,
  icon,
}) => {
  const [val, setVal] = useState("");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
        {icon}
        <h3 className="font-bold text-slate-700">{title}</h3>
      </div>
      <div className="p-4 flex-1">
        <div className="flex flex-wrap gap-2 mb-4">
          {items.map((item) => (
            <span
              key={item}
              className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-2 shadow-sm animate-in zoom-in"
            >
              {item}
              <button
                onClick={() => onRemove(item)}
                className="text-slate-300 hover:text-red-500"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {items.length === 0 && (
            <span className="text-xs text-slate-300 italic">
              Nog geen items...
            </span>
          )}
        </div>
      </div>
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
        <input
          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-400"
          placeholder={placeholder}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAdd(val);
              setVal("");
            }
          }}
        />
        <button
          onClick={() => {
            onAdd(val);
            setVal("");
          }}
          className="bg-slate-900 text-white px-3 rounded-lg hover:bg-emerald-600 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

export default LibrarySection;
