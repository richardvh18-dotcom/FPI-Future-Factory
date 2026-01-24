import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import ErrorBoundary from "./components/ErrorBoundary"; // <--- HIER importeren
import "./styles.css";

// CRUCIAAL: Importeer de firebase configuratie
import "./config/firebase";

// Importeer i18n configuratie (indien aanwezig)
import "./i18n";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    {/* De ErrorBoundary staat helemaal buitenom. 
      Als App of Router crasht, vangt deze component het op.
    */}
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

reportWebVitals();
