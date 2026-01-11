import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ToastProvider } from "./contexts/ToastContext";
import ErrorBoundary from "./components/ErrorBoundary";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ErrorBoundary>
      <ToastProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            className: "",
            style: {
              background: "transparent",
              boxShadow: "none",
              padding: 0,
            },
          }}
        />
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </BrowserRouter>
);
