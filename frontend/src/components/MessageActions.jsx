import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  DotsThreeVertical,
  PencilSimple,
  PushPin,
  ArrowArcLeft,
  Trash,
  Smiley,
  PushPinSlash,
} from "@phosphor-icons/react";

function MessageActions({
  isOwn,
  onEdit,
  onPin,
  onReply,
  onDelete,
  onReact,
  isPinned,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const buttonRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({});

  // Calculate position when menu opens
  useEffect(() => {
    if (showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Default: Open upwards (bottom-full) to avoid being covered by keyboard on mobile
      // But check if it fits.
      // Better strategy: "Smart" positioning based on screen space.

      const menuHeight = 260; // Approximate height
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top, bottom;

      // Prefer opening DOWN if space permits, otherwise UP
      if (spaceBelow > menuHeight || spaceBelow > spaceAbove) {
        top = rect.bottom + 5;
        bottom = "auto";
      } else {
        bottom = window.innerHeight - rect.top + 5;
        top = "auto";
      }

      setMenuStyle({
        position: "fixed",
        top: top !== "auto" ? top : undefined,
        bottom: bottom !== "auto" ? bottom : undefined,
        left: isOwn ? "auto" : rect.left,
        right: isOwn ? window.innerWidth - rect.right : "auto",
        zIndex: 9999,
      });
    }
  }, [showMenu, isOwn]);

  const handleAction = (action) => {
    if (action) action();
    setShowMenu(false);
  };

  const MenuContent = (
    <>
      {/* Backdrop to close menu */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(false);
        }}
      />

      {/* Actions Menu */}
      <div
        className="min-w-[180px] bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded-lg shadow-xl overflow-hidden animate-fade-in"
        style={menuStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col py-1">
          <button
            onClick={() => handleAction(onReply)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-black dark:text-white hover:bg-gray-2 dark:hover:bg-boxdark-2 transition-colors text-left"
          >
            <ArrowArcLeft size={18} weight="duotone" />
            <span>Reply</span>
          </button>

          <button
            onClick={() => handleAction(onReact)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-black dark:text-white hover:bg-gray-2 dark:hover:bg-boxdark-2 transition-colors text-left"
          >
            <Smiley size={18} weight="duotone" />
            <span>React</span>
          </button>

          <button
            onClick={() => handleAction(onPin)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-black dark:text-white hover:bg-gray-2 dark:hover:bg-boxdark-2 transition-colors text-left"
          >
            {isPinned ? (
              <PushPinSlash size={18} weight="duotone" />
            ) : (
              <PushPin size={18} weight="duotone" />
            )}
            <span>{isPinned ? "Unpin message" : "Pin message"}</span>
          </button>

          {isOwn && (
            <>
              <div className="my-1 border-t border-stroke dark:border-strokedark" />

              {onEdit && (
                <button
                  onClick={() => handleAction(onEdit)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-black dark:text-white hover:bg-gray-2 dark:hover:bg-boxdark-2 transition-colors text-left"
                >
                  <PencilSimple size={18} weight="duotone" />
                  <span className="text-nowrap">Edit message</span>
                </button>
              )}

              <button
                onClick={() => handleAction(onDelete)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors text-left"
              >
                <Trash size={18} weight="duotone" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="p-1.5 rounded-full hover:bg-white/10 dark:hover:bg-white/10 text-gray-500 dark:text-white hover:text-primary transition-colors flex items-center justify-center"
        aria-label="Message actions"
      >
        <DotsThreeVertical size={20} weight="bold" />
      </button>

      {showMenu && createPortal(MenuContent, document.body)}
    </div>
  );
}

export default MessageActions;
