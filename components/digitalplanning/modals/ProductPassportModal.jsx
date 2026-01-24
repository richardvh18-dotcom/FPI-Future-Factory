import React from "react";
import { X } from "lucide-react";

const ProductPassportModal = ({ item, type, onClose, onLinkProduct }) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl relative">
        <button onClick={onClose} className="absolute top-2 right-2">
          <X />
        </button>
        <h2 className="text-xl font-bold mb-4">Details</h2>
        <p className="mb-2">Item: {item.item}</p>
        <p className="mb-2">Order: {item.orderId}</p>
        <p className="text-xs text-gray-500 mt-4">
          Meer functionaliteit volgt...
        </p>
      </div>
    </div>
  );
};

export default ProductPassportModal;
