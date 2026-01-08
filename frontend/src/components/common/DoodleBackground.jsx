

// A custom SVG pattern encoded as a functional component
const DoodlePattern = () => (
  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern
        id="doodle-pattern"
        x="0"
        y="0"
        width="100" // Reduced from 120 for higher density
        height="100" // Reduced from 120
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(15)"
      >
        {/* === LARGE ICONS === */}

        {/* Chat Circle */}
        <g transform="translate(10, 10) rotate(-10)">
          <circle
            cx="0"
            cy="0"
            r="8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M -4 12 Q 0 18 8 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            transform="scale(0.5)"
          />
        </g>

        {/* Paper Plane */}
        <g transform="translate(85, 20) rotate(20)">
          <path
            d="M-8 -5 L7 0 L-8 5 L-6 0 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </g>

        {/* Headphone */}
        <g transform="translate(45, 45) rotate(-15)">
          <path
            d="M-10 0 A 10 10 0 0 1 10 0 V 5 A 2 2 0 0 1 8 7 H 6 A 2 2 0 0 1 4 5 V 0 A 4 4 0 0 0 -4 0 V 5 A 2 2 0 0 1 -6 7 H -8 A 2 2 0 0 1 -10 5 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </g>

        {/* Message Bubble */}
        <g transform="translate(85, 75) rotate(5)">
          <path
            d="M10 0 C10 -5 5 -10 0 -10 C-5 -10 -10 -5 -10 0 C-10 5 -5 10 0 10 C2 10 4 9 6 8 L10 10 L9 6 C10 4 10 2 10 0 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </g>

        {/* Image Icon */}
        <g transform="translate(20, 80) rotate(10)">
          <rect
            x="-10"
            y="-8"
            width="20"
            height="16"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle
            cx="-4"
            cy="-2"
            r="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M10 8 L4 0 L0 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </g>

        {/* Play Button */}
        <g transform="translate(60, 5) rotate(30)">
          <path
            d="M-5 -5 L5 0 L-5 5 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <rect
            x="-10"
            y="-10"
            width="20"
            height="20"
            rx="5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </g>

        {/* Phone */}
        <g transform="translate(10, 45) rotate(-25)">
          <path
            d="M0 0 C0 0 5 -5 10 0 C15 5 10 10 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

        {/* === FILLER ELEMENTS (Dots, Squiggles, Stars) === */}

        {/* Center-Right Squiggle */}
        <g transform="translate(65, 30) rotate(45)">
          <path
            d="M-5 0 Q 0 -5 5 0 S 15 5 15 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.8"
          />
        </g>

        {/* Bottom Center Triangle */}
        <g transform="translate(50, 85) rotate(180)">
          <path
            d="M0 -4 L4 4 L-4 4 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.8"
          />
        </g>

        {/* Top Left Star/Sparkle */}
        <g transform="translate(30, 25)">
          <path
            d="M0 -3 L1 1 L4 0 L1 3 L0 6 L-1 3 L-4 0 L-1 1 Z"
            fill="currentColor"
            opacity="0.6"
          />
        </g>

        {/* Bottom Right Dot */}
        <circle cx="90" cy="50" r="1.5" fill="currentColor" opacity="0.6" />

        {/* Top Center-Right Dot */}
        <circle cx="40" cy="5" r="1.5" fill="currentColor" opacity="0.6" />

        {/* Left Edge Squiggle */}
        <g transform="translate(5, 65) rotate(90)">
          <path
            d="M-3 0 Q 0 -3 3 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.8"
          />
        </g>

        {/* Top Right Circles */}
        <circle
          cx="95"
          cy="5"
          r="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.6"
        />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#doodle-pattern)" />
  </svg>
);

export default function DoodleBackground({ className = "" }) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none z-0 overflow-hidden ${className}`}
    >
      {/* 
        Simplified Background Wrapper 
        - text-[#EAB308] (Amber-500) for Light Mode
        - dark:text-[#FDE047] (Yellow-300) for Dark Mode 
        - Opacity controlled via Tailwind for both modes
      */}
      <div className="w-full h-full text-[#EAB308] opacity-[0.4] dark:text-[#FDE047] dark:opacity-[0.25]">
        <DoodlePattern />
      </div>

      {/* Gradient Overlay - Subtle Fade Effect */}
      {/* Reduced intensity in dark mode significantly by lowering opacity values */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent dark:from-black/10 dark:to-transparent pointer-events-none" />
    </div>
  );
}
