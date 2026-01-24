import React, { useState } from "react";
import { X, CheckCircle, AlertTriangle, Printer } from "lucide-react"; // Printer icoon
import ProductionStartModal from "./ProductionStartModal"; // Importeer de modal

const InspectionModal = ({ isOpen, onClose, order, onInspect }) => {
  const [status, setStatus] = useState("approved");
  const [notes, setNotes] = useState("");

  // State voor Label Modal
  const [showLabelModal, setShowLabelModal] = useState(false);

  if (!isOpen || !order) return null;

  const handleSubmit = () => {
    onInspect(order.id, status, notes);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
          <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
            <div>
              <h3 className="text-lg font-black uppercase italic">
                Eindinspectie
              </h3>
              <p className="text-slate-400 text-sm">{order.lotNumber}</p>
            </div>

            <div className="flex gap-2">
              {/* PRINT KNOP (Nieuw) */}
              <button
                onClick={() => setShowLabelModal(true)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                title="Print Labels / Stroken"
              >
                <Printer size={20} />
              </button>

              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Status Selectie */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setStatus("approved")}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  status === "approved"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-100 hover:border-slate-200 text-slate-400"
                }`}
              >
                <CheckCircle size={32} />
                <span className="font-bold uppercase text-xs tracking-wider">
                  Goedgekeurd
                </span>
              </button>

              <button
                onClick={() => setStatus("rejected")}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  status === "rejected"
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-slate-100 hover:border-slate-200 text-slate-400"
                }`}
              >
                <AlertTriangle size={32} />
                <span className="font-bold uppercase text-xs tracking-wider">
                  Afgekeurd
                </span>
              </button>
            </div>

            {/* Opmerkingen */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Opmerkingen (Optioneel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 outline-none min-h-[100px]"
                placeholder="Bijv. kras op flens..."
              />
            </div>

            {/* Actie Knop */}
            <button
              onClick={handleSubmit}
              className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg transition-all ${
                status === "approved"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                  : "bg-red-600 hover:bg-red-700 text-white shadow-red-200"
              }`}
            >
              Bevestigen
            </button>
          </div>
        </div>
      </div>

      {/* NESTED LABEL MODAL */}
      {showLabelModal && (
        <ProductionStartModal
          isOpen={showLabelModal}
          onClose={() => setShowLabelModal(false)}
          order={order}
          // "EINDINSPECTIE" activeert de "Stroken Printen" optie in de modal
          stationId="EINDINSPECTIE"
          onStart={() => setShowLabelModal(false)}
          existingProducts={[]}
        />
      )}
    </>
  );
};

export default InspectionModal;
