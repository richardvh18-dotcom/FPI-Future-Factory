import React, { useState } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";

// Hooks
import { useAdminAuth } from "./hooks/useAdminAuth";

// Layout Components
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute"; // Voor Admin routes

// Core Views
import LoginView from "./components/LoginView";
import PortalView from "./components/PortalView";
import InventoryView from "./components/InventoryView";
import ProfileView from "./components/ProfileView";
import CalculatorView from "./components/CalculatorView";
import AiAssistantView from "./components/AiAssistantView";
import ProductSearchView from "./components/products/ProductSearchView";

// Planning & Terminal Components
import DigitalPlanningHub from "./components/digitalplanning/DigitalPlanningHub";
import TeamleaderHub from "./components/digitalplanning/TeamleaderHub";
import Terminal from "./components/digitalplanning/Terminal";

// Admin
import AdminDashboard from "./components/admin/AdminDashboard";

// Config & Styles
import "./styles.css";
import "./config/firebase";
import "./i18n";

/**
 * Hulpcomponent: Dwingt inloggen af voor gewone pagina's.
 * Stuurt niet-ingelogde gebruikers naar /login.
 */
const RequireAuth = ({ children }) => {
  const { user, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        Laden...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  const location = useLocation();
  const { user, loading } = useAdminAuth(); // Haal user status op voor globale layout logica
  const [showCatalogFilters, setShowCatalogFilters] = useState(false);

  // Pagina's zonder Sidebar/Header
  const isFullScreenPage =
    location.pathname === "/login" ||
    location.pathname === "/" ||
    location.pathname === "/portal" ||
    location.pathname.startsWith("/terminal");

  if (loading) return null; // Wacht op auth check voordat we renderen

  return (
    <div className="app-container min-h-screen bg-slate-50">
      {/* Toon Header alleen als het GEEN full screen pagina is EN gebruiker is ingelogd */}
      {!isFullScreenPage && user && <Header />}

      <div className="main-layout flex">
        {/* Toon Sidebar alleen als het GEEN full screen pagina is EN gebruiker is ingelogd */}
        {!isFullScreenPage && user && (
          <Sidebar
            onToggleCatalogFilters={() =>
              setShowCatalogFilters(!showCatalogFilters)
            }
            isCatalogFiltersOpen={showCatalogFilters}
          />
        )}

        {/* Main Content Area */}
        <main
          className={`flex-1 transition-all duration-300 ${
            isFullScreenPage || !user ? "w-full p-0" : "md:ml-16 w-full"
          }`}
        >
          <Routes>
            {/* --- PUBLIC / AUTH --- */}

            {/* Root: Slimme redirect op basis van auth status */}
            <Route
              path="/"
              element={
                user ? (
                  <Navigate to="/portal" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* Login: Als al ingelogd, stuur door naar portal */}
            <Route
              path="/login"
              element={user ? <Navigate to="/portal" replace /> : <LoginView />}
            />

            {/* --- BEVEILIGDE ROUTES (Voor iedereen met een account) --- */}

            <Route
              path="/portal"
              element={
                <RequireAuth>
                  <PortalView />
                </RequireAuth>
              }
            />
            <Route
              path="/inventory"
              element={
                <RequireAuth>
                  <InventoryView />
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <ProfileView />
                </RequireAuth>
              }
            />
            <Route
              path="/calculator"
              element={
                <RequireAuth>
                  <CalculatorView />
                </RequireAuth>
              }
            />
            <Route
              path="/assistant"
              element={
                <RequireAuth>
                  <AiAssistantView />
                </RequireAuth>
              }
            />

            <Route
              path="/products"
              element={
                <RequireAuth>
                  <ProductSearchView
                    showFilters={showCatalogFilters}
                    setShowFilters={setShowCatalogFilters}
                  />
                </RequireAuth>
              }
            />

            {/* --- PLANNING & TERMINAL --- */}
            <Route
              path="/planning/*"
              element={
                <RequireAuth>
                  <DigitalPlanningHub />
                </RequireAuth>
              }
            />
            <Route
              path="/digital-planning"
              element={
                <RequireAuth>
                  <TeamleaderHub />
                </RequireAuth>
              }
            />

            {/* Terminal is ook beveiligd, maar full screen */}
            <Route
              path="/terminal/:stationId"
              element={
                <RequireAuth>
                  <Terminal />
                </RequireAuth>
              }
            />

            {/* --- ADMIN (Extra beveiligd via ProtectedRoute) --- */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
