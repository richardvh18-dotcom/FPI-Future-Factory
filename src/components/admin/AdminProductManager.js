import React, { useState } from "react";
import { Plus, ArrowLeft } from "lucide-react";
import AdminProductListView from "./AdminProductListView";
import ProductForm from "./ProductForm";
import {
  addProduct,
  updateProduct,
  deleteProduct,
} from "../../utils/productHelpers";
import { useProductsData } from "../../hooks/useProductsData";

const AdminProductManager = ({ user }) => {
  const [view, setView] = useState("list"); // 'list' of 'form'
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Haal data op voor de lijst
  const { products, loading, refresh } = useProductsData();

  const [actionLoading, setActionLoading] = useState(false);

  // Start met het aanmaken van een nieuw product (Opent Modal)
  const handleCreateNew = () => {
    console.log("ACTIE: Nieuw product knop ingedrukt - Open Modal");
    setSelectedProduct(null); // Null = Nieuw formulier
    setView("form"); // Zet status op 'form' om de modal te tonen
  };

  // Start met het bewerken van een bestaand product (Opent Modal)
  const handleEdit = (product) => {
    console.log("ACTIE: Bewerken product - Open Modal", product.id);
    setSelectedProduct(product);
    setView("form");
  };

  // Sluit de modal en reset selectie
  const handleCancel = () => {
    console.log("ACTIE: Modal sluiten");
    setSelectedProduct(null);
    setView("list");
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        "Weet je zeker dat je dit product wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
      )
    ) {
      try {
        setActionLoading(true);
        await deleteProduct(id);
        if (refresh) refresh();
      } catch (error) {
        console.error("Fout bij verwijderen:", error);
        alert("Kon product niet verwijderen: " + error.message);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleSave = async (productData) => {
    console.log("ACTIE: Opslaan gestart...", productData);
    setActionLoading(true);
    try {
      if (selectedProduct && selectedProduct.id) {
        await updateProduct(selectedProduct.id, productData);
      } else {
        await addProduct(productData);
      }

      console.log("Opslaan succesvol, sluit modal");
      handleCancel(); // Sluit modal na succesvol opslaan
      if (refresh) refresh();
    } catch (error) {
      console.error("Fout bij opslaan:", error);
      alert("Er ging iets mis bij het opslaan: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* === HEADER (Altijd zichtbaar) === */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Product Beheer</h1>
          <p className="text-sm text-gray-500">
            Beheer de catalogus en specificaties
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-all"
        >
          <Plus size={20} className="mr-2" />
          Nieuw Product
        </button>
      </div>

      {/* === LIJST WEERGAVE (Altijd zichtbaar op de achtergrond) === */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative z-0">
        {/* Laadscherm voor de lijst */}
        {loading && !products && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Laadscherm voor acties (verwijderen) */}
        {actionLoading && (
          <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        <AdminProductListView
          products={products}
          onEdit={handleEdit}
          onDelete={handleDelete}
          user={user}
        />
      </div>

      {/* === MODAL OVERLAY (Alleen zichtbaar als view === 'form') === */}
      {view === "form" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 lg:p-6">
          {/* Donkere achtergrond met blur (klikken sluit modal) */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={handleCancel}
          ></div>

          {/* Modal Venster - Nu volledig responsive */}
          {/* Mobiel: w-full h-full (fullscreen), geen rounding */}
          {/* Desktop (md+): w-[95vw] h-[90vh] (modal look), rounded corners */}
          <div className="relative w-full h-full md:w-[95vw] md:h-[90vh] lg:max-w-screen-2xl bg-slate-50 md:rounded-[30px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-200">
            {/* We renderen het formulier hierin. */}
            <ProductForm
              initialData={selectedProduct}
              onSubmit={handleSave}
              onCancel={handleCancel}
              user={user}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductManager;
