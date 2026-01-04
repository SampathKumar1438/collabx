import React, { useState, useEffect } from "react";
import { tokenManager } from "../services/api";
import api from "../services/api";

/**
 * Token Debug Component
 * Use this component to monitor and test the token refresh cycle
 * Add this to your app during development to see token refresh in action
 */
const TokenDebugger = () => {
  const [tokenInfo, setTokenInfo] = useState({
    hasToken: false,
    tokenPreview: "",
    lastRefresh: null,
    refreshCount: 0,
  });

  useEffect(() => {
    // Update token info every second
    const interval = setInterval(() => {
      const token = tokenManager.getToken();
      setTokenInfo((prev) => ({
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 20)}...` : "No token",
        lastRefresh: prev.lastRefresh,
        refreshCount: prev.refreshCount,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const testManualRefresh = async () => {
    try {
      console.log("🔄 Testing manual token refresh...");
      const response = await api.post("/auth/refresh-token");
      if (response.data?.data?.accessToken) {
        console.log("✅ Token refreshed successfully!");
        setTokenInfo((prev) => ({
          ...prev,
          lastRefresh: new Date().toLocaleTimeString(),
          refreshCount: prev.refreshCount + 1,
        }));
      }
    } catch (error) {
      console.error("❌ Token refresh failed:", error);
    }
  };

  const testProtectedEndpoint = async () => {
    try {
      console.log("🔒 Testing protected endpoint...");
      const response = await api.get("/auth/me");
      console.log("✅ Protected endpoint accessed:", response.data);
    } catch (error) {
      console.error("❌ Protected endpoint failed:", error);
    }
  };

  const clearToken = () => {
    console.log("🗑️ Clearing access token from memory...");
    tokenManager.clearToken();
    setTokenInfo((prev) => ({
      ...prev,
      hasToken: false,
      tokenPreview: "No token",
    }));
  };

  const testTokenExpiry = async () => {
    console.log("⏱️ Testing token expiry handling...");
    console.log("1. Clearing access token...");
    tokenManager.clearToken();

    console.log("2. Making API request (should trigger auto-refresh)...");
    try {
      const response = await api.get("/auth/me");
      console.log("✅ Request succeeded! Token was auto-refreshed.");
      console.log("User data:", response.data);
    } catch (error) {
      console.error("❌ Request failed:", error);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        background: "rgba(0, 0, 0, 0.9)",
        color: "#00ff00",
        padding: "20px",
        borderRadius: "10px",
        fontFamily: "monospace",
        fontSize: "12px",
        zIndex: 9999,
        minWidth: "350px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
      }}
    >
      <h3 style={{ margin: "0 0 15px 0", color: "#00ff00" }}>
        🔐 Token Debugger
      </h3>

      <div style={{ marginBottom: "15px" }}>
        <div style={{ marginBottom: "5px" }}>
          <strong>Status:</strong>{" "}
          {tokenInfo.hasToken ? "✅ Active" : "❌ No Token"}
        </div>
        <div style={{ marginBottom: "5px" }}>
          <strong>Token:</strong> {tokenInfo.tokenPreview}
        </div>
        <div style={{ marginBottom: "5px" }}>
          <strong>Last Refresh:</strong> {tokenInfo.lastRefresh || "Never"}
        </div>
        <div style={{ marginBottom: "5px" }}>
          <strong>Refresh Count:</strong> {tokenInfo.refreshCount}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          onClick={testManualRefresh}
          style={{
            padding: "8px 12px",
            background: "#00aa00",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          🔄 Manual Refresh
        </button>

        <button
          onClick={testProtectedEndpoint}
          style={{
            padding: "8px 12px",
            background: "#0066cc",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          🔒 Test Protected API
        </button>

        <button
          onClick={testTokenExpiry}
          style={{
            padding: "8px 12px",
            background: "#ff6600",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          ⏱️ Test Auto-Refresh
        </button>

        <button
          onClick={clearToken}
          style={{
            padding: "8px 12px",
            background: "#cc0000",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          🗑️ Clear Token
        </button>
      </div>

      <div
        style={{
          marginTop: "15px",
          padding: "10px",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "5px",
          fontSize: "10px",
        }}
      >
        <div>
          <strong>💡 Tips:</strong>
        </div>
        <div>• Check console for detailed logs</div>
        <div>• Token refreshes every 14 minutes</div>
        <div>• Auto-refresh on 401 errors</div>
      </div>
    </div>
  );
};

export default TokenDebugger;
