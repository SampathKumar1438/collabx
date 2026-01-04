import { Warning, X, Trash, SignOut, Broom } from "@phosphor-icons/react";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "danger", // "danger" | "primary" | "warning"
  isLoading = false,
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    const iconProps = { size: 28, weight: "fill" };
    if (
      title.toLowerCase().includes("remove") ||
      title.toLowerCase().includes("delete")
    ) {
      return <Trash {...iconProps} />;
    }
    if (title.toLowerCase().includes("leave")) {
      return <SignOut {...iconProps} />;
    }
    if (title.toLowerCase().includes("clear")) {
      return <Broom {...iconProps} />;
    }
    return <Warning {...iconProps} />;
  };

  // Get explicit inline styles for guaranteed visibility
  const getVariantStyles = () => {
    switch (confirmVariant) {
      case "danger":
        return {
          iconBgColor: "#EF4444", // red-500
          buttonBgColor: "#EF4444",
          buttonHoverColor: "#DC2626", // red-600
        };
      case "warning":
        return {
          iconBgColor: "#F59E0B", // amber-500
          buttonBgColor: "#F59E0B",
          buttonHoverColor: "#D97706", // amber-600
        };
      case "primary":
      default:
        return {
          iconBgColor: "#FFAB00", // primary
          buttonBgColor: "#FFAB00",
          buttonHoverColor: "#E09900",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
        }}
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Modal */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "white",
          borderRadius: "20px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          animation: "modalFadeIn 0.2s ease-out",
        }}
        className="dark:bg-boxdark"
      >
        {/* Top accent bar */}
        <div
          style={{
            height: "4px",
            width: "100%",
            backgroundColor: styles.iconBgColor,
          }}
        />

        {/* Close Button */}
        <button
          onClick={!isLoading ? onClose : undefined}
          disabled={isLoading}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            padding: "8px",
            borderRadius: "50%",
            backgroundColor: "#F3F4F6",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background-color 0.2s",
          }}
          className="hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <X size={16} weight="bold" style={{ color: "#6B7280" }} />
        </button>

        {/* Content */}
        <div style={{ padding: "32px 24px" }}>
          {/* Icon */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                padding: "16px",
                borderRadius: "50%",
                backgroundColor: styles.iconBgColor,
                boxShadow: `0 10px 25px ${styles.iconBgColor}50`,
              }}
            >
              <span style={{ color: "white", display: "flex" }}>
                {getIcon()}
              </span>
            </div>
          </div>

          {/* Title */}
          <h3
            style={{
              fontSize: "20px",
              fontWeight: "700",
              textAlign: "center",
              marginBottom: "12px",
              color: "#1F2937",
            }}
            className="dark:text-white"
          >
            {title}
          </h3>

          {/* Message */}
          <p
            style={{
              textAlign: "center",
              fontSize: "14px",
              lineHeight: "1.6",
              marginBottom: "28px",
              color: "#6B7280",
            }}
            className="dark:text-gray-300"
          >
            {message}
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "12px" }}>
            {/* Cancel Button */}
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: "14px 20px",
                borderRadius: "12px",
                fontWeight: "600",
                fontSize: "14px",
                backgroundColor: "#F3F4F6",
                color: "#374151",
                border: "1px solid #E5E7EB",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.5 : 1,
                transition: "all 0.2s",
              }}
              className="hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              {cancelText}
            </button>

            {/* Confirm Button */}
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: "14px 20px",
                borderRadius: "12px",
                fontWeight: "600",
                fontSize: "14px",
                backgroundColor: styles.buttonBgColor,
                color: "white",
                border: "none",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
                boxShadow: `0 4px 14px ${styles.buttonBgColor}40`,
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
              onMouseEnter={(e) => {
                if (!isLoading)
                  e.target.style.backgroundColor = styles.buttonHoverColor;
              }}
              onMouseLeave={(e) => {
                if (!isLoading)
                  e.target.style.backgroundColor = styles.buttonBgColor;
              }}
            >
              {isLoading ? (
                <>
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "white",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <span>Processing...</span>
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>

        {/* Keyframe styles */}
        <style>{`
          @keyframes modalFadeIn {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(10px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
