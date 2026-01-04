import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EnvelopeSimple, ArrowLeft, CaretRight } from "@phosphor-icons/react";
import { useAuth } from "../../contexts/AuthContext";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Alert from "../../components/common/Alert";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { requestPasswordReset } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email) {
      setError("Please enter your email address");
      setLoading(false);
      return;
    }

    const result = await requestPasswordReset(email);

    if (result.success) {
      // Navigate to Reset Password page with email in state
      navigate("/reset-password", { state: { email } });
    } else {
      setError(result.error || "Failed to send reset email");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-boxdark-2 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white dark:bg-boxdark rounded-2xl shadow-xl overflow-hidden animate-fade-in p-8 sm:p-10">
        <div className="text-center mb-8">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>
          <h2 className="text-2xl font-bold text-black dark:text-white mb-2">
            Forgot Password?
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Enter your email address and we'll send you an OTP to reset your
            password.
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Email Address"
            type="email"
            placeholder="Enter your registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            icon={EnvelopeSimple}
          />

          <Button
            type="submit"
            loading={loading}
            disabled={loading}
            fullWidth
            size="lg"
            className="group"
          >
            Send OTP
            <CaretRight
              size={18}
              weight="bold"
              className="ml-2 group-hover:translate-x-1 transition-transform"
            />
          </Button>
        </form>
      </div>
    </div>
  );
}
