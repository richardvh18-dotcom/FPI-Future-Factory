import React, { useState } from "react";
import {
  Package,
  Search,
  Plus,
  Save,
  AlertCircle,
  Trash2,
  Edit2,
} from "lucide-react";
import { collection, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db, appId } from "../../config/firebase";

// 1. Importeer de mooie View Component
import AdminNewProductView from "./AdminNewProductView";

// 2. Importeer helpers voor het *bewerken* van producten
import {
  validateProductData,
  formatProductForSave,
} from "../../utils/productHelpers";

const AdminProductManager = ({ products = [], onBack }) => {
  // State
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [errors, setErrors] = useState([]);

  // Filter producten
  const filteredProducts = products.filter(
    (p) =>
      (p.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (p.articleCode?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (p.productCode?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  // --- Handlers ---

  const handleSaveEdit = async () => {
    // Validatie bij bewerken
    const validation = validateProductData(editingProduct);

    // Bij bewerken zijn we iets soepeler als productCode al bestaat
    if (!editingProduct.name) {
      setErrors(["Naam is verplicht"]);
      return;
    }

    const productData = formatProductForSave(editingProduct);

    try {
      await updateDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "products",
          editingProduct.id
        ),
        productData
      );
      setEditingProduct(null);
      setErrors([]);
      alert("Wijzigingen opgeslagen.");
    } catch (error) {
      console.error("Fout bij opslaan:", error);
      alert("Er ging iets mis bij het opslaan.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Weet je zeker dat je dit product wilt verwijderen?")) {
      try {
        await deleteDoc(
          doc(db, "artifacts", appId, "public", "data", "products", id)
        );
      } catch (error) {
        console.error("Fout bij verwijderen:", error);
      }
    }
  };

  // --- RENDER LOGICA ---

  // MODE 1: NIEUW PRODUCT AANMAKEN (De uitgebreide Configurator View)
  if (isCreating) {
    return <AdminNewProductView onFinished={() => setIsCreating(false)} />;
  }

  // MODE 2: BEWERKEN (Simpele Inline Editor)
  if (editingProduct) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm max-w-4xl mx-auto mt-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Product Bewerken</h2>
          <button
            onClick={() => {
              setEditingProduct(null);
              setErrors([]);
            }}
            className="text-slate-500 hover:text-slate-700"
          >
            Annuleren
          </button>
        </div>

        {errors.length > 0 && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex gap-2 items-start">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Let op:</p>
              <ul className="list-disc list-inside text-sm">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold mb-1">Naam</label>
            <input
              className="w-full border p-2 rounded"
              value={editingProduct.name || ""}
              onChange={(e) =>
                setEditingProduct({ ...editingProduct, name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">
              Artikelcode / ID
            </label>
            <input
              className="w-full border p-2 rounded bg-slate-50 text-slate-500"
              value={editingProduct.articleCode || editingProduct.id || ""}
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Categorie</label>
            <select
              className="w-full border p-2 rounded"
              value={editingProduct.category || ""}
              onChange={(e) =>
                setEditingProduct({
                  ...editingProduct,
                  category: e.target.value,
                })
              }
            >
              <option>Selecteer...</option>
              <option value="Buis">Buis</option>
              <option value="Fitting">Fitting</option>
              <option value="Gereedschap">Gereedschap</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Prijs (€)</label>
            <input
              type="number"
              className="w-full border p-2 rounded"
              value={editingProduct.price || ""}
              onChange={(e) =>
                setEditingProduct({ ...editingProduct, price: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Voorraad</label>
            <input
              type="number"
              className="w-full border p-2 rounded"
              value={editingProduct.stock || 0}
              onChange={(e) =>
                setEditingProduct({ ...editingProduct, stock: e.target.value })
              }
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSaveEdit}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700"
          >
            <Save size={18} /> Wijzigingen Opslaan
          </button>
        </div>
      </div>
    );
  }

  // MODE 3: LIJST WEERGAVE
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
          <Package className="text-emerald-600" /> Product Beheer
        </h2>
        <div className="flex gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg transition-colors"
            >
              Terug
            </button>
          )}
          <button
            onClick={() => setIsCreating(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-md transition-all"
          >
            <Plus size={18} /> Nieuw Product
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        {/* Zoekbalk */}
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="Zoek op naam, code of ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tabel */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4 w-1/3">Naam</th>
                <th className="p-4">Code / ID</th>
                <th className="p-4">Categorie</th>
                <th className="p-4">Voorraad</th>
                <th className="p-4 text-right">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-slate-50 transition-colors group"
                >
                  <td className="p-4 font-bold text-slate-700">
                    {product.name}
                  </td>
                  <td className="p-4 text-slate-500 font-mono text-xs">
                    {product.articleCode || product.id}
                  </td>
                  <td className="p-4">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-full text-xs font-bold text-slate-600 border border-slate-200">
                      {product.category || "Onbekend"}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-medium">
                    {product.stock || 0}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Bewerken"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-400">
                    <Package size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Geen producten gevonden.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminProductManager;
