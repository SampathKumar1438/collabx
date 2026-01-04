import React, { useEffect, useRef } from "react";
import { X } from "@phosphor-icons/react";
import ReactDOM from "react-dom";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-md", // max-w-lg, max-w-xl, etc
}) => {
  const modalRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden"; // Prevent scrolling
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Close on click outside
  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className={`
          w-full ${maxWidth} 
          bg-white dark:bg-boxdark 
          rounded-xl shadow-2xl 
          flex flex-col 
          max-h-[90vh] 
          animate-scale-in
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stroke dark:border-strokedark">
          <h3 className="text-lg font-bold text-black dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-boxdark-2 transition-colors text-body dark:text-bodydark"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-stroke dark:border-strokedark bg-gray-50 dark:bg-boxdark-2/50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};

export default Modal;
