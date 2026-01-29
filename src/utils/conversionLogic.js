import { db } from "../config/firebase";
import {
  doc,
  getDoc,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  startAfter,
  setDoc,
} from "firebase/firestore";
import * as XLSX from "xlsx";

// --- HELPERS ---

const normalizeType = (rawType, rawDesc = "") => {
  if (!rawType) return "-";

  const lowerType = String(rawType).toLowerCase().trim();
  const lowerDesc = String(rawDesc).toLowerCase().trim();

  if (lowerType === "cost") return "Coupler";
  if (lowerType === "adst") return "Adaptor";
  if (lowerType === "pist") return "Pipe";

  if (
    lowerType.includes("elbow") ||
    lowerType.includes("elb") ||
    lowerDesc.includes("elbow")
  )
    return "Elbow";
  if (lowerType.includes("coupler") || lowerDesc.includes("coupler"))
    return "Coupler";
  if (lowerType.includes("adaptor") || lowerDesc.includes("adaptor"))
    return "Adaptor";

  if (
    lowerType.includes("tee") ||
    lowerType.includes("t-piece") ||
    lowerDesc.includes("tee")
  )
    return "T-Equal";

  if (lowerType.includes("flange") || lowerDesc.includes("flange")) {
    if (lowerDesc.includes("blind")) return "Blind Flange";
    if (lowerDesc.includes("stub")) return "Stub Flange";
    return "Standard Flange";
  }

  return rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
};

const prepareDataForSave = (data) => {
  const cleanDn = parseInt(data.dn) || 0;
  const cleanPn = parseFloat(data.pn) || 0;

  return {
    manufacturedId: String(data.manufacturedId).trim(),
    targetProductId: String(data.targetProductId).trim(),
    type: String(data.type),
    serie: String(data.serie),
    dn: cleanDn,
    pn: cleanPn,
    ends: String(data.ends || "-"),
    description: String(data.description || ""),
    sheet: String(data.sheet || "-"),
    drilling: String(data.drilling || "-"),
    rev: String(data.rev || "-"),

    searchTerms: [
      String(data.type).toUpperCase(),
      `DN${cleanDn}`,
      `PN${cleanPn}`,
      String(data.manufacturedId).toUpperCase(),
      String(data.targetProductId).toUpperCase(),
    ],
    updatedAt: new Date().toISOString(),
  };
};

// --- EXPORT FUNCTIES ---

export const parseExcel = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        let allRows = [];
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const sheetData = XLSX.utils.sheet_to_json(worksheet, {
            defval: "",
            raw: false,
          });
          allRows = [...allRows, ...sheetData];
        });
        resolve(allRows);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const parseCSV = (text) => {
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  const firstLine = lines[0];
  const separator = firstLine.includes(";") ? ";" : ",";
  const headers = lines[0]
    .split(separator)
    .map((h) => h.trim().replace(/^"|"$/g, ""));

  return lines.slice(1).map((line) => {
    const data = {};
    let currentVal = "";
    let insideQuote = false;
    let headerIndex = 0;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === separator && !insideQuote) {
        if (headers[headerIndex])
          data[headers[headerIndex]] = currentVal.trim().replace(/^"|"$/g, "");
        headerIndex++;
        currentVal = "";
      } else {
        currentVal += char;
      }
    }
    if (headers[headerIndex])
      data[headers[headerIndex]] = currentVal.trim().replace(/^"|"$/g, "");
    return data;
  });
};

