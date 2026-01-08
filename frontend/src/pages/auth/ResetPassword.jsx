import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  Lock,
  Key,
  ArrowLeft,
  EnvelopeSimple,
  CheckCircle,
} from "@phosphor-icons/react";
import { useAuth } from "../../contexts/AuthContext";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Alert from "../../components/common/Alert";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyResetOTP, resetPassword } = useAuth();

  // Get email from previous step
  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step state: 1 = Verify OTP, 2 = Set New Password
  const [step, setStep] = useState(1);
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  useEffect(() => {
    // If no email, user might have accessed directly
    if (!email && !location.state?.email) {
      // Optional: redirect logic if needed
    }
  }, [email, location.state]);

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !otp) {
      setError("Please provide email and OTP");
      setLoading(false);
      return;
    }

    // Verify OTP first
    const verifyResult = await verifyResetOTP(email, otp);

    if (verifyResult.success) {
      setIsOtpVerified(true);
      setStep(2);
    } else {
      setError(verifyResult.error || "Invalid OTP code");
    }

    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Call reset password with pre-verified OTP
    const result = await resetPassword(email, otp, newPassword);

    if (result.success) {
      navigate("/messages");
    } else {
      setError(result.error || "Failed to reset password");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-boxdark-2 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white dark:bg-boxdark rounded-2xl shadow-xl overflow-hidden animate-fade-in p-8 sm:p-10">
        <div className="text-center mb-8">
          {step === 1 && (
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary mb-6 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Email
            </Link>
          )}
          <h2 className="text-2xl font-bold text-black dark:text-white mb-2">
            {step === 1 ? "Verify Code" : "Set New Password"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {step === 1 ? (
              <span>
                Enter the OTP sent to <strong>{email}</strong>
              </span>
            ) : (
              "Create a strong password for your account"
            )}
          </p>
        </div>

        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => setError("")}
            className="mb-6"
          />
        )}

        {/* Step 1: Verify OTP */}
        {step === 1 && (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            {!location.state?.email && (
              <Input
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                icon={EnvelopeSimple}
              />
            )}

            <Input
              label="OTP Code"
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
              disabled={loading}
              icon={Key}
              maxLength={6}
              className="tracking-widest font-mono text-center text-lg"
            />

            <Button
              type="submit"
              loading={loading}
              disabled={loading || otp.length < 6}
              fullWidth
              size="lg"
              className="mt-2"
            >
              Verify Code
            </Button>
          </form>
        )}

        {/* Step 2: Set New Password */}
        {step === 2 && (
          <form
            onSubmit={handleResetPassword}
            className="space-y-6 animate-fade-in"
          >
            <div className="flex items-center gap-2 text-green-500 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-sm mb-4 justify-center">
              <CheckCircle size={20} weight="fill" />
              <span>Code verified successfully!</span>
            </div>

            <Input
              label="New Password"
              type="password"
              placeholder="Min. 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={loading}
              icon={Lock}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              icon={Lock}
            />

            <Button
              type="submit"
              loading={loading}
              disabled={loading}
              fullWidth
              size="lg"
              className="mt-2"
            >
              Reset Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
