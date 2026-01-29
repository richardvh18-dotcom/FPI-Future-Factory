import {
  DEFAULT_SPECS_BY_TYPE,
  GLOBAL_TOLERANCES_DEFAULT,
} from "../data/constants";

/**
 * Geeft een lijst van technische specificatie-sleutels terug voor een bepaald producttype.
 * Bijv. voor "Elbow" krijg je ['TW', 'L', 'Angle', ...]
 */
export const getSpecKeysForType = (type) => {
  if (!type) return [];

  // Zoek in de constante lijst
  const specs = DEFAULT_SPECS_BY_TYPE[type];

  // Als het type gevonden is, geef de array terug
  if (specs && Array.isArray(specs)) {
    return specs;
  }

  // Fallback voor onbekende types
  return ["L", "Weight", "Note"];
};

/**
 * Haalt de standaard tolerantie op voor een specifiek veld
 */
export const getToleranceForField = (fieldKey) => {
  return GLOBAL_TOLERANCES_DEFAULT[fieldKey] || "";
};

/**
 * (Optioneel) Helper om specs object te vullen met default lege waarden
 */
export const getStandardSpecsForProduct = (type) => {
  const keys = getSpecKeysForType(type);
  const specs = {};
  keys.forEach((key) => {
    specs[key] = "";
  });
  return specs;
};
