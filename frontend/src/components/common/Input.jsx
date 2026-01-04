import React, { useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";

const Input = ({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder,
  error,
  icon: Icon,
  disabled = false,
  required = false,
  className = "",
  helperText,
  minLength,
  maxLength,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  if (props.multiline) {
    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label className="block mb-2 text-sm font-medium text-black dark:text-white">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          rows={props.rows || 4}
          className={`w-full rounded-xl border bg-transparent py-3 px-4 outline-none transition-all duration-200
            disabled:cursor-not-allowed disabled:opacity-50 resize-none
            ${
              error
                ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                : "border-stroke dark:border-strokedark focus:border-primary focus:ring-1 focus:ring-primary"
            }
            dark:bg-boxdark-2 dark:text-white`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500 animate-fadeIn">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block mb-2 text-sm font-medium text-black dark:text-white">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon size={20} />
          </span>
        )}
        <input
          type={inputType}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          className={`w-full rounded-xl border bg-transparent py-3 
            ${Icon ? "pl-12" : "pl-4"} 
            ${isPassword ? "pr-12" : "pr-4"} 
            outline-none transition-all duration-200
            disabled:cursor-not-allowed disabled:opacity-50
            ${
              error
                ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                : "border-stroke dark:border-strokedark focus:border-primary focus:ring-1 focus:ring-primary"
            }
            dark:bg-boxdark-2 dark:text-white`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {showPassword ? <Eye size={20} /> : <EyeSlash size={20} />}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-500 animate-fadeIn">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default Input;
