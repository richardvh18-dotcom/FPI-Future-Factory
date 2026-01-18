import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css"; // Zorg dat styles als eerste geladen worden
import App from "./App";
import reportWebVitals from "./reportWebVitals";

// Initialiseer de root
const root = ReactDOM.createRoot(document.getElementById("root"));

// Render de applicatie binnen StrictMode
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Performance meting
reportWebVitals();
