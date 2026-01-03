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

  // Probeer afkorting te maken van type (eerste 3 letters)
  // Bijv: Elbow -> ELB, Tee -> TEE
  let code = `${type.toUpperCase().substring(0, 3)}`;

  if (angle) code += `-${angle}`;

  // --- NIEUW: Normaliseer Mof Type ---
  // Als mofType "TB/TB" is, maken we er "TB" van in de code.
  // Als mofType "CB/CB" is, maken we er "CB" van.
  // We pakken alles voor de eerste slash '/'.
  if (mofType) {
    const cleanMof = mofType.split("/")[0].trim();
    code += `-${cleanMof}`;
  }

  code += `-PN${pressure}-DN${diameter}`;

  // Voeg drilling toe voor flenzen
  if (drilling) {
    // Simpele check of het een flens is of dat er drilling is ingevuld
    const cleanDrill = drilling.replace(/[^a-zA-Z0-9]/g, ""); // Verwijder vreemde tekens
    if (cleanDrill) code += `-DR${cleanDrill.substring(0, 4)}`;
  }

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

  // Als we in 'edit' mode zitten (data heeft id) is productCode minder kritiek om te genereren,
  // maar bij 'create' wel. We checken of er een code is.
  if (!data.productCode && !data.articleCode)
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
 * Voegt timestamps en ID toe en zorgt voor juiste types.
 */
export const formatProductForSave = (data) => {
  // Bepaal ID: of het bestaande ID, of de gegenereerde code, of de articleCode
  const idToUse = data.id || data.productCode || data.articleCode;

  return {
    ...data,
    id: idToUse,
    articleCode: idToUse, // Zorg dat articleCode altijd gevuld is
    productCode: idToUse, // Sync productCode
    name: data.name || `${data.type} DN${data.diameter} PN${data.pressure}`, // Fallback naam
    updatedAt: new Date().toISOString(),
    // Zorg dat nummers ook echt nummers zijn
    pressure: Number(data.pressure),
    diameter: Number(data.diameter),
    stock: Number(data.stock || 0),
    price: Number(data.price || 0),
    angle: data.angle ? Number(data.angle) : null,
  };
};
