/**
 * productHelpers.js
 * Bevat logica voor productcodes, validatie en data-voorbereiding.
 */

export const generateProductCode = (data) => {
  const { type, mofType, angle, pressure, diameter, drilling, label } = data;
  if (!type || !pressure || !diameter) return "";
  let code = `${type.toUpperCase().substring(0, 3)}`;
  if (angle) code += `-${angle}`;
  if (mofType) {
    const cleanMof = mofType.split("/")[0].trim();
    code += `-${cleanMof}`;
  }
  code += `-PN${pressure}-DN${diameter}`;
  if (drilling) {
    const cleanDrill = drilling.replace(/[^a-zA-Z0-9]/g, "");
    if (cleanDrill) code += `-DR${cleanDrill.substring(0, 4)}`;
  }
  if (label) code += `-${label.substring(0, 1)}`;
  return code;
};

export const validateProductData = (data) => {
  const errors = [];
  if (!data.type) errors.push("Product Type is verplicht.");
  if (!data.pressure) errors.push("Drukklasse (PN) is verplicht.");
  if (!data.diameter) errors.push("Diameter (DN) is verplicht.");
  if (!data.productCode && !data.articleCode)
    errors.push("Er kon geen Product Code gegenereerd worden.");
  if (data.type === "Elbow" && !data.angle) {
    errors.push("Hoek is verplicht voor bochten.");
  }
  return { isValid: errors.length === 0, errors };
};

// SLIMME MATRIX VALIDATIE
export const validateAgainstMatrix = (data, matrix) => {
  if (!matrix)
    return {
      allowed: true,
      warning: "Geen matrix geladen, validatie overgeslagen.",
    };

  const connKey = data.mofType
    ? data.mofType.split("/")[0].toUpperCase().trim()
    : "";
  const pnKey = String(data.pressure);
  const typeKey = data.type;
  const diaVal = Number(data.diameter);

  // Zoek op meerdere plekken (Base, Socket, Spiggot)
  const baseRange = matrix?.[connKey]?.[pnKey]?.[typeKey] || [];
  const socketRange = matrix?.[connKey]?.[pnKey]?.[`${typeKey}_Socket`] || [];
  const spiggotRange = matrix?.[connKey]?.[pnKey]?.[`${typeKey}_Spiggot`] || [];

  const allAvailable = [...baseRange, ...socketRange, ...spiggotRange];

  if (!allAvailable || allAvailable.length === 0) {
    return {
      allowed: false,
      error: `Combinatie bestaat niet in Matrix: ${connKey} + PN${pnKey} + ${typeKey} (of _Socket/_Spiggot varianten)`,
    };
  }

  if (!allAvailable.includes(diaVal)) {
    return {
      allowed: false,
      error: `Diameter ${diaVal} is niet geactiveerd in Matrix voor ${connKey}/PN${pnKey}/${typeKey}`,
    };
  }

  return { allowed: true };
};

export const formatProductForSave = (data) => {
  const idToUse = data.id || data.productCode || data.articleCode;
  return {
    ...data,
    id: idToUse,
    articleCode: idToUse,
    productCode: idToUse,
    name: data.name || `${data.type} DN${data.diameter} PN${data.pressure}`,
    updatedAt: new Date().toISOString(),
    pressure: Number(data.pressure),
    diameter: Number(data.diameter),
    stock: Number(data.stock || 0),
    price: Number(data.price || 0),
    angle: data.angle ? Number(data.angle) : null,
  };
};
