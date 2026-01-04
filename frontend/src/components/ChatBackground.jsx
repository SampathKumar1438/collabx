import {
  X,
  Image as ImageIcon,
  UploadSimple,
  Check,
} from "@phosphor-icons/react";
import { useRef } from "react";

const COLORS = [
  "bg-white",
  "bg-gray-100",
  "bg-red-50",
  "bg-orange-50",
  "bg-green-50",
  "bg-blue-50",
  "bg-indigo-50",
  "bg-purple-50",
  "bg-pink-50",
  "bg-slate-50",
];

const COLORS_HEX = [
  "#ffffff",
  "#f3f4f6", // gray-100
  "#fef2f2", // red-50
  "#fff7ed", // orange-50
  "#f0fdf4", // green-50
  "#eff6ff", // blue-50
  "#eef2ff", // indigo-50
  "#faf5ff", // purple-50
  "#fdf2f8", // pink-50
  "#f8fafc", // slate-50
];

const GRADIENTS = [
  "linear-gradient(to bottom right, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)",
  "linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)",
  "linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)",
  "linear-gradient(120deg, #fccb90 0%, #d57eeb 100%)",
  "linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)",
  "linear-gradient(to top, #30cfd0 0%, #330867 100%)",
  "linear-gradient(to top, #5f72bd 0%, #9b23ea 100%)",
  "linear-gradient(to top, #fbc2eb 0%, #a6c1ee 100%)",
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white/20 dark:bg-black/40 p-6 shadow-2xl border border-white/20 dark:border-strokedark/20 backdrop-blur-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-black dark:text-white">
            Chat Background
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10 dark:hover:bg-white/5 transition-all"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar pb-2">
          {/* Colors Section */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
              Colors
            </h4>
            <div className="grid grid-cols-5 gap-3">
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
            <h4 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
              Gradients
            </h4>
            <div className="grid grid-cols-4 gap-3">
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

          {/* Custom Image Section */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
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
    </div>
  );
}
