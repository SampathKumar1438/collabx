import React, { useState, useEffect } from "react";
import { Users } from "@phosphor-icons/react";

const Avatar = ({
  src,
  alt = "Avatar",
  size = "md", // sm, md, lg, xl, xxl
  isOnline = false,
  isGroup = false,
  className = "",
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
    xxl: "w-24 h-24 md:w-32 md:h-32", // Responsive for profile page
    custom: "",
  };

  const iconSizes = {
    sm: 18,
    md: 24,
    lg: 28,
    xl: 36,
    xxl: 48,
    custom: 28,
  };

  const statusSizeClasses = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
    xl: "w-4 h-4",
    xxl: "w-5 h-5",
    custom: "w-3 h-3",
  };

  const containerClass = size === "custom" ? className : sizeClasses[size];
  const showFallback = !src || imageError;

  return (
    <div
      className={`relative inline-block ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div
        className={`
          ${containerClass} 
          rounded-full overflow-hidden 
          ${
            showFallback
              ? "bg-gradient-to-b from-[#E8E0D5] to-[#D0C8BD] dark:from-[#4A4A4A] dark:to-[#3A3A3A] flex items-center justify-center"
              : "border border-stroke/30 dark:border-strokedark/30"
          }
          ${className}
        `}
      >
        {!showFallback ? (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center relative">
            {isGroup ? (
              <Users
                weight="fill"
                className="w-[80%] h-[80%] text-[#C5BDB2] dark:text-[#5A5A5A]"
              />
            ) : (
              <>
                {/* WhatsApp-style silhouette background */}
                <div className="absolute inset-0 flex items-end justify-center overflow-hidden">
                  {/* Person silhouette - body (positioned at bottom) */}
                  <div
                    className="absolute bottom-0 w-[70%] h-[45%] rounded-t-full bg-[#C5BDB2] dark:bg-[#5A5A5A]"
                    style={{ transform: "translateY(15%)" }}
                  />
                </div>
                {/* Person silhouette - head */}
                <div
                  className="absolute rounded-full bg-[#C5BDB2] dark:bg-[#5A5A5A]"
                  style={{
                    width: "35%",
                    height: "35%",
                    top: "22%",
                  }}
                />
              </>
            )}
          </div>
        )}
      </div>

      {isOnline && (
        <span
          className={`
            absolute bottom-0 right-0 
            ${statusSizeClasses[size]} 
            bg-success rounded-full 
            border-2 border-white dark:border-black/50
            shadow-sm
          `}
        />
      )}
    </div>
  );
};

export default Avatar;
