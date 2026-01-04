import { createContext, useContext, useCallback } from "react";
import toast from "react-hot-toast";
import {
  CheckCircle,
  XCircle,
  WarningCircle,
  Info,
  X,
} from "@phosphor-icons/react";

const ToastContext = createContext();

// Custom Toast Component with beautiful styling
const CustomToast = ({ t, type, title, message, onDismiss }) => {
  const icons = {
    success: <CheckCircle size={24} weight="fill" className="text-success" />,
    error: <XCircle size={24} weight="fill" className="text-danger" />,
    warning: <WarningCircle size={24} weight="fill" className="text-warning" />,
    info: <Info size={24} weight="fill" className="text-primary" />,
  };

  const bgColors = {
    success: "bg-success/10 border-success/30",
    error: "bg-danger/10 border-danger/30",
    warning: "bg-warning/10 border-warning/30",
    info: "bg-primary/10 border-primary/30",
  };

  const progressColors = {
    success: "bg-success",
    error: "bg-danger",
    warning: "bg-warning",
    info: "bg-primary",
  };

  return (
    <div
      className={`${
        t.visible ? "animate-slide-in-right" : "animate-fade-out"
      } max-w-md w-full pointer-events-auto flex flex-col overflow-hidden rounded-xl shadow-xl border backdrop-blur-md ${
        bgColors[type]
      } bg-white/90 dark:bg-boxdark/90`}
    >
      <div className="flex items-start p-4 gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <p className="text-sm font-semibold text-black dark:text-white mb-0.5">
              {title}
            </p>
          )}
          <p className="text-sm text-body dark:text-bodydark">{message}</p>
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            toast.dismiss(t.id);
            onDismiss?.();
          }}
          className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <X size={16} className="text-body dark:text-bodydark" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-black/5 dark:bg-white/5">
        <div
          className={`h-full ${progressColors[type]} animate-toast-progress`}
          style={{
            animation: `toast-progress 4s linear forwards`,
          }}
        />
      </div>
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const showToast = useCallback((type, message, options = {}) => {
    const { title, duration = 4000, onDismiss } = options;

    toast.custom(
      (t) => (
        <CustomToast
          t={t}
          type={type}
          title={title}
          message={message}
          onDismiss={onDismiss}
        />
      ),
      {
        duration,
        position: "top-right",
      }
    );
  }, []);

  const success = useCallback(
    (message, options = {}) => {
      showToast("success", message, { title: "Success", ...options });
    },
    [showToast]
  );

  const error = useCallback(
    (message, options = {}) => {
      showToast("error", message, { title: "Error", ...options });
    },
    [showToast]
  );

  const warning = useCallback(
    (message, options = {}) => {
      showToast("warning", message, { title: "Warning", ...options });
    },
    [showToast]
  );

  const info = useCallback(
    (message, options = {}) => {
      showToast("info", message, { title: "Info", ...options });
    },
    [showToast]
  );

  const promise = useCallback((promiseFn, messages = {}) => {
    const {
      loading = "Loading...",
      success = "Success!",
      error = "Something went wrong",
    } = messages;

    return toast.promise(
      promiseFn,
      {
        loading: (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>{loading}</span>
          </div>
        ),
        success: (data) => (
          <div className="flex items-center gap-2">
            <CheckCircle size={20} weight="fill" className="text-success" />
            <span>
              {typeof success === "function" ? success(data) : success}
            </span>
          </div>
        ),
        error: (err) => (
          <div className="flex items-center gap-2">
            <XCircle size={20} weight="fill" className="text-danger" />
            <span>{typeof error === "function" ? error(err) : error}</span>
          </div>
        ),
      },
      {
        style: {
          background: "var(--toast-bg, white)",
          color: "var(--toast-color, black)",
          borderRadius: "12px",
          padding: "12px 16px",
        },
      }
    );
  }, []);

  const dismiss = useCallback((toastId) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }, []);

  const value = {
    toast: showToast,
    success,
    error,
    warning,
    info,
    promise,
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
};

export default ToastContext;
