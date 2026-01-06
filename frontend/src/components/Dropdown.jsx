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
        className="text-gray-500 dark:text-white hover:text-primary transition-colors"
        ref={trigger}
        onClick={() => setDropdown((prev) => !prev)}
        aria-label="More options"
      >
        <DotsThreeVertical size={22} weight="bold" />
      </button>

      <div
        ref={dropDown}
        className={`absolute right-0 top-full mt-2 w-44 rounded-lg border border-stroke bg-white/95 dark:bg-boxdark/95 p-2 shadow-xl backdrop-blur-md dark:border-strokedark z-[100] ${
          dropdown ? "block" : "hidden"
        }`}
      >
        <div className="flex flex-col gap-1">
          {onOpenBackground && (
            <button
              onClick={() => {
                onOpenBackground();
                setDropdown(false);
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors duration-200 hover:bg-gray hover:text-primary dark:hover:bg-boxdark-2"
            >
              <ImageIcon size={18} weight="duotone" />
              Background
            </button>
          )}

          {onEdit && (
            <button
              onClick={() => {
                onEdit();
                setDropdown(false);
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors duration-200 hover:bg-gray hover:text-primary dark:hover:bg-boxdark-2"
            >
              <PencilSimple size={18} weight="duotone" />
              Edit
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => {
                onDelete();
                setDropdown(false);
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors duration-200 hover:bg-gray hover:text-danger dark:hover:bg-boxdark-2"
            >
              <Trash size={18} weight="duotone" />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dropdown;
