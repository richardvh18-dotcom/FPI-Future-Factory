import React, { useState, Suspense, lazy } from "react";
import {
  Loader2,
  Package,
  Calculator,
  Sparkles,
  LayoutDashboard,
  Wrench,
} from "lucide-react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db, appId } from "./config/firebase";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import LoginView from "./components/LoginView";
import ProductSearchView from "./components/products/ProductSearchView";
import ProductDetailModal from "./components/products/ProductDetailModal";

// Nieuwe Hooks Imports
import { useAdminAuth } from "./hooks/useAdminAuth";
import { useProductsData } from "./hooks/useProductsData";
import { useSettingsData } from "./hooks/useSettingsData";
import useInventory from "./hooks/useInventory";

import { generateProductPDF } from "./utils/pdfGenerator";
import { callGemini } from "./utils/helpers";

// Lazy Loading Components
const AdminProductManager = lazy(() =>
  import("./components/admin/AdminProductManager")
);
const AdminDashboard = lazy(() => import("./components/admin/AdminDashboard"));

// Verwijzing naar de nieuwe modulaire Matrix Manager
const AdminMatrixManager = lazy(() =>
  import("./components/admin/matrixmanager/AdminMatrixManager")
);

const AdminUploadView = lazy(() =>
  import("./components/admin/AdminUploadView")
);
const AdminToleranceView = lazy(() =>
  import("./components/admin/AdminToleranceView")
);
const AdminLocationsView = lazy(() =>
  import("./components/admin/AdminLocationsView")
);

const CalculatorView = lazy(() => import("./components/CalculatorView"));
const AiAssistantView = lazy(() => import("./components/AiAssistantView"));

