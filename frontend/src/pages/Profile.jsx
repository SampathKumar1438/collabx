import { useState, useEffect } from "react";
import {
  User,
  Envelope,
  BellRinging,
  Lock,
  Globe,
  SignOut,
  Moon,
  Sun,
  ArrowLeft,
  PencilSimple,
  Calendar,
  ChatCircle,
} from "@phosphor-icons/react";
import Sidebar from "../section/chat/Sidebar";
import Avatar from "../components/common/Avatar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Check initial theme from localStorage or system
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return document.documentElement.classList.contains("dark");
  });

  // Toggle theme function
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);

    if (newMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Apply theme on mount
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Profile data from user context
  const profileData = {
    name: user?.username || "User",
    bio: user?.bio || "Hey there! I am using this chat app",
    email: user?.email || "",
    avatar: user?.profilePictureUrl || null,
    memberSince:
      new Date(user?.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }) || "Jan 2024",
  };

  return (
    <div className="h-screen overflow-hidden relative">
      <div className="flex h-full w-full relative z-10 overflow-hidden">
        {/* Sidebar - Consistent with Chat.jsx */}
        <div className="hidden md:flex flex-shrink-0">
          <Sidebar onNavigate={() => {}} currentView={3} />
        </div>

        {/* Profile Content - Full Height No Scroll */}
        <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
          {/* Header - Compact */}
          <div className="flex-shrink-0 gradient-bg-header border-b border-stroke/20 dark:border-strokedark/20 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/messages")}
                  className="hover:bg-white/10 dark:hover:bg-black/20 rounded-full p-2 transition-colors"
                  aria-label="Go back to messages"
                >
                  <ArrowLeft size={20} />
                </button>
                <h1 className="text-lg font-semibold text-black dark:text-white">
                  Profile
                </h1>
              </div>
              <button
                onClick={() => navigate("/profile/edit")}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all font-medium text-sm"
              >
                <PencilSimple size={16} weight="bold" />
                Edit Profile
              </button>
            </div>
          </div>

          {/* Main Content - 2 Column Layout, Full Width, No Padding */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
            {/* Left Column - Profile Info */}
            <div className="flex flex-col p-6 gradient-bg-subtle border-r border-stroke/20 dark:border-strokedark/20 overflow-y-auto">
              {/* Profile Card */}
              <div className="bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/10 dark:from-primary/10 dark:via-secondary/10 dark:to-primary/20 rounded-2xl p-6 border border-primary/20 mb-6 shrink-0">
                <div className="flex items-center gap-5">
                  <div className="relative flex-shrink-0">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 dark:border-white/10 shadow-xl ring-4 ring-primary/20">
                      <Avatar
                        src={profileData.avatar}
                        alt="Profile"
                        size="custom"
                        className="w-full h-full"
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 rounded-full border-2 border-white/20 dark:border-black/50 flex items-center justify-center">
                      <ChatCircle
                        size={14}
                        className="text-white"
                        weight="fill"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-black dark:text-white mb-1 truncate">
                      {profileData.name}
                    </h2>
                    <p className="text-sm text-body dark:text-white mb-3 line-clamp-2 leading-relaxed">
                      {profileData.bio}
                    </p>
                    <div className="flex items-center gap-2 text-xs font-medium text-body dark:text-white bg-gray-100 dark:bg-black/20 px-3 py-1 rounded-full w-fit">
                      <Calendar size={14} />
                      <span>
                        Has been a member since {profileData.memberSince}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6 shrink-0">
                {/* Email */}
                <div className="bg-white/10 dark:bg-black/20 rounded-2xl p-4 border border-stroke/20 dark:border-strokedark/20 transition-all hover:bg-white/20 backdrop-blur-sm">
                  <div className="flex flex-col gap-3">
                    <div className="bg-primary/10 w-fit p-2.5 rounded-xl">
                      <Envelope
                        size={20}
                        className="text-primary"
                        weight="duotone"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-body dark:text-white font-bold mb-0.5">
                        Email Address
                      </p>
                      <p className="text-sm font-semibold text-black dark:text-white truncate">
                        {profileData.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Username */}
                <div className="bg-white/10 dark:bg-black/20 rounded-2xl p-4 border border-stroke/20 dark:border-strokedark/20 transition-all hover:bg-white/20 backdrop-blur-sm">
                  <div className="flex flex-col gap-3">
                    <div className="bg-primary/10 w-fit p-2.5 rounded-xl">
                      <User
                        size={20}
                        className="text-primary"
                        weight="duotone"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-body dark:text-white font-bold mb-0.5">
                        Username
                      </p>
                      <p className="text-sm font-semibold text-black dark:text-white truncate">
                        {profileData.name}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logout Button - Moved up naturally */}
              <button
                onClick={() => {
                  logout();
                  navigate("/login", { replace: true });
                }}
                className="flex items-center gap-4 p-4 bg-red-500/10 dark:bg-red-900/10 rounded-2xl border border-red-500/20 hover:bg-red-500/20 transition-all group w-full backdrop-blur-sm"
              >
                <div className="bg-red-100 dark:bg-red-900/30 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
                  <SignOut
                    size={20}
                    weight="duotone"
                    className="text-red-500"
                  />
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-bold text-red-600 dark:text-red-400">
                    Log Out
                  </div>
                  <div className="text-xs text-red-400 dark:text-red-500/70 font-medium">
                    Securely end your session
                  </div>
                </div>
              </button>
            </div>

            {/* Right Column - Settings */}
            <div className="flex flex-col p-6 overflow-y-auto">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-body dark:text-white mb-5 ml-1">
                Global Preferences
              </h3>

              <div className="flex flex-col gap-4">
                {/* Notifications */}
                <button className="flex items-center gap-4 p-5 bg-white/10 dark:bg-black/20 rounded-2xl border border-stroke/20 dark:border-strokedark/20 hover:border-primary/50 hover:bg-white/20 transition-all group backdrop-blur-sm shadow-sm">
                  <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary/20 transition-colors">
                    <BellRinging
                      size={24}
                      weight="duotone"
                      className="text-blue-500"
                    />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-base font-bold text-black dark:text-white mb-0.5">
                      Notifications
                    </div>
                    <div className="text-sm text-body dark:text-white">
                      Customize your alert sounds and popups
                    </div>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/40 animate-pulse"></div>
                </button>

                {/* Privacy */}
                <button className="flex items-center gap-4 p-5 bg-white/10 dark:bg-black/20 rounded-2xl border border-stroke/20 dark:border-strokedark/20 hover:border-primary/50 hover:bg-white/20 transition-all group backdrop-blur-sm">
                  <div className="bg-green-50 p-3 rounded-xl group-hover:bg-green-100 dark:bg-green-900/20 dark:group-hover:bg-green-900/30 transition-colors">
                    <Lock
                      size={24}
                      weight="duotone"
                      className="text-green-500"
                    />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-base font-bold text-black dark:text-white mb-0.5">
                      Privacy & Security
                    </div>
                    <div className="text-sm text-body dark:text-white">
                      Manage account security and data
                    </div>
                  </div>
                </button>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-4 p-5 bg-white/10 dark:bg-black/20 rounded-2xl border border-stroke/20 dark:border-strokedark/20 hover:border-primary/50 hover:bg-white/20 transition-all group backdrop-blur-sm shadow-sm"
                >
                  <div className="bg-purple-50 p-3 rounded-xl group-hover:bg-purple-100 dark:bg-purple-900/20 dark:group-hover:bg-purple-900/30 transition-colors">
                    {isDarkMode ? (
                      <Moon
                        size={24}
                        weight="duotone"
                        className="text-purple-500"
                      />
                    ) : (
                      <Sun
                        size={24}
                        weight="duotone"
                        className="text-purple-500"
                      />
                    )}
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-base font-bold text-black dark:text-white mb-0.5">
                      Appearance
                    </div>
                    <div className="text-sm text-body dark:text-white">
                      {isDarkMode ? "Dark theme active" : "Light theme active"}
                    </div>
                  </div>
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-all duration-300 ${
                      isDarkMode
                        ? "bg-purple-500 shadow-inner"
                        : "bg-gray-200 dark:bg-gray-600"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                        isDarkMode ? "translate-x-5" : "translate-x-0"
                      }`}
                    ></div>
                  </div>
                </button>

                {/* Language */}
                <button className="flex items-center gap-4 p-5 bg-white/10 dark:bg-black/20 rounded-2xl border border-stroke/20 dark:border-strokedark/20 hover:border-primary/50 hover:bg-white/20 transition-all group backdrop-blur-sm shadow-sm">
                  <div className="bg-orange-50 p-3 rounded-xl group-hover:bg-orange-100 dark:bg-orange-900/20 dark:group-hover:bg-orange-900/30 transition-colors">
                    <Globe
                      size={24}
                      weight="duotone"
                      className="text-orange-500"
                    />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-base font-bold text-black dark:text-white mb-0.5">
                      Language
                    </div>
                    <div className="text-sm text-body dark:text-white">
                      English (US)
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                    EN
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
