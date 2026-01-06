import {
  X,
  Image as ImageIcon,
  UploadSimple,
  Check,
  Swatches,
} from "@phosphor-icons/react";
import { useRef } from "react";
import { createPortal } from "react-dom";

// Theme-coordinated colors that work in both light and dark modes
const COLORS_HEX = [
  // Warm Neutrals (matches app theme)
  "#FFF9F0", // Warm cream
  "#FAF5EB", // Light linen
  "#F5EFE6", // Soft beige
  "#E8E0D5", // Muted sand
  // Amber/Orange Accents (primary theme)
  "#FFF3E0", // Light amber
  "#FFE8CC", // Soft peach
  "#FFECD2", // Creamy orange
  // Cool Neutrals
  "#F8F9FA", // Ghost white
  "#F0F2F5", // Light gray
  "#E5E7EB", // Soft silver
  // Subtle Colors
  "#FEF3C7", // Light gold
  "#DCFCE7", // Mint fresh
  "#DBEAFE", // Sky blue
  "#F3E8FF", // Lavender mist
  "#FCE7F3", // Rose blush
];

// Gradients that complement the app's warm theme
const GRADIENTS = [
  "linear-gradient(135deg, #FFF9F0 0%, #FFE8CC 100%)", // Warm cream to peach
  "linear-gradient(135deg, #FFECD2 0%, #FCB69F 100%)", // Peach sunset
  "linear-gradient(135deg, #F5F7FA 0%, #C3CFE2 100%)", // Cool gray
  "linear-gradient(135deg, #E0C3FC 0%, #8EC5FC 100%)", // Purple to blue
  "linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)", // Soft rose
  "linear-gradient(135deg, #D4FC79 0%, #96E6A1 100%)", // Fresh green
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", // Deep purple
  "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)", // Emerald
];

// HeroPatterns SVG Data URIs
const PATTERNS = [
  {
    name: "Topography",
    value: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239C92AC' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
    preview: "🗺️",
  },
  {
    name: "Jigsaw",
    value: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239C92AC' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E")`, // Placeholder, will replace with correct Jigsaw
    preview: "🧩",
  },
  {
    name: "Overlapping Circles",
    value: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='50' cy='50' r='10'/%3E%3Ccircle cx='0' cy='0' r='10'/%3E%3Ccircle cx='0' cy='100' r='10'/%3E%3Ccircle cx='100' cy='0' r='10'/%3E%3Ccircle cx='100' cy='100' r='10'/%3E%3C/g%3E%3C/svg%3E")`,
    preview: "⭕",
  },
  {
    name: "Texture",
    value: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%239C92AC' fill-opacity='1'%3E%3Cpath fill-rule='evenodd' d='M0 0h40v40H0V0zm40 40h40v40H40V40zm0-40h2l-2 2V0zm0 4l4-4h2l-6 6V4zm0 4l8-8h2L40 10V8zm0 4L52 0h2L40 14v-2zm0 4L56 0h2L40 18v-2zm0 4L60 0h2L40 22v-2zm0 4L64 0h2L40 26v-2zm0 4L68 0h2L40 30v-2zm0 4L72 0h2L40 34v-2zm0 4L76 0h2L40 38v-2zm0 4L80 0v2L42 40h-2zm4 0L80 4v2L46 40h-2zm4 0L80 8v2L50 40h-2zm4 0L80 12v2L54 40h-2zm4 0L80 16v2L58 40h-2zm4 0L80 20v2L62 40h-2zm4 0L80 24v2L66 40h-2zm4 0L80 28v2L70 40h-2zm4 0L80 32v2L74 40h-2zm4 0L80 36v2L78 40h-2zM0 40h2L0 42v-2zm0 4l4 4h-2l-2-2v-2zm0 4l8 8h-2L0 46v-2zm0 4l12 12h-2L0 50v-2zm0 4l16 16h-2L0 54v-2zm0 4l20 20h-2L0 58v-2zm0 4l24 24h-2L0 62v-2zm0 4l28 28h-2L0 66v-2zm0 4l32 32h-2L0 70v-2zm0 4l36 36h-2L0 74v-2zm0 4l40 40h-2v-2L38 80h-2zm4 0l34 34v2H46v-2zm4 0l30 30v2H50v-2zm4 0l26 26v2H54v-2zm4 0l22 22v2H58v-2zm4 0l18 18v2H62v-2zm4 0l14 14v2H66v-2zm4 0l10 10v2H70v-2zm4 0l6 6v2H74v-2zm4 0l2 2v2H78v-2z'/%3E%3C/g%3E%3C/svg%3E")`,
    preview: "🌫️",
  },
  {
    name: "Circuit",
    value: `url("data:image/svg+xml,%3Csvg width='84' height='48' viewBox='0 0 84 48' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h12v6H0V0zm28 8h12v6H28V8zm14-8h12v6H42V0zm14 0h12v6H56V0zm0 8h12v6H56V8zM42 8h12v6H42V8zm0 16h12v6H42v-6zm14-8h12v6H56v-6zm14 0h12v6H70v-6zm0-16h12v6H70V0zM28 32h12v6H28v-6zM14 16h12v6H14v-6zM0 24h12v6H0v-6zm0 8h12v6H0v-6zm14 0h12v6H14v-6zm14 8h12v6H28v-6zm-14 0h12v6H14v-6zm28 0h12v6H42v-6zm14-8h12v6H56v-6zm0-8h12v6H56v-6zm14 8h12v6H70v-6zm0 8h12v6H70v-6zM14 24h12v6H14v-6zm14-8h12v6H28v-6zM14 8h12v6H14V8zM0 8h12v6H0V8z' fill='%239C92AC' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
    preview: "🔌",
  },
  {
    name: "Glamorous",
    value: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`,
    preview: "✨",
  },
  {
    name: "Tiles",
    value: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1h2v2H1V1zm4 0h2v2H5V1zm4 0h2v2H9V1zm4 0h2v2h-2V1zm4 0h2v2h-2V1zm-4 4h2v2h-2V5zm0 4h2v2h-2V9zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zM5 5h2v2H5V5zm0 4h2v2H5V9zm0 4h2v2H5v-2zm0 4h2v2H5v-2zM1 5h2v2H1V5zm0 4h2v2H1V9zm0 4h2v2H1v-2zm0 4h2v2H1v-2z' fill='%239C92AC' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
    preview: "🧱",
  },
  {
    name: "Cross",
    value: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
    preview: "❌",
  },
];