const App = () => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState("products");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [shouldOpenCreateModal, setShouldOpenCreateModal] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    type: "Alle",
    diameter: "Alle",
    pressure: "Alle",
    connection: "Alle",
    angle: "Alle",
    productLabel: "Alle",
  });

  // --- DATA HOOKS ---
  // 1. Authenticatie & Rechten
  const { user, isAdmin: isAdminMode, loading: authLoading } = useAdminAuth();

  // 2. Product Data (Inventory)
  const { products, loading: prodLoading } = useProductsData();

  // 3. Settings & Config Data
  const {
    bellDimensions,
    productRange,
    standardFittingSpecs,
    toleranceSettings,
    productTemplates,
    generalConfig,
    boreDimensions,
    loading: settingsLoading,
  } = useSettingsData(user);

  // 4. Inventory / Moffen (Specifieke collectie)
  const { moffen, loading: invLoading } = useInventory(!!user);

  const loading = authLoading || prodLoading || settingsLoading || invLoading;

  // --- FILTER LOGICA ---
  const uniqueTypes = [...new Set(products.map((p) => p.type))].sort();
  const uniqueDiameters = [
    ...new Set(products.map((p) => Number(p.diameter))),
  ].sort((a, b) => a - b);
  const uniquePressures = [
    ...new Set(products.map((p) => Number(p.pressure))),
  ].sort((a, b) => a - b);
  const uniqueConnections = [
    ...new Set(products.map((p) => p.connection)),
  ].sort();
  const uniqueAngles = [
    ...new Set(products.filter((p) => p.angle).map((p) => p.angle)),
  ].sort();
  const uniqueLabels = [
    ...new Set(products.map((p) => p.productLabel || "Standaard")),
  ].sort();

  const filteredProducts = products.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        p.name?.toLowerCase().includes(q) ||
        p.id?.toLowerCase().includes(q) ||
        p.articleCode?.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }
    if (filters.type !== "Alle" && p.type !== filters.type) return false;
    if (
      filters.diameter !== "Alle" &&
      String(p.diameter) !== String(filters.diameter)
    )
      return false;
    if (
      filters.pressure !== "Alle" &&
      String(p.pressure) !== String(filters.pressure)
    )
      return false;
    if (filters.connection !== "Alle" && p.connection !== filters.connection)
      return false;
    if (filters.angle !== "Alle" && String(p.angle) !== String(filters.angle))
      return false;
    if (
      filters.productLabel !== "Alle" &&
      (p.productLabel || "Standaard") !== filters.productLabel
    )
      return false;

    return true;
  });

  if (authLoading) return <div className="loading-screen">Laden...</div>;

  if (!user) {
    return (
      <LoginView onLogin={(e, p) => signInWithEmailAndPassword(auth, e, p)} />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">
      <Header
        user={user}
        isAdminMode={isAdminMode}
        onAdminToggle={() => {}} // Admin toggle is nu readonly gebaseerd op rol
        onLogout={() => signOut(auth)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <div className="bg-white border-b px-6 pt-2 flex gap-4 shadow-sm z-10 overflow-x-auto no-scrollbar text-left items-center">
        {[
          { id: "products", label: "Catalogus", icon: <Package size={14} /> },
          {
            id: "admin_locations",
            label: "Gereedschappen",
            icon: <Wrench size={14} />,
          },
          {
            id: "calculator",
            label: "Calculator",
            icon: <Calculator size={14} />,
          },
          { id: "ai", label: "AI", icon: <Sparkles size={14} /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 flex items-center gap-2 transition-all ${
              activeTab === t.id
                ? "border-blue-600 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}

        {isAdminMode && (
          <>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <button
              onClick={() => setActiveTab("admin_dashboard")}
              className={`pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 flex items-center gap-2 ${
                activeTab.startsWith("admin_") &&
                activeTab !== "admin_locations"
                  ? "border-blue-600 text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <LayoutDashboard size={14} /> Beheer
            </button>
          </>
        )}
      </div>

      <main className="flex-1 flex overflow-hidden relative">
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center bg-slate-50 flex-col gap-2">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <span className="text-xs font-medium text-slate-400">
                Module laden...
              </span>
            </div>
          }
        >
          {activeTab === "products" && (
            <>
              <Sidebar
                filters={filters}
                setFilters={setFilters}
                uniqueTypes={uniqueTypes}
                uniqueDiameters={uniqueDiameters}
                uniquePressures={uniquePressures}
                uniqueConnections={uniqueConnections}
                uniqueAngles={uniqueAngles}
                uniqueLabels={uniqueLabels}
                isOpen={isSidebarOpen}
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
              <div className="flex-1 overflow-y-auto bg-slate-100 text-left">
                <ProductSearchView
                  products={filteredProducts}
                  onProductClick={setViewingProduct}
                />
              </div>
            </>
          )}

          {activeTab === "admin_locations" && (
            <AdminLocationsView moffen={moffen} canEdit={isAdminMode} />
          )}

          {activeTab === "calculator" && (
            <CalculatorView
              bellDimensions={bellDimensions}
              standardFittingDims={standardFittingSpecs}
            />
          )}

          {activeTab === "ai" && (
            <AiAssistantView products={products} callGemini={callGemini} />
          )}

          {activeTab === "admin_dashboard" && (
            <AdminDashboard navigate={setActiveTab} />
          )}

          {activeTab === "admin_products" && (
            <AdminProductManager
              products={products}
              productRange={productRange}
              bellDimensions={bellDimensions}
              standardFittingSpecs={standardFittingSpecs}
              productTemplates={productTemplates}
              generalConfig={generalConfig}
              toleranceSettings={toleranceSettings}
              boreDimensions={boreDimensions}
              onBack={() => setActiveTab("admin_dashboard")}
              initialOpenModal={shouldOpenCreateModal}
              onModalClose={() => setShouldOpenCreateModal(false)}
            />
          )}

          {activeTab === "admin_matrix" && (
            <AdminMatrixManager
              productRange={productRange}
              productTemplates={productTemplates}
              bellDimensions={bellDimensions}
              onBack={() => setActiveTab("admin_dashboard")}
            />
          )}

          {activeTab === "admin_upload" && (
            <AdminUploadView onBack={() => setActiveTab("admin_dashboard")} />
          )}

          {activeTab === "admin_tolerances" && (
            <AdminToleranceView
              bellDimensions={bellDimensions}
              productRange={productRange}
              onBack={() => setActiveTab("admin_dashboard")}
            />
          )}
        </Suspense>
      </main>

      {viewingProduct && (
        <ProductDetailModal
          product={viewingProduct}
          moffen={moffen}
          toleranceSettings={toleranceSettings}
          onClose={() => setViewingProduct(null)}
          onExportPDF={generateProductPDF}
        />
      )}
    </div>
  );
};

export default App;
