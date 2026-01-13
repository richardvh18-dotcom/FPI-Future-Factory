import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * imageToDataUri: Zet een URL om naar Base64 via een directe fetch.
 * Dit is robuuster tegen CORS-beperkingen dan de canvas-methode.
 */
const imageToDataUri = async (url) => {
  if (!url) return null;

  try {
    // Gebruik een cachebuster om browser-caching van oude CORS-instellingen te voorkomen
    const cleanUrl = url.includes("?")
      ? `${url}&cb=${Date.now()}`
      : `${url}?cb=${Date.now()}`;

    const response = await fetch(cleanUrl, { mode: "cors" });
    if (!response.ok) throw new Error("Netwerk response was niet ok");

    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(
      "PDF Generator Error: Afbeelding kon niet worden gedownload.",
      error
    );
    return null;
  }
};

/**
 * generateProductPDF V6.4: Visual Technical Dossier (Stable Image Fetch)
 * @param {Object} product - Productdata met imageUrl en technische specificaties.
 * @param {String} role - De rol van de gebruiker (QC krijgt een andere kleur).
 */
export const generateProductPDF = async (product, role = "operator") => {
  // Toon een kleine indicatie in de console dat we bezig zijn
  console.log("PDF genereren voor:", product.name);

  const doc = new jsPDF();
  const isQC = role === "qc" || role === "admin";
  const headerColor = isQC ? [51, 65, 85] : [16, 185, 129];

  // --- 1. TITEL OPBOUW ---
  const typePart =
    product.type?.replace("_Socket", "").replace("_SOCKET", "") || "";
  const anglePart =
    product.angle && product.angle !== "-" ? `${product.angle}°` : "";
  const radiusPart =
    product.radius && product.radius !== "-" ? product.radius : "";
  const connPart = product.connection || "";
  const idPart = product.diameter ? `ID${product.diameter}` : "";
  const pnPart = product.pressure ? `PN${product.pressure}` : "";

  const fullTitle =
    `${typePart} ${anglePart} ${radiusPart} ${connPart} ${idPart} ${pnPart}`
      .replace(/\s+/g, " ")
      .trim();

  // --- 2. HEADER ONTWERP ---
  doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.rect(0, 0, 210, 45, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(fullTitle, 20, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`LABEL: ${product.label || "Standaard"}`, 20, 30);
  if (product.extraCode && product.extraCode !== "-") {
    doc.text(`EXTRA CODE: ${product.extraCode}`, 20, 36);
  }
  doc.text(`DATUM: ${new Date().toLocaleDateString("nl-NL")}`, 150, 30);
  doc.text(`ART.NR: ${product.articleCode || product.id || "-"}`, 150, 36);

  let currentY = 55;

  // --- 3. AFBEELDING SECTIE ---
  if (product.imageUrl) {
    const imgData = await imageToDataUri(product.imageUrl);
    if (imgData) {
      // Afbeelding centreren (breedte ca 90mm, hoogte ca 60mm)
      const imgWidth = 90;
      const imgHeight = 60;
      const xPos = (210 - imgWidth) / 2;

      // jsPDF probeert zelf het formaat te herkennen aan de base64 header
      doc.addImage(
        imgData,
        "PNG",
        xPos,
        currentY,
        imgWidth,
        imgHeight,
        undefined,
        "FAST"
      );
      currentY += imgHeight + 15;
    } else {
      console.warn("Afbeelding overgeslagen wegens laadfout.");
      currentY += 10;
    }
  } else {
    currentY += 10;
  }

  // --- 4. TECHNISCHE MAATVOERING TABEL ---
  doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Technische Maatvoering", 20, currentY);

  const FITTING_FIELDS = ["TW", "L", "Lo", "R", "Weight"];
  const MOF_FIELDS = ["B1", "B2", "BA", "A", "TWcb", "BD", "W"];

  const tableData = [];
  [...FITTING_FIELDS, ...MOF_FIELDS].forEach((key) => {
    let val = product[key];
    if (val === undefined || val === "") {
      if (key === "A") val = product["A1"] || product["a1"];
    }

    if (val !== undefined && val !== null && val !== "") {
      let unit = "mm";
      if (key.toLowerCase().includes("weight")) unit = "kg";
      tableData.push([key, `${val} ${unit}`, ""]);
    }
  });

  autoTable(doc, {
    startY: currentY + 5,
    head: [["Variabele", "Nominale Waarde", "Tolerantie"]],
    body: tableData,
    theme: "grid",
    headStyles: { fill: headerColor, fontStyle: "bold" },
    styles: { font: "helvetica", fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: "bold", width: 40 },
      1: { width: 60 },
      2: { italic: true, textColor: [150, 150, 150] },
    },
  });

  // --- 5. VOETNOOT ---
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const footerNote = isQC
    ? "GEVALIDEERD QC DOCUMENT - Uitsluitend voor interne kwaliteitsborging."
    : "TECHNISCHE FICHE - Raadpleeg de tekening in de database voor specifieke toleranties.";
  doc.text(footerNote, 20, 285);

  // Opslaan
  const docName = `Productfiche_${
    product.articleCode || product.id || "Download"
  }.pdf`;
  doc.save(docName);
};