export default function ChatBackground({
  isOpen,
  onClose,
  onSelectBackground,
  currentBackground,
}) {
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onSelectBackground({ type: "image", value: url });
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 p-4 animate-fade-in"
      onClick={(e) => {
        // Only close if clicking the backdrop itself
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-boxdark p-6 shadow-2xl border border-stroke dark:border-strokedark animate-scale-in">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-black dark:text-white">
            Chat Background
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-boxdark-2 transition-all text-gray-500 dark:text-gray-400"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Colors Section */}
          <div>
            <h4 className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Colors
            </h4>
            <div className="grid grid-cols-5 gap-2">
              {COLORS_HEX.map((color, index) => (
                <button
                  key={index}
                  onClick={() =>
                    onSelectBackground({ type: "color", value: color })
                  }
                  className={`h-12 w-12 rounded-full shadow-sm border border-stroke dark:border-strokedark transition-transform hover:scale-110 flex items-center justify-center`}
                  style={{ backgroundColor: color }}
                >
                  {currentBackground?.value === color && (
                    <Check
                      size={20}
                      className={index === 0 ? "text-black" : "text-primary"}
                      weight="bold"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Gradients Section */}
          <div>
            <h4 className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Gradients
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {GRADIENTS.map((gradient, index) => (
                <button
                  key={index}
                  onClick={() =>
                    onSelectBackground({ type: "gradient", value: gradient })
                  }
                  className={`h-12 w-full rounded-lg shadow-sm border border-stroke dark:border-strokedark transition-transform hover:scale-105 flex items-center justify-center`}
                  style={{ background: gradient }}
                >
                  {currentBackground?.value === gradient && (
                    <Check
                      size={20}
                      className="text-white drop-shadow-md"
                      weight="bold"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Patterns Section */}
          <div>
            <h4 className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Patterns
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {PATTERNS.map((pattern, index) => (
                <button
                  key={index}
                  onClick={() =>
                    onSelectBackground({
                      type: "pattern",
                      value: pattern.value,
                      size: pattern.size,
                    })
                  }
                  className={`h-20 w-full rounded-lg shadow-sm border transition-transform hover:scale-105 flex flex-col items-center justify-center gap-0.5 relative overflow-hidden ${
                    currentBackground?.value === pattern.value
                      ? "border-primary"
                      : "border-stroke dark:border-strokedark bg-gray-50 dark:bg-boxdark-2"
                  }`}
                  style={{
                    maskImage: pattern.value,
                    WebkitMaskImage: pattern.value,
                    maskRepeat: "repeat",
                    WebkitMaskRepeat: "repeat",
                    backgroundColor: "var(--pattern-primary)",
                  }}
                ></button>
              ))}
            </div>
          </div>

          {/* Custom Image Section */}
          <div>
            <h4 className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Custom Image
            </h4>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 p-6 transition-colors hover:bg-primary/10"
            >
              <UploadSimple size={32} className="mb-2 text-primary" />
              <span className="text-sm font-medium text-primary">
                Upload from Device
              </span>
            </button>
          </div>

          {/* Reset Button */}
          <button
            onClick={() => onSelectBackground(null)}
            className="w-full rounded-xl bg-white/5 dark:bg-white/5 py-3 text-center text-sm font-bold hover:bg-white/10 transition-all dark:text-white border border-white/10"
          >
            Reset to Default
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
