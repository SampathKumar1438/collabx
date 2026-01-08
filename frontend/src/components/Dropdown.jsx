import { useRef, useEffect, useState } from "react";
import {
  DotsThreeVertical,
  PencilSimple,
  Trash,
  ImageSquare as ImageIcon,
} from "@phosphor-icons/react";

function Dropdown({ onEdit, onDelete, onOpenBackground }) {
  const [dropdown, setDropdown] = useState(false);
  const trigger = useRef(null);
  const dropDown = useRef(null);

  // Close on click outside
  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (
        !dropdown ||
        trigger.current.contains(target) ||
        dropDown.current.contains(target)
      )
        return;
      setDropdown(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  }, [dropdown]);

  // Close on Esc key
  useEffect(() => {
    const keyHandler = ({ keyCode }) => {
      if (!dropdown || keyCode !== 27) return;
      setDropdown(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  }, [dropdown]);

  return (
    <div className="relative flex">
      <button
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 ${
          dropdown
            ? "bg-primary/10 text-primary"
            : "text-gray-500 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 hover:text-primary"
        }`}
        ref={trigger}
        onClick={() => setDropdown((prev) => !prev)}
        aria-label="More options"
      >
        <DotsThreeVertical size={22} weight={dropdown ? "fill" : "bold"} />
      </button>

      <div
        ref={dropDown}
        className={`absolute right-0 top-full mt-3 w-52 rounded-2xl border border-white/20 dark:border-white/10 bg-white/80 dark:bg-black/80 p-2 shadow-2xl backdrop-blur-xl z-[100] transform transition-all duration-200 origin-top-right ${
          dropdown
            ? "translate-y-0 opacity-100 scale-100 visible"
            : "translate-y-2 opacity-0 scale-95 invisible"
        }`}
      >
        <div className="flex flex-col gap-1">
          {onOpenBackground && (
            <button
              onClick={() => {
                onOpenBackground();
                setDropdown(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors duration-200 hover:bg-primary/10 hover:text-primary dark:hover:bg-white/10"
            >
              <ImageIcon size={18} weight="duotone" />
              Change Background
            </button>
          )}

          {onEdit && (
            <button
              onClick={() => {
                onEdit();
                setDropdown(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors duration-200 hover:bg-primary/10 hover:text-primary dark:hover:bg-white/10"
            >
              <PencilSimple size={18} weight="duotone" />
              Edit Message
            </button>
          )}

          {onDelete && (
            <>
              <div className="h-px bg-gray-200 dark:bg-white/10 mx-2 my-1"></div>
              <button
                onClick={() => {
                  onDelete();
                  setDropdown(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-red-500 transition-colors duration-200 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash size={18} weight="duotone" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dropdown;
