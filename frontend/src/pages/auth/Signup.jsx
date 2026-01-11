import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EnvelopeSimple, Lock, User, CheckCircle } from "@phosphor-icons/react";
import { useAuth } from "../../contexts/AuthContext";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Alert from "../../components/common/Alert";
import CollabLogo from "../../assets/collabx.png";
import { motion } from "framer-motion";

import AnimatedBackground from "../../components/common/AnimatedBackground";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const justRegistered = useRef(false);

  // Username validation
  const usernameValidation = React.useMemo(() => {
    const minLength = username.length >= 3;
    const maxLength = username.length <= 30;
    const validChars = /^[a-zA-Z0-9_]*$/.test(username);
    const noSpaces = !username.includes(" ");
    const isValid =
      minLength && maxLength && validChars && noSpaces && username.length > 0;
    return { minLength, maxLength, validChars, noSpaces, isValid };
  }, [username]);

  React.useEffect(() => {
    if (isAuthenticated && !justRegistered.current) {
      navigate("/messages", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!username || !email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const result = await register(username, email, password);

    if (result.success) {
      justRegistered.current = true;
      navigate("/verify-otp", { replace: true, state: { email } });
    } else {
      setError(result.error || "Registration failed. Please try again.");
    }

    setLoading(false);
  };

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden relative">
      <AnimatedBackground />

      {/* Main Layout Container */}
      <div className="flex w-full h-full relative z-10">
        {/* Left Side: Hero Section (40% width, hidden on mobile) */}
        <div className="hidden lg:flex w-[40%] flex-col justify-center items-center p-12 text-center relative border-r border-stroke dark:border-strokedark/50 backdrop-blur-sm bg-white/30 dark:bg-boxdark/30">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-md"
          >
            <motion.div
              variants={fadeIn}
              className="mb-8 relative inline-block"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-xl opacity-50 animate-pulse"></div>
              <img
                src={CollabLogo}
                alt="CollabX"
                className="w-32 h-32 relative rounded-full shadow-2xl border-4 border-white dark:border-boxdark object-cover mx-auto"
              />
            </motion.div>

            <motion.h1
              variants={fadeIn}
              className="text-4xl font-extrabold text-black dark:text-white mb-6 leading-tight"
            >
              Join the{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                Future
              </span>{" "}
              of Collaboration
            </motion.h1>

            <motion.p
              variants={fadeIn}
              className="text-lg text-body dark:text-bodydark font-medium leading-relaxed"
            >
              Connect seamlessly, chat instantly, and share your world with
              CollabX. Your community awaits.
            </motion.p>

            <motion.div
              variants={fadeIn}
              className="mt-12 flex gap-4 justify-center"
            >
              {/* Decorative small badges or icons could go here */}
              <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 px-4 py-2 rounded-full backdrop-blur-md shadow-sm">
                <CheckCircle weight="fill" className="text-green-500" />
                <span className="text-sm font-semibold">Real-time Chat</span>
              </div>
              <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 px-4 py-2 rounded-full backdrop-blur-md shadow-sm">
                <CheckCircle weight="fill" className="text-primary" />
                <span className="text-sm font-semibold">Secure</span>
              </div>
            </motion.div>
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
            {/* Mobile Header (Only visible on small screens) */}
            <div className="lg:hidden text-center mb-8">
              <img
                src={CollabLogo}
                alt="CollabX"
                className="w-20 h-20 mx-auto mb-4 rounded-full shadow-lg border-2 border-white dark:border-strokedark object-cover"
              />
              <h2 className="text-2xl font-bold text-black dark:text-white">
                Join CollabX
              </h2>
            </div>

            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-black dark:text-white mb-2">
                Create Account
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                It only takes a minute to get started.
              </p>
            </div>

            {error && (
              <Alert
                type="error"
                message={error}
                onClose={() => setError("")}
              />
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <Input
                  label="Username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                    )
                  }
                  required
                  minLength={3}
                  maxLength={30}
                  disabled={loading}
                  icon={User}
                />
                {username.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div
                      className={`flex items-center gap-2 text-xs ${
                        usernameValidation.minLength
                          ? "text-green-500"
                          : "text-gray-400"
                      }`}
                    >
                      <CheckCircle
                        size={14}
                        weight={
                          usernameValidation.minLength ? "fill" : "regular"
                        }
                      />
                      <span>At least 3 characters</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 text-xs ${
                        usernameValidation.validChars
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      <CheckCircle
                        size={14}
                        weight={
                          usernameValidation.validChars ? "fill" : "regular"
                        }
                      />
                      <span>Only letters, numbers, and underscores</span>
                    </div>
                  </div>
                )}
              </div>

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

              <Input
                label="Password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                icon={Lock}
              />

              <Button
                type="submit"
                loading={loading}
                disabled={loading}
                fullWidth
                size="lg"
                className="mt-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
              >
                Create Account
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-8 pb-4">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-bold text-primary hover:text-secondary transition-colors"
              >
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Footer Credit (Fixed outside the flex container to avoid overlap) */}
      <div className="absolute bottom-4 right-4 lg:right-auto lg:left-12 text-xs text-gray-400 opacity-50 hidden lg:block">
        © {new Date().getFullYear()} CollabX Inc.
      </div>
    </div>
  );
}
