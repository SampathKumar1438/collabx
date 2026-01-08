import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProfileSetupRoute({ children }) {
  const {  isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-boxdark">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-body dark:text-bodydark">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Allow new users to see profile setup page
  // Note: If profileComplete field doesn't exist in backend yet, this will always show the setup page
  // Once migration is run and user completes profile, they won't see this page again
  return children;
}
