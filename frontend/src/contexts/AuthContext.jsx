import { createContext, useContext, useState, useEffect } from "react";
import api, { tokenManager } from "../services/api";
import toast from "react-hot-toast";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Proactive token refresh - refresh access token every 14 minutes (before 15-min expiry)
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshInterval = setInterval(async () => {
      try {
        console.log("Proactively refreshing access token...");
        const response = await api.post("/auth/refresh-token");
        if (response.data?.data?.accessToken) {
          console.log("Access token refreshed successfully");
          // Token is automatically stored by response interceptor
        }
      } catch (error) {
        console.error("Proactive token refresh failed:", error);
        // If refresh fails, user will be logged out on next API call
      }
    }, 14 * 60 * 1000); // 14 minutes

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      // First, try to refresh the access token using the refresh token cookie
      // This ensures we have a valid access token in memory
      try {
        const refreshResponse = await api.post("/auth/refresh-token");
        if (refreshResponse.data?.data?.accessToken) {
          // Token is automatically stored by the response interceptor
          // Now fetch user data with the new access token
          const userResponse = await api.get("/auth/me");
          if (userResponse.data.success && userResponse.data.data) {
            setUser(userResponse.data.data);
            setIsAuthenticated(true);
            if (userResponse.data.data.userId) {
              localStorage.setItem("userId", userResponse.data.data.userId);
            }
          }
        }
      } catch (refreshError) {
        // Refresh token might be expired or invalid
        // User needs to login again
        console.log("No valid session found:", refreshError.message);
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem("userId");
        tokenManager.clearToken();
      }
    } catch (error) {
      // Silently fail - user is not authenticated
      console.log("Authentication check failed:", error);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("userId");
      tokenManager.clearToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      if (response.data.success && response.data.data) {
        // Store access token in memory (handled by api.js interceptor)
        // Token is automatically stored by response interceptor
        setUser(response.data.data.user);
        setIsAuthenticated(true);
        if (response.data.data.user.userId) {
          localStorage.setItem("userId", response.data.data.user.userId);
        }
        toast.success("Login successful!");
        return { success: true };
      }
      return { success: false, error: "Login failed" };
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Login failed";
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await api.post("/auth/register", {
        username,
        email,
        password,
      });
      if (response.data.success && response.data.data) {
        // Don't auto-login, user needs to verify email first
        toast.success(
          response.data.message ||
            "Registration successful! Please check your email to verify your account."
        );
        return { success: true, requiresVerification: true };
      }
      return { success: false, error: "Registration failed" };
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Registration failed";
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const verifyEmail = async (email, otp) => {
    try {
      const response = await api.post("/auth/verify-email", {
        email,
        otp,
      });
      if (response.data.success && response.data.data) {
        // Access token automatically stored by response interceptor
        setUser(response.data.data.user);
        setIsAuthenticated(true);
        if (response.data.data.user.userId) {
          localStorage.setItem("userId", response.data.data.user.userId);
        }
        toast.success(response.data.message || "Email verified successfully!");
        return { success: true };
      }
      return { success: false, error: "Email verification failed" };
    } catch (error) {
      const errorMsg =
        error.response?.data?.error || "Email verification failed";
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const resendVerification = async (email) => {
    try {
      const response = await api.post("/auth/resend-verification", { email });
      if (response.data.success) {
        toast.success(response.data.message || "Verification email sent!");
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      const errorMsg =
        error.response?.data?.error || "Failed to resend verification email";
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
      // Clear access token from memory
      tokenManager.clearToken();
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("userId");
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      // Clear state anyway
      tokenManager.clearToken();
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("userId");
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put("/auth/profile", profileData);
      if (response.data.success && response.data.data) {
        setUser(response.data.data);
        toast.success("Profile updated successfully");
        return { success: true };
      }
      return { success: false, error: "Profile update failed" };
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Profile update failed";
      toast.error(errorMsg);
      throw error;
    }
  };

  // Refresh access token using refresh token
  const refreshToken = async () => {
    try {
      const response = await api.post("/auth/refresh-token");
      if (response.data.success) {
        return true;
      }
      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      // If refresh fails, log out user
      await logout();
      return false;
    }
  };

  // Password reset methods
  const requestPasswordReset = async (email) => {
    try {
      const response = await api.post("/auth/forgot-password", { email });
      if (response.data.success) {
        toast.success(response.data.message);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      const errorMsg =
        error.response?.data?.error || "Failed to send reset email";
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const verifyResetOTP = async (email, otp) => {
    try {
      const response = await api.post("/auth/verify-reset-otp", { email, otp });
      if (response.data.success) {
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Invalid OTP";
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const resetPassword = async (email, token, newPassword) => {
    try {
      const response = await api.post("/auth/reset-password", {
        email,
        token,
        newPassword,
      });
      if (response.data.success) {
        // User is automatically logged in after password reset
        // Access token automatically stored by response interceptor
        setUser(response.data.data.user);
        setIsAuthenticated(true);
        toast.success(response.data.message);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      const errorMsg =
        error.response?.data?.error || "Failed to reset password";
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,

    logout,
    updateProfile,
    checkAuth,
    refreshToken,
    requestPasswordReset,
    verifyResetOTP,
    resetPassword,
    verifyEmail,
    resendVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
