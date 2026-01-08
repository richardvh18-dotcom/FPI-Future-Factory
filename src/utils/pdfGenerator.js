import { jsPDF } from "jspdf";
import "jspdf-autotable";

/**
 * Genereert een PDF op basis van de rol van de gebruiker.
 * @param {Object} product - De productdata.
 * @param {String} role - De rol van de ingelogde gebruiker ('qc', 'admin', 'viewer', etc).
 */
export const generateProductPDF = (product, role = "viewer") => {
  const doc = new jsPDF();
  const isQC = role === "qc" || role === "admin";

  // 1. Header instellen
  doc.setFillColor(isQC ? 51 : 15, isQC ? 65 : 23, isQC ? 85 : 42); // QC krijgt een donkerdere slate-kleur
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(isQC ? "QC INSPECTIE RAPPORT" : "TECHNISCHE FICHE", 20, 20);

  doc.setFontSize(10);
  doc.text(`PRODUCT: ${product.name || "Fitting"}`, 20, 30);
  doc.text(`DATUM: ${new Date().toLocaleDateString()}`, 150, 30);

  // 2. Basis Informatie tabel
  const basicInfo = [
    ["Diameter (ID)", `ID ${product.diameter} mm`],
    ["Drukklasse (PN)", `PN ${product.pressure}`],
    ["Type", product.type || "-"],
    ["Verbinding", product.connection || "-"],
  ];

  doc.autoTable({
    startY: 50,
    head: [["Kenmerk", "Waarde"]],
    body: basicInfo,
    theme: "striped",
    headStyles: { fillStyle: isQC ? [71, 85, 105] : [16, 185, 129] },
  });

  // 3. QC SPECIFIEKE DATA (Alleen voor QC of Admin)
  if (isQC) {
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(14);
    doc.text("Kwaliteit & Toleranties", 20, doc.lastAutoTable.finalY + 15);

    const qcData = [
      [
        "Minimale Wanddikte",
        `${(product.wall_thickness * 0.95).toFixed(2)} mm`,
      ],
      ["Maximale Wanddikte", `${(product.wall_thickness * 1.1).toFixed(2)} mm`],
      ["Boring Target", `${product.bore_target || "-"} mm`],
      ["Tolerantie Klasse", "ISO 2768-m"],
      ["Oppervlakte Check", "Visueel - Geen laminatie"],
    ];

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      head: [["Inspectie Punt", "Specificatie"]],
      body: qcData,
      theme: "grid",
      headStyles: { fillStyle: [249, 115, 22] }, // Oranje voor QC actie-punten
    });

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "Dit document is uitsluitend voor intern gebruik door de afdeling Quality Control.",
      20,
      285
    );
  } else {
    // Standaard Operator tekst
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "Raadpleeg de mal-opbouw instructie in de app voor productie.",
      20,
      doc.lastAutoTable.finalY + 20
    );
  }

  // PDF downloaden
  doc.save(`${isQC ? "QC_" : "TECH_"}${product.id}.pdf`);
};
