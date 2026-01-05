import React, { useState, useEffect } from "react";
import {
  Package,
  Search,
  Plus,
  Save,
  AlertCircle,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Folder,
} from "lucide-react";
import { updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db, appId } from "../../config/firebase";
import { useTranslation } from "react-i18next";

import AdminNewProductView from "./AdminNewProductView";
import {
  validateProductData,
  formatProductForSave,
} from "../../utils/productHelpers";

const AdminProductManager = ({ products = [], onBack }) => {
  const { t } = useTranslation();

  const [editingProduct, setEditingProduct] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [errors, setErrors] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});

  const filteredProducts = products.filter(
    (p) =>
      (p.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (p.articleCode?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (p.productCode?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const category = product.type || "Overig"; // Groepeer op Type (Elbow, Tee)
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {});

  useEffect(() => {
    const initialPdf = {};
    Object.keys(groupedProducts).forEach((cat) => {
      initialPdf[cat] = true;
    });
    setExpandedCategories(initialPdf);
  }, [products.length, searchTerm]);

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const handleSaveEdit = async () => {
    const validation = validateProductData(editingProduct);
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

  if (isCreating) {
    return <AdminNewProductView onFinished={() => setIsCreating(false)} />;
  }

  if (editingProduct) {
    return (
      <div className="flex justify-center p-8 bg-slate-50 min-h-screen">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-4xl w-full border border-slate-200 h-fit">
          <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Edit2 size={24} className="text-blue-500" /> Product Bewerken
            </h2>
            <button
              onClick={() => {
                setEditingProduct(null);
                setErrors([]);
              }}
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              Annuleren
            </button>
          </div>
          {/* Edit Fields (Simplified for brevity, same as before) */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold mb-1">Naam</label>
              <input
                className="w-full border p-2 rounded"
                value={editingProduct.name}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Code</label>
              <input
                className="w-full border p-2 rounded bg-slate-100"
                value={editingProduct.articleCode}
                readOnly
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Prijs</label>
              <input
                type="number"
                className="w-full border p-2 rounded"
                value={editingProduct.price}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    price: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Voorraad</label>
              <input
                type="number"
                className="w-full border p-2 rounded"
                value={editingProduct.stock}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    stock: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveEdit}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold"
            >
              Opslaan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 items-center overflow-y-auto custom-scrollbar p-8">
      <div className="w-full max-w-7xl space-y-8">
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div>
            <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <Package className="text-emerald-500" size={32} /> Product Beheer
            </h2>
            <p className="text-sm text-slate-400 font-medium ml-11 mt-1">
              Beheer de catalogus en voorraad
            </p>
          </div>
          <div className="flex gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200"
              >
                Terug
              </button>
            )}
            <button
              onClick={() => setIsCreating(true)}
              className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5"
            >
              <Plus size={18} /> Nieuw Product
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 sticky top-0 z-20">
          <Search className="text-slate-400 ml-2" size={20} />
          <input
            className="flex-1 bg-transparent text-lg font-bold text-slate-700 placeholder:text-slate-300 outline-none"
            placeholder="Zoek op naam, code of ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-6">
          {Object.entries(groupedProducts).map(([category, items]) => (
            <div
              key={category}
              className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div
                className="bg-slate-50/80 p-5 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors select-none border-b border-slate-100"
                onClick={() => toggleCategory(category)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-slate-400">
                    {expandedCategories[category] ? (
                      <ChevronDown size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Folder size={20} className="text-blue-500" />
                    <h3 className="text-lg font-black text-slate-700 uppercase tracking-wide">
                      {category}
                    </h3>
                    <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-black">
                      {items.length}
                    </span>
                  </div>
                </div>
              </div>
              {expandedCategories[category] && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="p-5 pl-8 w-1/3">Naam</th>
                        <th className="p-5">Code / ID</th>
                        <th className="p-5">Voorraad</th>
                        <th className="p-5 text-right pr-8">Acties</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {items.map((product) => (
                        <tr
                          key={product.id}
                          className="hover:bg-slate-50 transition-colors group"
                        >
                          <td className="p-5 pl-8 font-bold text-slate-700">
                            {product.name}
                          </td>
                          <td className="p-5 text-slate-500 font-mono text-xs">
                            {product.articleCode || product.id}
                          </td>
                          <td className="p-5 font-mono font-bold text-slate-600">
                            {product.stock || 0}
                          </td>
                          <td className="p-5 text-right pr-8">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setEditingProduct(product)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminProductManager;
