import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state zodat de volgende render de fallback UI toont
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log de fout naar de console
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI bij een crash
      return (
        <div
          style={{
            padding: "40px",
            fontFamily: "sans-serif",
            backgroundColor: "#FEF2F2",
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              maxWidth: "800px",
              width: "100%",
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              border: "1px solid #F87171",
            }}
          >
            <h2 style={{ color: "#DC2626", marginTop: 0 }}>
              ⚠️ De applicatie is vastgelopen
            </h2>
            <p>
              Er is een technische fout opgetreden waardoor het scherm wit
              blijft. Kopieer onderstaande melding en deel deze met je
              Programmeerpartner:
            </p>

            <div
              style={{
                backgroundColor: "#F3F4F6",
                padding: "15px",
                borderRadius: "4px",
                overflowX: "auto",
                border: "1px solid #E5E7EB",
                marginBottom: "20px",
              }}
            >
              <code style={{ color: "#DC2626", fontWeight: "bold" }}>
                {this.state.error && this.state.error.toString()}
              </code>
            </div>

            <details>
              <summary style={{ cursor: "pointer", color: "#4B5563" }}>
                Toon technische details (Stack Trace)
              </summary>
              <pre
                style={{
                  fontSize: "12px",
                  marginTop: "10px",
                  whiteSpace: "pre-wrap",
                  color: "#6B7280",
                }}
              >
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>

            <button
              onClick={() => (window.location.href = "/")}
              style={{
                marginTop: "20px",
                padding: "10px 20px",
                cursor: "pointer",
                backgroundColor: "#2563EB",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontWeight: "bold",
              }}
            >
              Probeer opnieuw (Herladen)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