export const uploadConversionBatch = async (items, appId, onProgress) => {
  const batchSize = 400;
  const total = items.length;
  let processed = 0;

  for (let i = 0; i < total; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const batch = writeBatch(db);

    chunk.forEach((item) => {
      const oldCode = item["Old Item Code"] || item["Item Code"];
      const newCode = item["New Item Code"];

      const rawDn = String(item["DN [mm]"] || item["DN"] || "-");
      const rawPn = String(item["PN [bar]"] || item["PN"] || "-");
      const cleanDn = rawDn.replace(",", ".").split(".")[0];
      const cleanPn = rawPn.replace(",", ".");

      if (oldCode && newCode) {
        const cleanOldCode = String(oldCode).trim();
        const docRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "product_conversions",
          cleanOldCode
        );

        const rawDesc = item["Type Description"] || "";
        const normalizedType = normalizeType(item["Type"], rawDesc);

        batch.set(docRef, {
          manufacturedId: cleanOldCode,
          targetProductId: newCode,
          type: normalizedType,
          originalType: item["Type"],
          description: rawDesc,
          serie: item["Serie"] || "-",
          dn: parseInt(cleanDn) || 0,
          pn: parseFloat(cleanPn) || 0,
          ends: item["Ends"] || item["End1"] || "-",
          sheet: item["Sheet"] || "-",
          drilling: item["Drilling"] || "-",
          rev: item["Rev"] || "-",
          searchTerms: [
            normalizedType.toUpperCase(),
            `DN${cleanDn}`,
            `PN${cleanPn}`,
            cleanOldCode.toUpperCase(),
            String(newCode).toUpperCase(),
          ],
          updatedAt: new Date().toISOString(),
        });
      }
    });

    await batch.commit();
    processed += chunk.length;
    if (onProgress) onProgress(Math.round((processed / total) * 100));
  }
};

export const uploadNewItemsOnly = async (items, appId, onProgress) => {
  const conversionsRef = collection(
    db,
    "artifacts",
    appId,
    "public",
    "data",
    "product_conversions"
  );
  const snapshot = await getDocs(conversionsRef);
  const existingIds = new Set(snapshot.docs.map((doc) => doc.id));

  const newItems = items.filter((item) => {
    const oldCode = item["Old Item Code"] || item["Item Code"];
    const cleanOldCode = oldCode ? String(oldCode).trim() : null;
    return cleanOldCode && !existingIds.has(cleanOldCode);
  });

  if (newItems.length > 0) {
    await uploadConversionBatch(newItems, appId, onProgress);
  }

  return {
    added: newItems.length,
    skipped: items.length - newItems.length,
  };
};

export const normalizeToEstCode = (productCode) => {
  if (!productCode || typeof productCode !== "string") return productCode;
  if (productCode.length > 8) {
    const prefix = productCode.substring(0, 6);
    const series = productCode.substring(6, 8);
    const suffix = productCode.substring(8);
    const variantsToNormalize = ["CS", "EW", "WS", "FR"];
    if (variantsToNormalize.includes(series)) {
      return `${prefix}ES${suffix}`;
    }
  }
  return productCode;
};

export const lookupProductByManufacturedId = async (appId, inputCode) => {
  if (!inputCode) return null;
  const cleanCode = inputCode.trim();

  try {
    const collectionRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "product_conversions"
    );
    const docRef = doc(collectionRef, cleanCode);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      const originalTarget = data.targetProductId;
      const drawingTarget = normalizeToEstCode(originalTarget);

      return {
        ...data,
        matchType: "old_code",
        originalProductId: originalTarget,
        drawingProductId: drawingTarget,
        isFallback: originalTarget !== drawingTarget,
      };
    }

    const q = query(collectionRef, where("targetProductId", "==", cleanCode));
    const querySnap = await getDocs(q);

    if (!querySnap.empty) {
      const data = querySnap.docs[0].data();
      const drawingTarget = normalizeToEstCode(cleanCode);
      return {
        ...data,
        matchType: "new_code",
        originalProductId: cleanCode,
        drawingProductId: drawingTarget,
        isFallback: cleanCode !== drawingTarget,
      };
    }

    const drawingTarget = normalizeToEstCode(cleanCode);
    return {
      manufacturedId: cleanCode,
      targetProductId: cleanCode,
      drawingProductId: drawingTarget,
      type: "Unknown",
      matchType: "direct_passthrough",
      isFallback: cleanCode !== drawingTarget,
    };
  } catch (error) {
    console.error("Fout bij lookup conversie:", error);
    return null;
  }
};

