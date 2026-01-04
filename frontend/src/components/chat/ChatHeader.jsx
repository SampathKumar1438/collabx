import { useState, useEffect, useRef } from "react";
import {
  Phone,
  VideoCamera,
  User,
  Users,
  CaretLeft,
  MagnifyingGlass,
  Robot,
  X,
  CaretUp,
  CaretDown,
} from "@phosphor-icons/react";
import Dropdown from "../Dropdown";
import Avatar from "../common/Avatar";

const EMPTY_MESSAGES = [];

export default function ChatHeader({
  chatData,
  isGroup = false,
  isAI = false,
  onBack,
  onProfileClick,
  onVideoCall,
  onAudioCall,
  onOpenBackground,
  onDelete,
  onEdit,
  // Search props
  isSearchOpen = false,
  onSearchToggle,
  messages = EMPTY_MESSAGES,
  onGoToMessage,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Focus input when search opens
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!isSearchOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setCurrentResultIndex(0);
      setShowResults(false);
    }
  }, [isSearchOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search messages
  useEffect(() => {
    if (!searchQuery.trim()) {
      if (searchResults.length > 0) setSearchResults([]);
      if (showResults) setShowResults(false);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = messages.filter((msg) => {
      if (msg.messageType === "system" || msg.isDeleted) return false;
      const messageText = (msg.message || msg.content || "").toLowerCase();
      const senderName = (msg.sender || "").toLowerCase();
      const fileName = (
        msg.metadata?.originalName ||
        msg.metadata?.fileName ||
        ""
      ).toLowerCase();
      return (
        messageText.includes(query) ||
        senderName.includes(query) ||
        fileName.includes(query)
      );
    });

    setSearchResults(filtered);
    setCurrentResultIndex(0);
    setShowResults(filtered.length > 0);
  }, [searchQuery, messages]);

  // Navigate to result
  const goToResult = (index) => {
    if (searchResults[index]) {
      setCurrentResultIndex(index);
      onGoToMessage?.(searchResults[index].id);
    }
  };

  const goToNext = () => {
    if (currentResultIndex < searchResults.length - 1) {
      goToResult(currentResultIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentResultIndex > 0) {
      goToResult(currentResultIndex - 1);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) goToPrevious();
      else if (searchResults.length > 0) goToResult(currentResultIndex);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      goToNext();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      goToPrevious();
    } else if (e.key === "Escape") {
      onSearchToggle?.();
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getMessagePreview = (msg) => {
    if (msg.messageType === "image") return "📷 Photo";
    if (msg.messageType === "video") return "🎬 Video";
    if (msg.messageType === "audio") return "🎤 Voice";
    if (msg.messageType === "file")
      return `📎 ${msg.metadata?.originalName?.slice(0, 20) || "File"}`;
    const text = msg.message || msg.content || "";
    return text.length > 40 ? text.slice(0, 40) + "..." : text;
  };

  if (!chatData) return null;

  const name = chatData.name;

  const formatLastSeen = (lastActiveAt) => {
    if (!lastActiveAt) return "Offline";
    const lastActive = new Date(lastActiveAt);
    if (isNaN(lastActive.getTime())) return "Offline";

    const now = new Date();
    const diffMs = now - lastActive;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Last seen just now";
    if (diffMins < 60) return `Last seen ${diffMins}m ago`;
    if (diffHours < 24) return `Last seen ${diffHours}h ago`;
    if (diffDays < 7) return `Last seen ${diffDays}d ago`;
    return `Last seen ${lastActive.toLocaleDateString()}`;
  };

  const subtitle = isGroup
    ? `${chatData.memberCount || 0} members • ${
        chatData.onlineCount || 0
      } online`
    : chatData.isOnline
    ? "Active now"
    : formatLastSeen(
        chatData.lastActiveAt || chatData.conversation?.lastActiveAt
      );

  return (
    <div className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-stroke/10 px-4 sm:px-6 py-3 backdrop-blur-xl dark:border-strokedark/10 gradient-bg-header">
      {/* Left side - Profile info (hide when search is open on mobile) */}
      <div
        className={`flex items-center gap-3 ${
          isSearchOpen ? "hidden sm:flex" : "flex"
        }`}
      >
        {onBack && (
          <button
            onClick={onBack}
            className="hover:text-primary transition-colors lg:hidden"
          >
            <CaretLeft size={24} />
          </button>
        )}

        <div
          onClick={onProfileClick}
          className={`flex items-center gap-3 ${
            onProfileClick
              ? "cursor-pointer hover:opacity-80 transition-opacity"
              : ""
          }`}
        >
          <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-stroke/20 dark:ring-strokedark/20 flex-shrink-0">
            <Avatar
              src={chatData.avatar}
              alt={name}
              size="custom"
              className="w-full h-full"
              isOnline={!isGroup && chatData.isOnline}
              isGroup={isGroup}
            />
          </div>

          <div className="flex flex-col">
            <h5 className="font-medium text-black dark:text-white line-clamp-1 text-sm">
              {name}
            </h5>
            <p className="text-xs text-gray-500 dark:text-white flex items-center gap-1 line-clamp-1">
              {isAI && (
                <span className="block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
              )}
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar - Inline in header */}
      {isSearchOpen && (
        <div
          ref={searchContainerRef}
          className="flex-1 sm:flex-none sm:w-72 mx-2 relative"
        >
          <div className="flex items-center gap-2 bg-white/30 dark:bg-black/20 rounded-full h-10 px-4 transition-all ring-1 ring-transparent focus-within:ring-primary/40 backdrop-blur-sm">
            <MagnifyingGlass
              size={18}
              className="text-gray-400 dark:text-gray-300 flex-shrink-0"
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              className="flex-1 bg-transparent outline-none text-sm text-black dark:text-white placeholder:text-gray-400 w-full min-w-0"
            />

            {/* Result counter & navigation */}
            {searchResults.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-white flex-shrink-0 border-l border-gray-300 dark:border-gray-600 pl-2 ml-1">
                <span className="tabular-nums">
                  {currentResultIndex + 1}/{searchResults.length}
                </span>
                <button
                  onClick={goToPrevious}
                  disabled={currentResultIndex === 0}
                  className="p-0.5 hover:text-black dark:hover:text-white disabled:opacity-30"
                >
                  <CaretUp size={14} />
                </button>
                <button
                  onClick={goToNext}
                  disabled={currentResultIndex >= searchResults.length - 1}
                  className="p-0.5 hover:text-black dark:hover:text-white disabled:opacity-30"
                >
                  <CaretDown size={14} />
                </button>
              </div>
            )}

            <button
              onClick={onSearchToggle}
              className="p-1 hover:bg-white/10 dark:hover:bg-black/20 rounded-full text-gray-400 dark:text-gray-300 transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white/10 dark:bg-black/30 border border-white/20 dark:border-strokedark/20 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-50 backdrop-blur-2xl animate-fade-in">
              {searchResults.slice(0, 10).map((msg, index) => (
                <div
                  key={msg.id}
                  onClick={() => {
                    goToResult(index);
                    setShowResults(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-white/10 dark:border-strokedark/10 last:border-b-0 transition-colors ${
                    index === currentResultIndex
                      ? "bg-primary/20"
                      : "hover:bg-white/10 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="w-6 h-6 rounded-full flex-shrink-0">
                    <Avatar
                      src={msg.avatar}
                      alt={msg.sender}
                      size="custom"
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium text-black dark:text-white truncate">
                        {msg.sender}
                      </span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {formatTime(msg.time)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">
                      {getMessagePreview(msg)}
                    </p>
                  </div>
                </div>
              ))}
              {searchResults.length > 10 && (
                <div className="px-3 py-2 text-center text-xs text-gray-400">
                  +{searchResults.length - 10} more results
                </div>
              )}
            </div>
          )}

          {/* No results */}
          {searchQuery && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white/20 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-strokedark/20 rounded-xl shadow-2xl px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-300 z-50">
              No messages found
            </div>
          )}
        </div>
      )}

      {/* Right side - Action buttons */}
      <div
        className={`flex flex-row items-center gap-2 sm:gap-4 ${
          isSearchOpen ? "flex-shrink-0" : ""
        }`}
      >
        {!isSearchOpen && onSearchToggle && (
          <button
            onClick={onSearchToggle}
            className="text-gray-500 dark:text-white hover:text-primary transition-colors"
            aria-label="Search in chat"
          >
            <MagnifyingGlass size={22} />
          </button>
        )}

        {!isSearchOpen && (
          <>
            {onVideoCall && (
              <button
                onClick={onVideoCall}
                className="text-gray-500 dark:text-white hover:text-primary transition-colors hidden sm:block"
                aria-label="Start video call"
              >
                <VideoCamera size={22} />
              </button>
            )}
            {onAudioCall && (
              <button
                onClick={onAudioCall}
                className="text-gray-500 dark:text-white hover:text-primary transition-colors hidden sm:block"
                aria-label="Start voice call"
              >
                <Phone size={22} />
              </button>
            )}
            <div className="border-l border-stroke/20 dark:border-strokedark/20 h-5 mx-1 hidden sm:block"></div>
          </>
        )}

        <Dropdown
          onOpenBackground={onOpenBackground}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      </div>
    </div>
  );
}
