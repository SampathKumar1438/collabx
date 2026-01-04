import React from "react";
import { X, WarningCircle, CheckCircle, Info } from "@phosphor-icons/react";

const Alert = ({
  type = "error", // error, success, info, warning
  message,
  onClose,
  className = "",
}) => {
  if (!message) return null;

  const styles = {
    error: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-700 dark:text-red-400",
      icon: WarningCircle,
    },
    success: {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-700 dark:text-green-400",
      icon: CheckCircle,
    },
    warning: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "border-yellow-200 dark:border-yellow-800",
      text: "text-yellow-700 dark:text-yellow-400",
      icon: WarningCircle,
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-400",
      icon: Info,
    },
  };

  const style = styles[type];
  const Icon = style.icon;

  return (
    <div
      className={`
        flex items-start gap-3 p-4 mb-4 rounded-lg border 
        ${style.bg} ${style.border} 
        ${className} animate-fade-in
      `}
    >
      <div className={`flex-shrink-0 mt-0.5 ${style.text}`}>
        <Icon size={20} weight="fill" />
      </div>
      <div className={`flex-1 text-sm font-medium ${style.text}`}>
        {message}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={`flex-shrink-0 ml-2 hover:bg-black/5 rounded-full p-0.5 ${style.text}`}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default Alert;
