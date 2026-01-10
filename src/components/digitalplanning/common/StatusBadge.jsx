import React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";

const StatusBadge = ({ statusLabel, showIcon = true }) => {
  if (!statusLabel) return null;
  const styles =
    statusLabel === "Goed"
      ? "bg-emerald-100 text-emerald-600 border-emerald-200"
      : statusLabel === "Tijdelijke afkeur"
      ? "bg-orange-100 text-orange-600 border-orange-200"
      : statusLabel === "Definitieve afkeur"
      ? "bg-red-100 text-red-600 border-red-200"
      : "bg-slate-100 text-slate-400 border-slate-200";
  return (
    <div
      className={`px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 border ${styles}`}
    >
      {showIcon &&
        (statusLabel === "Goed" ? (
          <CheckCircle2 size={12} />
        ) : (
          <AlertTriangle size={12} />
        ))}
      {statusLabel}
    </div>
  );
};

export default StatusBadge;
