import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "react-hot-toast";
import { ToastProvider } from "./contexts/ToastContext";
import ErrorBoundary from "./components/ErrorBoundary";

const VITE_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// Show warning if Google Client ID is not configured
if (!VITE_GOOGLE_CLIENT_ID || VITE_GOOGLE_CLIENT_ID === "test") {
  console.warn("⚠️ GOOGLE CLIENT ID NOT CONFIGURED");
  console.warn("Google Sign-In will not work until you:");
  console.warn("1. Get a Client ID from: https://console.cloud.google.com/");
  console.warn(
    "2. Add to frontend/.env: VITE_GOOGLE_CLIENT_ID=your-client-id-here"
  );
  console.warn("3. Restart the frontend server");
}

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
          {VITE_GOOGLE_CLIENT_ID && VITE_GOOGLE_CLIENT_ID !== "test" ? (
            <GoogleOAuthProvider clientId={VITE_GOOGLE_CLIENT_ID}>
              <App />
            </GoogleOAuthProvider>
          ) : (
            <App />
          )}
        </ToastProvider>
      </ErrorBoundary>
  </BrowserRouter>
);
