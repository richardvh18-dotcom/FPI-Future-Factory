import React, { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { getAppId } from "../../../utils/hubHelpers";

const AssignOrderModal = ({ orphans, onClose }) => {
  const [targetOrderId, setTargetOrderId] = useState("");
  const [selectedOrphans, setSelectedOrphans] = useState({});

  const toggleSelect = (id) => {
    setSelectedOrphans((p) => ({ ...p, [id]: !p[id] }));
  };

  const handleAssign = async () => {
    if (!targetOrderId) return alert("Vul een ordernummer in.");

    const idsToUpdate = Object.keys(selectedOrphans).filter(
      (id) => selectedOrphans[id]
    );
    if (idsToUpdate.length === 0)
      return alert("Selecteer minstens één product.");

    try {
      const appId = getAppId();
      const promises = idsToUpdate.map((id) => {
        const docRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "tracked_products",
          id
        );
        return updateDoc(docRef, {
          orderId: targetOrderId,
          isOverproduction: false,
          note: `Handmatig toegewezen aan ${targetOrderId}`,
        });
      });
      await Promise.all(promises);
      alert("Producten succesvol gekoppeld aan " + targetOrderId);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Fout bij koppelen.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl border border-gray-100 flex flex-col overflow-hidden max-h-[80vh]">
        <div className="p-6 border-b flex justify-between items-center bg-red-50">
          <div>
            <h3 className="text-xl font-black text-red-600 uppercase italic">
              Onbekende Orders
            </h3>
            <p className="text-xs text-gray-500">
              Selecteer producten en koppel ze aan een ordernummer
            </p>
          </div>
          <button onClick={onClose}>
            <X size={24} className="text-red-400" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="mb-6 sticky top-0 bg-white z-10 pb-4 border-b border-gray-100">
            <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">
              Nieuw / Bestaand Ordernummer
            </label>
            <input
              className="w-full p-3 border-2 border-blue-100 rounded-xl font-bold text-gray-800 focus:border-blue-500 outline-none"
              placeholder="Bijv. ORD-2026-X"
              value={targetOrderId}
              onChange={(e) => setTargetOrderId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            {orphans.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                className={`p-3 border rounded-xl flex justify-between items-center cursor-pointer transition-all ${
                  selectedOrphans[item.id]
                    ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500"
                    : "bg-white border-gray-200 hover:border-blue-300"
                }`}
              >
                <div>
                  <p className="font-black text-sm text-gray-800">
                    {item.lotNumber}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">
                    {item.item}
                  </p>
                  <div className="flex gap-2 mt-1">
                    {item.isOverproduction && (
                      <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">
                        Overproductie
                      </span>
                    )}
                    <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      Machine: {item.originMachine}
                    </span>
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedOrphans[item.id]
                      ? "border-blue-600 bg-blue-600"
                      : "border-gray-300"
                  }`}
                >
                  {selectedOrphans[item.id] && (
                    <CheckCircle2 size={14} className="text-white" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t flex justify-end bg-gray-50">
          <button
            onClick={handleAssign}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-wider shadow-lg transition-all active:scale-95"
          >
            Koppel Selectie
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignOrderModal;
