import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Smiley } from "@phosphor-icons/react";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

export default function EmojiPicker({ onSelect }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCoords, setPickerCoords] = useState({ bottom: 0, right: 0 });
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Position it ABOVE the button with some margin
      setPickerCoords({
        bottom: window.innerHeight - rect.top + 10,
        right: window.innerWidth - rect.right,
      });
    }
  };

  const handleTrigger = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!pickerOpen) {
      updateCoords();
    }
    setPickerOpen((prev) => !prev);
  };

  const handleEmojiSelect = (emoji) => {
    // emoji is the object from emoji-mart
    const emojiChar = emoji.native || emoji.id || emoji;
    if (onSelect && emojiChar) {
      onSelect(emojiChar);
    }
    // setPickerOpen(false); // Removed to allow multiple emoji selection
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      // If we clicked outside the picker and outside the trigger button
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setPickerOpen(false);
      }
    };

    const handleScrollResize = () => {
      if (pickerOpen) {
        updateCoords();
      }
    };

    if (pickerOpen) {
      // Use mousedown to catch clicks before they trigger other things
      document.addEventListener("mousedown", handleOutsideClick);
      window.addEventListener("scroll", handleScrollResize, true);
      window.addEventListener("resize", handleScrollResize);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScrollResize, true);
      window.removeEventListener("resize", handleScrollResize);
    };
  }, [pickerOpen]);

  return (
    <div className="relative flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleTrigger}
        className="text-body/70 hover:text-primary transition-all duration-200 focus-visible:outline-none focus:scale-110 active:scale-95 rounded-full p-1.5 bg-gray/50 dark:bg-white/5"
        aria-label={pickerOpen ? "Close emoji picker" : "Open emoji picker"}
        aria-expanded={pickerOpen}
      >
        <Smiley
          size={22}
          weight={pickerOpen ? "fill" : "duotone"}
          className={`${
            pickerOpen ? "text-primary" : "text-body dark:text-bodydark"
          }`}
        />
      </button>

      {pickerOpen &&
        createPortal(
          <div
            ref={pickerRef}
            className="fixed z-[999999] animate-slide-in-bottom shadow-2xl rounded-2xl overflow-hidden border border-stroke/20 dark:border-strokedark/20"
            style={{
              bottom: `${pickerCoords.bottom}px`,
              right: `${pickerCoords.right}px`,
              width: "352px", // Standard Emoji Mart width
              maxHeight: "435px",
            }}
            role="dialog"
            aria-label="Emoji picker"
          >
            <Picker
              data={data}
              theme="auto"
              onEmojiSelect={handleEmojiSelect}
              previewPosition="none"
              skinTonePosition="none"
              searchPosition="top"
              navPosition="bottom"
              perLine={8}
              maxFrequentRows={1}
            />
          </div>,
          document.body
        )}
    </div>
  );
}
