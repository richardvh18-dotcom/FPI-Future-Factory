/**
 * productHelpers.js
 * Bevat logica voor productcodes, validatie en data-voorbereiding.
 */

/**
 * Genereert automatisch de unieke productcode op basis van specificaties.
 * @param {Object} data - De formData state uit de view.
 * @returns {string} - De gegenereerde code (bv. ELB-90-TB-PN10-DN200)
 */
export const generateProductCode = (data) => {
  const { type, mofType, angle, pressure, diameter, drilling, label } = data;

  if (!type || !pressure || !diameter) return "";

  const isFlange = ["Flange", "Blind Flange", "Stub Flange"].includes(type);

  let code = `${type.toUpperCase().substring(0, 3)}`;

  if (angle) code += `-${angle}`;
  if (mofType) code += `-${mofType}`;

  code += `-PN${pressure}-DN${diameter}`;

  if (isFlange && drilling) code += `-DR${drilling}`; // drilling bevat vaak spaties, misschien opschonen?

  if (label) code += `-${label.substring(0, 1)}`;

  return code;
};

/**
 * Valideert of het formulier compleet is voor opslag.
 * @param {Object} data - De formData state.
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateProductData = (data) => {
  const errors = [];

  if (!data.type) errors.push("Product Type is verplicht.");
  if (!data.pressure) errors.push("Drukklasse (PN) is verplicht.");
  if (!data.diameter) errors.push("Diameter (DN) is verplicht.");

  if (!data.productCode)
    errors.push("Er kon geen Product Code gegenereerd worden.");

  // Specifieke checks
  if (data.type === "Elbow" || data.type === "Tee") {
    if (!data.mofType) errors.push("Kies een Mof Type voor dit product.");
  }

  if (data.type === "Elbow" && !data.angle) {
    errors.push("Hoek is verplicht voor bochten.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Bereidt het object voor om naar Firestore te sturen.
 * Voegt timestamps en ID toe.
 */
export const formatProductForSave = (data) => {
  return {
    ...data,
    id: data.productCode, // ID is gelijk aan de code
    updatedAt: new Date(),
    // Zorg dat nummers ook echt nummers zijn
    pressure: Number(data.pressure),
    diameter: Number(data.diameter),
    angle: data.angle ? Number(data.angle) : null,
  };
};
