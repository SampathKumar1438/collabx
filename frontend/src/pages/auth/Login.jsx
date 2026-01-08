import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EnvelopeSimple, Lock } from "@phosphor-icons/react";
import { useAuth } from "../../contexts/AuthContext";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Alert from "../../components/common/Alert";
import CollabLogo from "../../assets/collabx.png";
import { motion } from "framer-motion";

import AnimatedBackground from "../../components/common/AnimatedBackground";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/messages", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    const result = await login(email, password);

    if (result.success) {
      navigate("/messages", { replace: true });
    } else {
      setError(result.error || "Invalid email or password");
    }

    setLoading(false);
  };

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden relative">
      <AnimatedBackground />

      <div className="flex w-full h-full relative z-10">
        {/* Left Side: Hero Section (40% width, hidden on mobile) */}
        <div className="hidden lg:flex w-[40%] flex-col justify-center items-center p-12 text-center relative border-r border-stroke dark:border-strokedark/50 backdrop-blur-sm bg-white/30 dark:bg-boxdark/30">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="max-w-md"
          >
            <div className="mb-8 relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-xl opacity-50 animate-pulse"></div>
              <img
                src={CollabLogo}
                alt="CollabX"
                className="w-32 h-32 relative rounded-full shadow-2xl border-4 border-white dark:border-boxdark object-cover mx-auto"
              />
            </div>

            <h1 className="text-4xl font-extrabold text-black dark:text-white mb-6 leading-tight">
              Welcome Back to{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                CollabX
              </span>
            </h1>

            <p className="text-lg text-body dark:text-bodydark font-medium leading-relaxed">
              Seamlessly pick up where you left off. Your conversations are
              waiting.
            </p>
          </motion.div>
        </div>

        {/* Right Side: Form Section (60% width, full on mobile) */}
        <div className="w-full lg:w-[60%] flex flex-col justify-center items-center p-6 sm:p-12 h-screen overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md space-y-8"
          >
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-8">
              <img
                src={CollabLogo}
                alt="CollabX"
                className="w-20 h-20 mx-auto mb-4 rounded-full shadow-lg border-2 border-white dark:border-strokedark object-cover"
              />
              <h2 className="text-2xl font-bold text-black dark:text-white">
                Welcome Back
              </h2>
            </div>

            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-black dark:text-white mb-2">
                Sign In
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Enter your credentials to access your account
              </p>
            </div>

            {error && (
              <Alert
                type="error"
                message={error}
                onClose={() => setError("")}
              />
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                icon={EnvelopeSimple}
              />

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-black dark:text-white">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-primary hover:text-secondary transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  icon={Lock}
                />
              </div>

              <Button
                type="submit"
                loading={loading}
                disabled={loading}
                fullWidth
                size="lg"
                className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
              >
                Sign In
              </Button>
            </form>
{/* 
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stroke dark:border-strokedark"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-whiten dark:bg-boxdark-2 text-gray-500">
                  or continue with
                </span>
              </div>
            </div> */}

            {/* <div className="flex justify-center">
              <GoogleSignInButton />
            </div> */}

            <p className="text-center text-sm text-gray-500 mt-8 pb-4">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-bold text-primary hover:text-secondary transition-colors"
              >
                Sign up for free
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Footer Credit */}
      <div className="absolute bottom-4 right-4 lg:right-auto lg:left-12 text-xs text-gray-400 opacity-50 hidden lg:block">
        © {new Date().getFullYear()} CollabX Inc.
      </div>
    </div>
  );
}
