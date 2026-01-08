import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import { CallProvider } from "./contexts/CallContext";

import CallOverlay from "./components/CallOverlay";
import ProtectedRoute from "./components/ProtectedRoute";
import ProfileSetupRoute from "./components/ProfileSetupRoute";
import NotificationListener from "./components/NotificationListener";
import PageLoader from "./components/PageLoader";
import AnimatedBackground from "./components/common/AnimatedBackground";

// Lazy load all page components for code-splitting
// Auth Pages
const Login = lazy(() => import("./pages/auth/Login.jsx"));
const Signup = lazy(() => import("./pages/auth/Signup.jsx"));
const VerifyOTP = lazy(() => import("./pages/auth/VerifyOTP.jsx"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword.jsx"));

// Main App Pages
const Chat = lazy(() => import("./pages/Chat.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const ProfileSetup = lazy(() => import("./pages/ProfileSetup.jsx"));
const ProfileEdit = lazy(() => import("./pages/ProfileEdit.jsx"));

// Suspense wrapper component for cleaner code
const LazyPage = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

export default function App() {
  return (
    <AuthProvider>
      <AnimatedBackground />
      <SocketProvider>
        <NotificationListener />
        <CallProvider>
          <CallOverlay />
          <Routes>
            {/* Public routes - Auth */}
            <Route
              path="/login"
              element={
                <LazyPage>
                  <Login />
                </LazyPage>
              }
            />
            <Route
              path="/signup"
              element={
                <LazyPage>
                  <Signup />
                </LazyPage>
              }
            />
            <Route
              path="/verify-otp"
              element={
                <LazyPage>
                  <VerifyOTP />
                </LazyPage>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <LazyPage>
                  <ForgotPassword />
                </LazyPage>
              }
            />
            <Route
              path="/reset-password"
              element={
                <LazyPage>
                  <ResetPassword />
                </LazyPage>
              }
            />

            {/* Profile Setup - Accessible to authenticated users without complete profile */}
            <Route
              path="/setup-profile"
              element={
                <ProfileSetupRoute>
                  <LazyPage>
                    <ProfileSetup />
                  </LazyPage>
                </ProfileSetupRoute>
              }
            />

            {/* Protected routes - Require authentication */}
            {/* Messages/Chat routes with proper URL-based navigation */}
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <LazyPage>
                    <Chat view="dms" />
                  </LazyPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages/:conversationId"
              element={
                <ProtectedRoute>
                  <LazyPage>
                    <Chat view="dms" />
                  </LazyPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups"
              element={
                <ProtectedRoute>
                  <LazyPage>
                    <Chat view="groups" />
                  </LazyPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:groupId"
              element={
                <ProtectedRoute>
                  <LazyPage>
                    <Chat view="groups" />
                  </LazyPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-chat"
              element={
                <ProtectedRoute>
                  <LazyPage>
                    <Chat view="ai" />
                  </LazyPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <LazyPage>
                    <Profile />
                  </LazyPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/edit"
              element={
                <ProtectedRoute>
                  <LazyPage>
                    <ProfileEdit />
                  </LazyPage>
                </ProtectedRoute>
              }
            />

            {/* Default route - redirect to messages if authenticated, login otherwise */}
            <Route path="/" element={<Navigate to="/messages" replace />} />

            {/* 404 - Catch all unmatched routes */}
            <Route path="*" element={<Navigate to="/messages" replace />} />
          </Routes>
        </CallProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
