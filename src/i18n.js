import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

/**
 * i18n Configuratie: Beheert alle vertalingen voor de site.
 * Locatie: src/i18n.js
 */
const resources = {
  nl: {
    translation: {
      tabs: {
        products: "Catalogus",
        ai: "AI Assistent",
        calculator: "Calculator",
        admin_dashboard: "Beheer",
        admin_logs: "Systeem Logs",
        admin_upload: "Bulk Import",
      },
      buttons: {
        close: "Venster Sluiten",
        logout: "Uitloggen",
        pdf: "Download PDF",
        qc: "QC Certificaat",
        save: "Opslaan",
        delete: "Verwijderen",
        edit: "Bewerken",
        add: "Nieuwe Toevoegen",
      },
      product: {
        details: "Specificaties",
        type: "Product Type",
        no_img: "Geen tekening beschikbaar",
        angle: "Hoek",
        radius: "Radius",
        boring: "Boorpatroon",
        article_code: "Artikelnummer",
        dims: "Fitting Afmetingen",
        bell_dims: "Mof Afmetingen",
        doc_source: "Documentatie & Tekeningen",
      },
      sidebar: {
        filters: "Filter Overzicht",
        diameter: "Diameter (ID)",
        pressure: "Drukklasse (PN)",
        all: "Alle Waarden",
      },
      tools: {
        title: "Gereedschappen Overzicht",
        col_part: "Matrijs / Onderdeel",
        col_loc: "Locatie",
        none_defined: "Geen matrijzen gekoppeld aan dit product.",
      },
    },
  },
  en: {
    translation: {
      tabs: {
        products: "Catalog",
        ai: "AI Assistant",
        calculator: "Calculator",
        admin_dashboard: "Admin Console",
        admin_logs: "System Logs",
        admin_upload: "Bulk Upload",
      },
      buttons: {
        close: "Close Window",
        logout: "Log Out",
        pdf: "Download PDF",
        qc: "QC Certificate",
        save: "Save Changes",
        delete: "Remove",
        edit: "Modify",
        add: "Add New Item",
      },
      product: {
        details: "Technical Specs",
        type: "Type",
        no_img: "No image found",
        boring: "Drilling",
        dims: "Fitting Dimensions",
        bell_dims: "Bell Dimensions",
      },
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "nl",
    interpolation: {
      escapeValue: false, // React doet dit al zelf
    },
  });

export default i18n;
