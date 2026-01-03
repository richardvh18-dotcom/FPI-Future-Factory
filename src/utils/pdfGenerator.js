import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * pdfGenerator.js - Fix voor object mapping en typo.
 */
export const generateProductPDF = (product, mode = "standard") => {
  if (!product || typeof product !== "object") return;
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString("nl-NL");
  const headerColor = [15, 23, 42];
  const isBore =
    mode === "bore" ||
    product.isBoreSpec === true ||
    String(product.type || "")
      .toLowerCase()
      .includes("boor");

  const headerHeight = 32;
  doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.rect(0, 0, 210, headerHeight, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("FUTURE PIPE INDUSTRIES", 15, 12);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(
    isBore
      ? "TECHNICAL DRILLING PATTERN SPECIFICATIONS"
      : "TECHNICAL PRODUCT DATASHEET",
    15,
    17
  );
  doc.text(`Datum: ${timestamp}`, 160, 12);

  const mainTitle = String(
    product.name || product.id || "Technisch Document"
  ).toUpperCase();
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(mainTitle, 15, 26);

  doc.setTextColor(0, 0, 0);
  let currentY = headerHeight + 10;
  let head = [],
    rows = [];

  if (isBore) {
    head = [
      ["ID (mm)", "DU (Buiten)", "Dbc (Steek)", "d (Boorgat)", "N (Gaten)"],
    ];
    const source = product.specs || product;
    const systemKeys = [
      "id",
      "name",
      "type",
      "description",
      "updatedat",
      "isborespec",
      "specs",
      "diameter",
      "pressure",
      "label",
      "productlabel",
    ];

    Object.entries(source).forEach(([key, data]) => {
      if (
        !systemKeys.includes(key.toLowerCase()) &&
        typeof data === "object" &&
        data !== null
      ) {
        rows.push([
          key,
          data.du || "-",
          data.dbc || "-",
          data.d || "-",
          data.n || "-",
        ]);
      }
    });
    rows.sort((a, b) => Number(a[0]) - Number(b[0]));
  } else {
    head = [["PARAMETER", "WAARDE", "TOLERANTIE"]];
    rows.push(["DIAMETER (ID)", `${product.diameter} mm`, "-"]);
    rows.push(["DRUKKLASSE (PN)", `PN ${product.pressure}`, "-"]);
    if (product.angle) rows.push(["HOEK", `${product.angle}°`, "± 1.0°"]);

    Object.entries(product.specs || {}).forEach(([k, s]) => {
      // Check of de spec een object is {value, tol} of een string/getal
      const isObj = s !== null && typeof s === "object";
      const v = isObj ? s.value : s;
      const t = isObj && s.tol ? `± ${s.tol}` : "-"; // Fix: s.tol ipv spec.tol
      rows.push([k.toUpperCase(), v, t]);
    });
  }

  autoTable(doc, {
    startY: currentY,
    head: head,
    body: rows,
    theme: "grid",
    headStyles: {
      fillColor: headerColor,
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      textColor: [0, 0, 0],
      valign: "middle",
    },
    columnStyles: { 0: { fontStyle: "bold" } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 15, right: 15 },
  });

  doc.save(`FPI_${mainTitle.replace(/\s+/g, "_")}.pdf`);
};
