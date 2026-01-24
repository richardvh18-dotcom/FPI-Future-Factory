import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit,
  Box,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Layers,
} from "lucide-react";
import { useProductsData } from "../../hooks/useProductsData";

// Sub-component voor een inklapbare categorie
const ProductCategoryGroup = ({ title, products, onEdit, forceExpand }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (forceExpand) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [forceExpand]);

  if (!products || products.length === 0) return null;

  return (
    <div className="mb-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-transparent data-[open=true]:border-slate-100"
        data-open={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500">
            {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>
          <div className="text-left">
            <h3 className="font-black text-slate-800 text-lg tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              {products.length} items
            </p>
          </div>
        </div>

        <div className="flex gap-1">
          {products.slice(0, 5).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          ))}
          {products.length > 5 && (
            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 bg-white animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group overflow-hidden flex flex-col"
              >
                <div className="p-4 flex items-start justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-12 h-12 shrink-0 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Box className="text-slate-300" size={24} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 truncate text-sm">
                        {product.articleCode}
                      </h4>
                      <p className="text-xs text-slate-500 truncate">
                        {product.name}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onEdit(product)}
                    className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                </div>

                <div className="px-4 pb-4 pt-0 mt-auto">
                  <div className="flex flex-wrap gap-2">
                    {product.diameter && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-md border border-slate-200">
                        Ø {product.diameter}
                      </span>
                    )}
                    {product.pressure && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-md border border-slate-200">
                        PN {product.pressure}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AdminProductManager = ({ onBack, navigate }) => {
  const { products, deleteProduct } = useProductsData();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.articleCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === "all" || product.type === filterType;

    return matchesSearch && matchesType;
  });

  const groupedProducts = filteredProducts.reduce((groups, product) => {
    const type = product.type || "Overig";
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(product);
    return groups;
  }, {});

  const categoryKeys = Object.keys(groupedProducts).sort();

  // FIX: Navigatie Handlers
  const handleAddNew = () => {
    // Navigeer naar het nieuwe scherm (gedefinieerd in AdminDashboard als 'admin_new_product')
    if (navigate) navigate("admin_new_product");
  };

  const handleEdit = (product) => {
    // Navigeer met data
    if (navigate) navigate("admin_new_product", { editingProduct: product });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Layers className="text-blue-500" size={24} /> Productbeheer
            </h1>
            <p className="text-sm text-slate-500">
              Beheer catalogus en specificaties
            </p>
          </div>
        </div>

        {/* KNOP WERKT NU VIA navigate() */}
        <button
          onClick={handleAddNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-blue-200 transition-all active:scale-95"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Nieuw Product</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-4 bg-white/50 backdrop-blur-sm border-b border-slate-200 sticky top-[73px] z-10 grid gap-4 md:flex md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Zoek op artikelnummer of naam..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm focus:shadow-md"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {["all", "Pipe", "Fitting", "Spool"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                filterType === type
                  ? "bg-slate-800 text-white shadow-lg"
                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              {type === "all" ? "Alle Categorieën" : type}
            </button>
          ))}
        </div>
      </div>

      {/* Product Groups List */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {categoryKeys.length > 0 ? (
          <div className="space-y-2 max-w-7xl mx-auto">
            {categoryKeys.map((type) => (
              <ProductCategoryGroup
                key={type}
                title={type}
                products={groupedProducts[type]}
                onEdit={handleEdit}
                forceExpand={searchTerm.length > 0}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-slate-400">
            <Box size={64} className="mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-slate-500">
              Geen producten gevonden
            </h3>
            <p className="text-sm">
              Probeer een andere zoekterm of voeg een product toe.
            </p>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-8 text-center">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
            Totaal {filteredProducts.length} producten in catalogus
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminProductManager;
