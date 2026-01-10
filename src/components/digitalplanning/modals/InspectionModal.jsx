import React from "react";
import {
  X,
  Ruler,
  Settings as SettingsIcon,
  Target,
  Info,
  History as HistoryIcon,
  Loader2,
  Save,
} from "lucide-react";

/**
 * Modal voor kwaliteitsmetingen (TW, TWcb) en technisch dossier.
 */
const InspectionModal = ({
  isOpen,
  onClose,
  product,
  isViewingOnly,
  formData,
  setFormData,
  targetSpecs,
  onSave,
  loading,
}) => {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl rounded-[50px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 max-h-[90vh] text-left">
        <div className="p-10 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-blue-500 rounded-3xl shadow-lg">
              <Ruler size={32} />
            </div>
            <div>
              <h3 className="text-3xl font-black italic uppercase tracking-tight">
                {isViewingOnly ? "Technisch" : "Kwaliteitsmeting"} &{" "}
                <span className="text-blue-400">Dossier</span>
              </h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Lotnummer: {product.lotNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-4 bg-white/5 hover:bg-red-500 text-white rounded-2xl transition-all shadow-sm"
          >
            <X size={28} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar text-left">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 flex items-center gap-2">
                <SettingsIcon size={14} /> Maatvoering Analyse
              </h4>
              <div className="group space-y-2">
                <label className="block text-[11px] font-black text-slate-500 uppercase">
                  Gemeten TW (Body)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    readOnly={isViewingOnly}
                    className={`w-full border-4 rounded-3xl px-8 py-5 text-2xl font-black outline-none transition-all shadow-inner ${
                      isViewingOnly
                        ? "bg-slate-100 border-slate-200 text-slate-500"
                        : "bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500"
                    }`}
                    value={isViewingOnly ? product.inspection?.tw : formData.tw}
                    onChange={(e) =>
                      setFormData({ ...formData, tw: e.target.value })
                    }
                    placeholder="0.00"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2">
                    <span className="text-xs font-black text-slate-300 uppercase tracking-widest">
                      Target: {targetSpecs?.W || targetSpecs?.TWcb || "-"} mm
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 flex items-center gap-2">
                <Target size={14} /> Kwaliteit Status
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {(isViewingOnly
                  ? [product.inspection?.status]
                  : ["Goed", "Tijdelijke afkeur", "Definitieve afkeur"]
                ).map((label) => {
                  const active =
                    (isViewingOnly
                      ? product.inspection?.status
                      : formData.status) === label;
                  if (isViewingOnly && !active) return null;

                  let colorClass = active
                    ? "border-slate-900 bg-emerald-600 text-white shadow-xl"
                    : "border-slate-100 bg-slate-50 text-slate-400";
                  if (active && label === "Tijdelijke afkeur")
                    colorClass =
                      "border-orange-500 bg-orange-500 text-white shadow-xl";
                  if (active && label === "Definitieve afkeur")
                    colorClass =
                      "border-red-600 bg-red-600 text-white shadow-xl";

                  return (
                    <button
                      key={label}
                      disabled={isViewingOnly}
                      onClick={() =>
                        setFormData({ ...formData, status: label })
                      }
                      className={`flex items-center justify-between p-6 rounded-[28px] border-2 transition-all ${colorClass}`}
                    >
                      <span className="font-black text-xs uppercase tracking-widest">
                        {label}
                      </span>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          active ? "border-white" : "border-slate-200"
                        }`}
                      >
                        {active && (
                          <div className="w-3 h-3 bg-white rounded-full" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-6 shrink-0 text-left">
          {isViewingOnly ? (
            <div className="flex items-center gap-3 text-slate-400 bg-white px-6 py-4 rounded-2xl border">
              <HistoryIcon size={20} className="text-blue-500" />
              <p className="text-[10px] font-bold uppercase leading-tight">
                Log: {new Date(product.inspection?.timestamp).toLocaleString()}
              </p>
            </div>
          ) : (
            <button
              disabled={loading || !formData.tw}
              onClick={onSave}
              className="bg-slate-900 text-white px-12 py-6 rounded-[30px] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-2xl active:scale-95 flex items-center gap-3"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Save size={20} />
              )}{" "}
              Bevestigen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InspectionModal;
