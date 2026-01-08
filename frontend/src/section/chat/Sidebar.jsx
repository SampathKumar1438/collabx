import {
  Chat,
  SignOut,
  UserCircle,
  Users,
  Robot,
} from "@phosphor-icons/react";
import DarkModeToggle from "../../components/DarkModeToggle";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Logo from "../../assets/collabx.png";
import { motion } from "framer-motion";

const NAVIGATION = [
  {
    key: 0,
    title: "DMs",
    icon: <Chat size={24} weight="duotone" />,
    route: "/messages",
    matchPaths: ["/messages"],
  },
  {
    key: 1,
    title: "Groups",
    icon: <Users size={24} weight="duotone" />,
    route: "/groups",
    matchPaths: ["/groups"],
  },
  {
    key: 2,
    title: "AI",
    icon: <Robot size={24} weight="duotone" />,
    route: "/ai-chat",
    matchPaths: ["/ai-chat"],
  },
  {
    key: 3,
    title: "Profile",
    icon: <UserCircle size={24} weight="duotone" />,
    route: "/profile",
    matchPaths: ["/profile"],
  },
  // {
  //   key: 4,
  //   title: "More",
  //   icon: <DotsThreeVertical size={24} weight="duotone" />,
  //   route: null,
  //   matchPaths: [],
  // },
];

function Sidebar({ onNavigate, currentView = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  // Determine selected based on current URL path
  const getSelectedFromPath = () => {
    const path = location.pathname;
    for (const nav of NAVIGATION) {
      if (nav.matchPaths.some((mp) => path.startsWith(mp))) {
        return nav.key;
      }
    }
    return currentView;
  };

  const selected = getSelectedFromPath();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleClick = (key, route) => {
    // Navigate to route if it exists
    if (route) {
      navigate(route);
    }

    // Call onNavigate for parent component callback
    if (onNavigate) {
      onNavigate(key);
    }
  };

  return (
    <div className="flex h-full md:h-screen flex-col border-r border-stroke/20 gradient-bg-sidebar p-2 md:p-3 dark:border-strokedark/20 backdrop-blur-md transition-all duration-200">
      <div className="flex flex-col items-center space-y-4 md:space-y-6">
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="hidden md:flex flex-col space-y-2 text-center"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 mx-auto rounded-full shadow-lg overflow-hidden border-2 border-white/50 dark:border-white/10">
            <img
              src={Logo}
              alt="CollabX"
              className="w-full h-full object-contain"
            />
          </div>
        </motion.div>

        {NAVIGATION.map(({ key, icon, title, route }) => (
          <motion.div
            key={key}
            whileHover={{ scale: 1.05, x: 2 }}
            whileTap={{ scale: 0.95 }}
            className="group flex cursor-pointer flex-col space-y-1 md:space-y-2 text-center"
            onClick={() => handleClick(key, route)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleClick(key, route)}
            aria-label={title}
          >
            <div
              className={`mx-auto rounded-xl p-2 md:p-2.5 transition-all duration-300 relative overflow-hidden ${
                selected === key
                  ? "shadow-lg shadow-primary/40 ring-2 ring-primary ring-offset-2 ring-offset-transparent"
                  : "hover:bg-white/50 dark:hover:bg-boxdark/50"
              }`}
            >
              {selected === key && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute inset-0 bg-gradient-to-br from-primary to-secondary"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <span
                className={`relative z-10 transition-colors duration-200 ${
                  selected === key
                    ? "text-white"
                    : "text-body dark:text-white group-hover:text-primary"
                }`}
              >
                {icon}
              </span>
            </div>
            <span
              className={`text-[10px] md:text-sm font-bold tracking-wide transition-colors duration-200 ${
                selected === key
                  ? "text-primary"
                  : "text-gray-600 dark:text-white group-hover:text-black dark:group-hover:text-white"
              }`}
            >
              {title}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center justify-end">
        <div className="flex flex-col items-center space-y-3 md:space-y-4">
          <div className="scale-90 md:scale-100">
            <DarkModeToggle />
          </div>
          <motion.button
            whileHover={{ scale: 1.1, color: "#FB5454" }}
            whileTap={{ scale: 0.9 }}
            onClick={handleLogout}
            className="flex items-center justify-center rounded-lg border border-stroke/50 bg-white/30 p-1.5 md:p-2 backdrop-blur-sm transition-all dark:border-strokedark/50 dark:bg-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
            aria-label="Sign out"
          >
            <SignOut
              size={20}
              weight="duotone"
              className="md:w-6 md:h-6 text-body dark:text-white hover:text-danger dark:hover:text-danger"
            />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
