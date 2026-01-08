import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

export default function VerifyOTP() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  const { verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      toast.error("Invalid access. Please sign up first.");
      navigate("/signup");
    }
  }, [email, navigate]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus next input
    if (element.nextSibling && element.value !== "") {
      element.nextSibling.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (
      e.key === "Backspace" &&
      otp[index] === "" &&
      e.target.previousSibling
    ) {
      e.target.previousSibling.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const data = e.clipboardData.getData("text").slice(0, 6).split("");
    if (data.length === 0) return;

    const newOtp = [...otp];
    data.forEach((value, index) => {
      if (index < 6 && !isNaN(value)) {
        newOtp[index] = value;
      }
    });
    setOtp(newOtp);

    // Focus the last filled input or the first empty one
    const lastFilledIndex = Math.min(data.length - 1, 5);
    const inputs = document.querySelectorAll('input[type="text"]');
    if (inputs[lastFilledIndex]) {
      inputs[lastFilledIndex].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setSubmitting(true);
    try {
      const result = await verifyEmail(email, otpString);
      if (result.success) {
        // toast.success("Email verified successfully!");
        navigate("/setup-profile");      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const result = await resendVerification(email);
      if (result.success) {
        setTimeLeft(30);
        setOtp(["", "", "", "", "", ""]);
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-boxdark-2 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-card dark:bg-boxdark">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Verify your email
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            We sent a code to{" "}
            <span className="font-medium text-black dark:text-white">
              {email}
            </span>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="flex justify-center gap-2">
            {otp.map((data, index) => (
              <input
                key={index}
                type="text"
                maxLength="1"
                value={data}
                onChange={(e) => handleChange(e.target, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={handlePaste}
                onFocus={(e) => e.target.select()}
                className="h-12 w-12 rounded-lg border border-stroke bg-transparent text-center text-xl font-bold text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={submitting || otp.join("").length !== 6}
            className="group relative flex w-full justify-center rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:bg-opacity-70 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            {submitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "Verify Email"
            )}
          </button>
        </form>

        <div className="text-center text-sm">
          <p className="text-gray-600 dark:text-gray-400">
            Didn't receive the code?{" "}
            {timeLeft > 0 ? (
              <span className="font-medium text-primary">
                Resend in {timeLeft}s
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="font-medium text-primary hover:text-opacity-90 disabled:cursor-not-allowed disabled:text-opacity-70"
              >
                {resending ? "Sending..." : "Resend OTP"}
              </button>
            )}
          </p>
        </div>

        <div className="text-center mt-4">
          <Link
            to="/signup"
            className="text-sm font-medium text-primary hover:text-opacity-90"
          >
            Back to Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
