import React from "react";
import { Zap, Droplets } from "lucide-react";

export const REJECTION_REASONS = [
  "Maatvoering onjuist",
  "Beschadiging",
  "Luchtbellen / Blaasjes",
  "Kleurafwijking",
  "Vervuiling",
  "Bewerking niet correct",
  "Anders, zie opmerking",
];

// Stations configuratie
export const WORKSTATIONS = [
  { id: "BM01", name: "Station BM01", type: "inspection" },
  { id: "BH11", name: "BH11", type: "winding" },
  { id: "BH12", name: "BH12", type: "winding" },
  { id: "BH15", name: "BH15", type: "winding" },
  { id: "BH16", name: "BH16", type: "winding" },
  { id: "BH17", name: "BH17", type: "winding" },
  { id: "BH18", name: "BH18", type: "winding" },
  { id: "BH31", name: "BH31", type: "winding" },
  { id: "Mazak", name: "Mazak", type: "machining" },
  { id: "Nabewerking", name: "Nabewerking", type: "finishing" },
  { id: "BH05", name: "BH05", type: "pipe" },
  { id: "BH07", name: "BH07", type: "pipe" },
  { id: "BH08", name: "BH08", type: "pipe" },
  { id: "BH09", name: "BH09", type: "pipe" },
];

export const getISOWeekInfo = (date) => {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  const year = d.getUTCFullYear();
  return { week: weekNo, year: year };
};

export const getMaterialInfo = (itemString) => {
  const upperItem = (itemString || "").toUpperCase();

  if (upperItem.includes("CST")) {
    return {
      type: "CST",
      label: "CST - Conductive",
      shortLabel: "CST",
      colorClasses: "bg-orange-100 text-orange-800 border-orange-200",
      warning: "⚠ LET OP: Conductive! Vergeet Carbon niet.",
      icon: <Zap size={14} className="text-orange-600" />,
    };
  }

  if (upperItem.includes("EWT")) {
    return {
      type: "EWT",
      label: "EWT - Water",
      shortLabel: "EWT",
      colorClasses: "bg-cyan-100 text-cyan-800 border-cyan-200",
      warning: "⚠ LET OP: EWT! Controleer moffen.",
      icon: <Droplets size={14} className="text-cyan-600" />,
    };
  }

  return {
    type: "EST",
    label: "EST - Standaard",
    shortLabel: "EST",
    colorClasses: "bg-slate-100 text-slate-600 border-slate-200",
    warning: null,
    icon: null,
  };
};

export const isInspectionOverdue = (timestamp) => {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 7;
};
