import { useState, useEffect, useRef } from "react";
import {
  Phone,
  VideoCamera,
  CaretLeft,
  MagnifyingGlass,
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

  useEffect(() => {
    const handleClickOutside = (e) => {
      setTimeout(() => {
        if (
          searchContainerRef.current &&
          !searchContainerRef.current.contains(e.target)
        ) {
          setShowResults(false);
        }
      }, 0);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
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
    <div className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-stroke/10 px-4 sm:px-6 py-3 backdrop-blur-3xl dark:border-strokedark/20 gradient-bg-header transition-all duration-300">
      {/* Left side */}
      <div
        className={`flex items-center gap-5 ${
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
          <div className="flex-shrink-0">
            <Avatar
              src={chatData.avatar}
              alt={name}
              size="md"
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

      {/* Search Bar Container */}
      {isSearchOpen && (
        <div
          ref={searchContainerRef}
          className="flex-1 sm:flex-none sm:w-[420px] mx-2 relative animate-fade-in z-50"
        >
          {/* Input Field - Refined for visibility and no rings */}
          <div className="flex items-center gap-3 bg-gray-100/90 dark:bg-black/50 rounded-full h-11 px-5 transition-all duration-300 hover:bg-gray-200 dark:hover:bg-black/70 focus-within:bg-white dark:focus-within:bg-[#151515] border-none outline-none ring-0 shadow-none">
            <MagnifyingGlass
              size={18}
              className="text-gray-500 dark:text-white flex-shrink-0"
              weight="bold"
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              className="flex-1 bg-transparent outline-none border-none ring-0 dark:text-white focus:ring-0 focus:outline-none text-sm font-medium text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-500 w-full min-w-0"
            />

            {/* Navigation Controls */}
            {searchResults.length > 0 && (
              <div className="flex items-center gap-2 pl-3 border-l border-gray-300 dark:text-white dark:border-white/10">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 tabular-nums">
                  {currentResultIndex + 1} / {searchResults.length}
                </span>
                <div className="flex gap-0.5">
                  <button
                    onClick={goToPrevious}
                    disabled={currentResultIndex === 0}
                    type="button"
                    className="p-1 rounded-md hover:bg-gray-200 dark:text-white dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-primary disabled:opacity-30 transition-all outline-none focus:outline-none"
                  >
                    <CaretUp size={12} weight="bold" />
                  </button>
                  <button
                    onClick={goToNext}
                    disabled={currentResultIndex >= searchResults.length - 1}
                    type="button"
                    className="p-1 rounded-md hover:bg-gray-200 dark:text-white dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-primary disabled:opacity-30 transition-all outline-none focus:outline-none"
                  >
                    <CaretDown size={12} weight="bold" />
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={onSearchToggle}
              type="button"
              className="p-1.5 ml-1 rounded-full text-gray-400 dark:text-white hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/10 transition-all outline-none focus:outline-none"
            >
              <X size={16} weight="bold" />
            </button>
          </div>

          {/* Modern Floating Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-4 bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur-3xl border border-gray-100 dark:border-white/5 rounded-2xl shadow-2xl max-h-[400px] overflow-y-auto no-scrollbar z-[60] animate-slide-down origin-top p-2 ring-1 ring-black/5 dark:ring-white/5">
              <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase dark:text-white tracking-widest mb-1 flex items-center justify-between">
                <span>Top Matches</span>
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {searchResults.length} found
                </span>
              </div>

              <div className="flex flex-col gap-1">
                {searchResults.slice(0, 20).map((msg, index) => (
                  <div
                    key={msg.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      goToResult(index);
                      setShowResults(false);
                    }}
                    className={`relative p-3 rounded-xl cursor-pointer transition-all dark:text-white duration-200 group flex items-start gap-3.5 
                        ${
                          index === currentResultIndex
                            ? "bg-primary/5 dark:bg-primary/10 shadow-sm ring-1 ring-primary/20 scale-[0.99]"
                            : "hover:bg-gray-50 dark:hover:bg-white/5"
                        }
                    `}
                  >
                    {/* Active Indicator Dot */}
                    {index === currentResultIndex && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full shadow-lg shadow-primary/50"></div>
                    )}

                    <div className="flex-shrink-0 pt-0.5">
                      <Avatar
                        src={msg.avatar}
                        alt={msg.sender}
                        size="sm"
                        className={`ring-2 ${
                          index === currentResultIndex
                            ? "ring-primary/30"
                            : "ring-transparent"
                        } transition-all`}
                      />
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-bold ${
                            index === currentResultIndex
                              ? "text-primary dark:text-primary"
                              : "text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          {msg.sender}
                        </span>
                        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                          {formatTime(msg.time)}
                        </span>
                      </div>

                      <div
                        className={`text-xs leading-relaxed line-clamp-2 ${
                          index === currentResultIndex
                            ? "text-gray-700 dark:text-gray-200 font-medium"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {msg.messageType !== "text" ? (
                          <span className="italic opacity-80 flex items-center gap-1">
                            {getMessagePreview(msg)}
                          </span>
                        ) : (
                          getMessagePreview(msg)
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {searchResults.length > 20 && (
                <div className="mt-2 p-3 text-center text-xs font-medium text-gray-400 bg-gray-50/50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-white/5">
                  View {searchResults.length - 20} more results below...
                </div>
              )}
            </div>
          )}

          {/* No results - Modern Card */}
          {searchQuery && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-4 bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur-3xl border border-gray-100 dark:border-white/5 rounded-2xl shadow-2xl p-8 text-center flex flex-col items-center gap-4 z-50 animate-scale-in">
              <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 shadow-inner">
                <MagnifyingGlass size={28} weight="duotone" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  No matches found
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-[180px] mx-auto leading-relaxed">
                  We couldn't find any messages matching "{searchQuery}"
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Right side - Action buttons */}
      <div
        className={`flex flex-row items-center gap-3 ${
          isSearchOpen ? "flex-shrink-0" : ""
        }`}
      >
        {!isSearchOpen && onSearchToggle && (
          <button
            onClick={onSearchToggle}
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 hover:text-primary transition-all duration-200"
            aria-label="Search in chat"
          >
            <MagnifyingGlass size={22} weight="regular" />
          </button>
        )}

        {!isSearchOpen && (
          <>
            {onVideoCall && (
              <button
                onClick={onVideoCall}
                className="w-10 h-10 hidden sm:flex items-center justify-center rounded-full text-gray-500 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 hover:text-primary transition-all duration-200"
                aria-label="Start video call"
              >
                <VideoCamera size={22} weight="regular" />
              </button>
            )}
            {onAudioCall && (
              <button
                onClick={onAudioCall}
                className="w-10 h-10 hidden sm:flex items-center justify-center rounded-full text-gray-500 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 hover:text-primary transition-all duration-200"
                aria-label="Start voice call"
              >
                <Phone size={22} weight="regular" />
              </button>
            )}
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
