import React from "react";
import { CircleNotch } from "@phosphor-icons/react";

const Button = ({
  children,
  onClick,
  type = "button",
  variant = "primary", // primary, secondary, danger, ghost, outline
  size = "md", // sm, md, lg
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  className = "",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

  const variants = {
    primary:
      "bg-primary text-white hover:bg-opacity-90 shadow-lg hover:shadow-xl",
    secondary:
      "bg-gray-100 text-black hover:bg-gray-200 dark:bg-boxdark-2 dark:text-white dark:hover:bg-boxdark",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-md",
    ghost: "bg-transparent text-primary hover:bg-primary/10",
    outline:
      "bg-transparent border border-primary text-primary hover:bg-primary hover:text-white",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <CircleNotch size={20} className="animate-spin" />
          {children}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {Icon && <Icon size={20} weight="bold" />}
          {children}
        </div>
      )}
    </button>
  );
};

export default Button;
