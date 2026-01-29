import React from "react";
import { VERIFICATION_STATUS } from "../../data/constants";

const VerificationBadge = ({ status, verifiedBy }) => {
  const styles = {
    [VERIFICATION_STATUS.CONCEPT]: "bg-gray-100 text-gray-800 border-gray-200",
    [VERIFICATION_STATUS.PENDING]:
      "bg-orange-100 text-orange-800 border-orange-200",
    [VERIFICATION_STATUS.VERIFIED]:
      "bg-green-100 text-green-800 border-green-200",
    [VERIFICATION_STATUS.REJECTED]: "bg-red-100 text-red-800 border-red-200",
  };

  const labels = {
    [VERIFICATION_STATUS.CONCEPT]: "Concept",
    [VERIFICATION_STATUS.PENDING]: "Te Verifiëren",
    [VERIFICATION_STATUS.VERIFIED]: "Geverifieerd",
    [VERIFICATION_STATUS.REJECTED]: "Afgekeurd",
  };

  // Fallback als status onbekend is
  const currentStatus = status || VERIFICATION_STATUS.VERIFIED;

  return (
    <div className="flex flex-col items-start">
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium border ${
          styles[currentStatus] || styles[VERIFICATION_STATUS.CONCEPT]
        }`}
      >
        {labels[currentStatus] || "Onbekend"}
      </span>

      {currentStatus === VERIFICATION_STATUS.VERIFIED && verifiedBy && (
        <span className="text-[10px] text-gray-500 mt-1">
          ✓ {verifiedBy.name}
        </span>
      )}

      {currentStatus === VERIFICATION_STATUS.PENDING && (
        <span className="text-[10px] text-orange-500 mt-1 font-bold">
          ⚠ Actie vereist
        </span>
      )}
    </div>
  );
};

export default VerificationBadge;