// FIX: Veilige Query
export const findConversionCandidate = async (appId, criteria) => {
  try {
    const { type, dn, pn, label } = criteria;

    // VEILIGHEIDSCHECK: Stop direct als waarden ontbreken of onlogisch zijn
    // Dit voorkomt de "Unsupported field value: undefined" fout
    if (
      !type ||
      type === "-" ||
      dn === undefined ||
      dn === "-" ||
      isNaN(parseInt(dn))
    ) {
      return null;
    }

    let targetSerie = "";
    if (label) {
      if (label.includes("Standard") && label.includes("Wavistrong"))
        targetSerie = "EST";
      else if (label.includes("Conductive") || label.includes("Black"))
        targetSerie = "CST";
      else if (label.includes("Water") || label.includes("Potable"))
        targetSerie = "EWT";
      else if (label.includes("Fibermar")) targetSerie = "EMT";
    }

    const conversionsRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "product_conversions"
    );

    const q = query(
      conversionsRef,
      where("type", "==", type),
      where("dn", "==", parseInt(dn))
    );

    const snapshot = await getDocs(q);
    const candidates = snapshot.docs.map((d) => d.data());

    const matches = candidates.filter((c) => c.pn === parseFloat(pn));

    if (matches.length === 0) return null;

    if (targetSerie) {
      return matches.find((c) => c.serie === targetSerie) || matches[0];
    }

    const estMatch = matches.find((c) => c.serie === "EST");
    if (estMatch) return estMatch;

    return matches[0];
  } catch (error) {
    console.error("Fout bij zoeken conversie:", error);
    return null;
  }
};

export const fetchConversions = async (
  appId,
  lastDoc = null,
  pageSize = 50,
  searchTerm = ""
) => {
  try {
    const conversionsRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "product_conversions"
    );

    if (searchTerm) {
      const term = searchTerm.trim().toUpperCase();
      const q1 = query(
        conversionsRef,
        where("manufacturedId", ">=", term),
        where("manufacturedId", "<=", term + "\uf8ff"),
        limit(pageSize)
      );
      const q2 = query(
        conversionsRef,
        where("targetProductId", ">=", term),
        where("targetProductId", "<=", term + "\uf8ff"),
        limit(pageSize)
      );

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const resultsMap = new Map();

      snap1.docs.forEach((doc) =>
        resultsMap.set(doc.id, { id: doc.id, ...doc.data() })
      );
      snap2.docs.forEach((doc) =>
        resultsMap.set(doc.id, { id: doc.id, ...doc.data() })
      );

      const combinedData = Array.from(resultsMap.values());
      return { data: combinedData, lastDoc: null };
    } else {
      let q;
      if (lastDoc) {
        q = query(
          conversionsRef,
          orderBy("manufacturedId"),
          startAfter(lastDoc),
          limit(pageSize)
        );
      } else {
        q = query(conversionsRef, orderBy("manufacturedId"), limit(pageSize));
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return { data, lastDoc: snapshot.docs[snapshot.docs.length - 1] };
    }
  } catch (error) {
    console.error("Fout bij ophalen conversies:", error);
    return { data: [], lastDoc: null };
  }
};

export const createConversion = async (appId, data) => {
  const docRef = doc(
    db,
    "artifacts",
    appId,
    "public",
    "data",
    "product_conversions",
    data.manufacturedId.trim()
  );
  const saveData = prepareDataForSave(data);
  await setDoc(docRef, saveData);
};

export const updateConversion = async (appId, id, data) => {
  const docRef = doc(
    db,
    "artifacts",
    appId,
    "public",
    "data",
    "product_conversions",
    id
  );
  const saveData = prepareDataForSave(data);
  await updateDoc(docRef, saveData);
};

export const deleteConversion = async (appId, id) => {
  const docRef = doc(
    db,
    "artifacts",
    appId,
    "public",
    "data",
    "product_conversions",
    id
  );
  await deleteDoc(docRef);
};
