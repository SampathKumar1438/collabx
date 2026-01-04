import { Spinner } from "@phosphor-icons/react";

/**
 * PageLoader - A beautiful full-screen loading component for lazy-loaded pages
 * Used as a fallback in React.Suspense when pages are being loaded
 */
export default function PageLoader({ message = "Loading..." }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white/10 dark:bg-black/20 backdrop-blur-md transition-colors duration-200">
      <div className="flex flex-col items-center gap-4">
        {/* Animated Logo/Spinner Container */}
        <div className="relative">
          {/* Outer ring */}
          <div className="w-16 h-16 rounded-full border-4 border-stroke dark:border-strokedark" />

          {/* Spinning gradient ring */}
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-primary animate-spin" />

          {/* Inner pulse */}
          <div className="absolute inset-2 w-12 h-12 rounded-full bg-primary/10 animate-pulse flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-primary/30 animate-ping" />
          </div>
        </div>

        {/* Loading Text */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-medium text-black dark:text-white animate-pulse">
            {message}
          </p>

          {/* Animated dots */}
          <div className="flex gap-1">
            <span
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ComponentLoader - A smaller loading indicator for lazy-loaded components
 * Used within pages for smaller sections
 */
export function ComponentLoader({ size = "md" }) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div
        className={`${sizes[size]} rounded-full border-stroke dark:border-strokedark border-t-primary animate-spin`}
      />
    </div>
  );
}

/**
 * SectionLoader - A loader with a subtle background for section lazy loading
 */
export function SectionLoader({ height = "h-64" }) {
  return (
    <div
      className={`${height} w-full flex items-center justify-center bg-white/5 dark:bg-black/10 rounded-lg backdrop-blur-sm`}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-stroke dark:border-strokedark" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
        </div>
        <p className="text-sm text-body dark:text-bodydark">Loading...</p>
      </div>
    </div>
  );
}
