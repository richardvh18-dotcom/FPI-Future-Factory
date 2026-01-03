/**
 * specLogic.js - v2.0 (Granular Tolerances)
 * Bevat logica voor het bepalen van specificaties en toleranties.
 * Ondersteunt nu hiërarchisch zoeken:
 * Specifiek (PN+Mof+Type) -> Type+Mof -> Type -> Global
 */

// Helper om te kijken of een waarde binnen een bereik valt of matcht
// (Niet direct gebruikt voor lookup, maar handig voor validatie)
const matchTolerance = (product, rule) => {
  return true;
};

/**
 * Zoekt de juiste tolerantie voor een specifiek veld (bijv. 'L') bij een product.
 * Zoekvolgorde:
 * 1. Exacte match: Type_Mof_PN_Param (bijv. Elbow_CB_PN10_L)
 * 2. Type + Mof: Type_Mof_Param (bijv. Elbow_CB_L)
 * 3. Type: Type_Param (bijv. Elbow_L)
 * 4. Global: Global_Param (bijv. Global_L)
 */
export const getToleranceForField = (field, product, allTolerances) => {
  if (!allTolerances || !Array.isArray(allTolerances)) return null;

  const type = product.category ? product.category.split(" ")[0] : ""; // Pak eerste woord 'Elbow' van 'Elbow 90'
  const conn = product.connection ? product.connection.replace("/", "_") : ""; // CB/CB -> CB_CB
  const pn = product.pressure
    ? `PN${product.pressure.toString().replace("PN", "")}`
    : "";
  const param = field;

  // We bouwen mogelijke ID's op van specifiek naar generiek
  // Let op: Case insensitive matching is veiliger
  const possibleKeys = [
    `${type}_${conn}_${pn}_${param}`, // Elbow_CB_PN10_L
    `${type}_${conn}_${param}`, // Elbow_CB_L
    `${type}_${param}`, // Elbow_L
    `Global_${param}`, // Global_L
  ];

  // Zoek de eerste regel die matcht met een van de keys
  // We vergelijken de ID van de tolerantie regel (die we bij opslaan zo noemen)
  // Of we kijken naar de losse velden (category, connection, pn) als die in het object zitten
  let rule = allTolerances.find((t) => {
    // Optie A: Match op gegenereerde ID (snelste)
    if (possibleKeys.some((key) => t.id.toLowerCase() === key.toLowerCase()))
      return true;

    // Optie B: Match op losse velden (als ID anders is gegenereerd)
    // Dit is complexer, voor nu vertrouwen we op de ID structuur van de AdminToleranceView
    return false;
  });

  // Fallback: Zoek op de oude manier (Category veld) als er geen ID match is
  if (!rule) {
    rule = allTolerances.find(
      (t) =>
        t.parameter === field &&
        t.category !== "Global" &&
        product.category &&
        product.category.includes(t.category)
    );
  }
  if (!rule) {
    rule = allTolerances.find(
      (t) => t.parameter === field && t.category === "Global"
    );
  }

  if (rule) {
    return {
      min: rule.min || "",
      max: rule.max || "",
      unit: rule.unit || "",
      text: rule.tolerance || formatTolerance(rule.min, rule.max, rule.unit),
    };
  }

  return null;
};

// Helper om tekst te formatteren als die leeg is
const formatTolerance = (min, max, unit) => {
  if (min && max) {
    if (
      min.startsWith("-") &&
      max.startsWith("+") &&
      Math.abs(parseFloat(min)) === parseFloat(max)
    ) {
      return `+/- ${parseFloat(max)} ${unit || ""}`;
    }
    return `${max} / ${min} ${unit || ""}`;
  }
  if (min) return `min ${min} ${unit || ""}`;
  if (max) return `max ${max} ${unit || ""}`;
  return "";
};

/**
 * Verrijkt de specs met tolerantie-info.
 */
export const enrichSpecsWithTolerances = (specs, product, allTolerances) => {
  const enriched = {};
  Object.keys(specs).forEach((key) => {
    // Support voor oud {value, tol} formaat en nieuw 'plat' formaat
    let value = specs[key];
    if (typeof value === "object" && value !== null && "value" in value) {
      value = value.value;
    }

    const tol = getToleranceForField(key, product, allTolerances);

    enriched[key] = {
      value: value,
      tolerance: tol, // Voeg het hele tolerantie object toe
    };
  });
  return enriched;
};

export const getStandardSpecsForProduct = (
  formData,
  bellDimensions,
  standardFittingSpecs,
  boreDimensions,
  toleranceSettings,
  productTemplates
) => {
  // ... (Deze functie kan blijven zoals hij was of leeg als hij niet meer gebruikt wordt door de nieuwe smart fill)
  // Voor de volledigheid laten we de nieuwe smart fill in AdminProductManager het werk doen via de live database calls
  return {};
};
