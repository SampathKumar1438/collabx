import { Moon, Sun } from "@phosphor-icons/react";
import { useColorMode } from "../hooks/useColorMode";

function DarkModeToggle() {
  const [colorMode, setColorMode] = useColorMode();

  const toggleColorMode = () => {
    setColorMode(colorMode === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleColorMode}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-stroke dark:bg-strokedark transition-all duration-300 hover:bg-opacity-80"
      aria-label={`Switch to ${colorMode === "dark" ? "light" : "dark"} mode`}
    >
      <span className="text-warning dark:hidden">
        <Sun size={24} weight="duotone" />
      </span>
      <span className="hidden dark:inline-block text-white">
        <Moon size={24} weight="duotone" />
      </span>
    </button>
  );
}

export default DarkModeToggle;
