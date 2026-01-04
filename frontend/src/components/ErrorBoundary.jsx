import { Component } from "react";
import { WarningOctagon, ArrowClockwise } from "@phosphor-icons/react";

/**
 * ErrorBoundary - Catches JavaScript errors during rendering and displays a fallback UI
 * Used with React.lazy() to handle chunk loading failures gracefully
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    // Reload the page for chunk loading errors
    if (this.state.error?.message?.includes("Loading chunk")) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-whiten dark:bg-boxdark-2 transition-colors duration-200 p-6">
          <div className="max-w-md w-full text-center">
            {/* Error Icon */}
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 rounded-full bg-danger/10 flex items-center justify-center">
                <WarningOctagon
                  size={48}
                  weight="duotone"
                  className="text-danger"
                />
              </div>
            </div>

            {/* Error Message */}
            <h1 className="text-2xl font-bold text-black dark:text-white mb-3">
              Something went wrong
            </h1>
            <p className="text-body dark:text-bodydark mb-6">
              {this.state.error?.message?.includes("Loading chunk")
                ? "Failed to load the page. This might be due to a network issue or a new update. Please try refreshing."
                : "An unexpected error occurred. Please try again or refresh the page."}
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-opacity-90 transition-colors"
              >
                <ArrowClockwise size={20} />
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="inline-flex items-center gap-2 px-6 py-3 border border-stroke dark:border-strokedark rounded-lg font-medium hover:bg-gray-2 dark:hover:bg-boxdark transition-colors text-black dark:text-white"
              >
                Go Home
              </button>
            </div>

            {/* Technical Details (collapsible) */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-8 text-left bg-gray-2 dark:bg-boxdark-2 rounded-lg p-4">
                <summary className="cursor-pointer text-sm font-medium text-body dark:text-bodydark">
                  Technical Details
                </summary>
                <pre className="mt-2 text-xs text-danger overflow-auto max-h-40 p-2 bg-white dark:bg-boxdark rounded">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
