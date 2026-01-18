import React from "react";
import { Package } from "lucide-react";

const SpecsView = ({ blueprints }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <Package size={24} className="text-orange-500" />
          <div>
            <h3 className="text-xl font-black text-slate-800">
              Fitting Specs Overzicht
            </h3>
            <p className="text-sm text-slate-400">
              Overzicht van alle geconfigureerde templates.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(blueprints).length > 0 ? (
            Object.entries(blueprints).map(([key, bp]) => (
              <div
                key={key}
                className="bg-slate-50 rounded-2xl p-5 border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-slate-800">{bp.name}</h4>
                </div>
                <p className="text-xs font-mono text-slate-400 mb-3 bg-white px-2 py-1 rounded inline-block border border-slate-100">
                  {key}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {bp.fields &&
                    bp.fields.map((f) => (
                      <span
                        key={f}
                        className="px-2 py-1 bg-white text-slate-600 text-[10px] font-bold rounded border border-slate-200 shadow-sm"
                      >
                        {f}
                      </span>
                    ))}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-10 text-center text-slate-400">
              Geen fitting specs gevonden.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpecsView;
