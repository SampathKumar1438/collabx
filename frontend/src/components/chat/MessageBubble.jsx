import { useState, useRef, useEffect, memo } from "react";
import {
  User,
  Phone,
  VideoCamera,
  Play,
  Pause,
  PushPin,
  File,
  Download,
  Check,
  Checks,
  Trash,
  ArrowArcLeft,
} from "@phosphor-icons/react";
import MessageActions from "../MessageActions";
import EmojiPicker from "../EmojiPicker";

function MessageBubble({
  message,
  isOwn,
  onReply,
  onReact,
  onDelete,
  onImageClick,
  onPin,
  onEdit,
  onGoToMessage,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Get message type and file URL from database or local state
  const messageType =
    message.messageType ||
    (message.audio ? "audio" : message.image ? "image" : "text");
  const fileUrl = message.fileUrl || message.audio || message.image;
  const metadata = message.metadata || {};

  // Initial Setup for Audio Duration and Cleanup
  useEffect(() => {
    if (messageType === "audio" && fileUrl) {
      const audioData = new Audio(fileUrl);
      const setAudioDuration = () => {
        if (isFinite(audioData.duration)) setDuration(audioData.duration);
      };
      audioData.addEventListener("loadedmetadata", setAudioDuration);
      return () => {
        audioData.removeEventListener("loadedmetadata", setAudioDuration);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    }
  }, [messageType, fileUrl]);

  const toggleAudio = () => {
    if (messageType !== "audio" || !fileUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(fileUrl);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      };
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current && audioRef.current.duration) {
          const current = audioRef.current.currentTime;
          setCurrentTime(current);
          setProgress((current / audioRef.current.duration) * 100);
        }
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds) => {
    if (!seconds || Number.isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleEmojiSelect = (emoji) => {
    const emojiText =
      typeof emoji === "string" ? emoji : emoji.native || emoji.id || emoji;
    onReact && onReact(message, emojiText);
    setShowReactionPicker(false);
  };

  // Audio Renderer
  const renderAudio = () => (
    <div
      className={`flex items-center gap-3 min-w-[240px] p-3 rounded-2xl transition-all ${
        isOwn
          ? "bg-white/20 backdrop-blur-sm border border-white/20 shadow-lg"
          : "bg-white/40 dark:bg-black/20 backdrop-blur-sm border border-stroke/20 dark:border-strokedark/20 shadow-md"
      }`}
    >
      {/* Play/Pause Button with gradient */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleAudio();
        }}
        className={`h-11 w-11 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-lg ${
          isOwn
            ? "bg-white text-primary shadow-white/20"
            : "bg-gradient-to-br from-primary to-secondary text-white shadow-primary/30"
        }`}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause size={18} weight="fill" />
        ) : (
          <Play size={18} weight="fill" className="ml-0.5" />
        )}
      </button>

      {/* Waveform and progress */}
      <div className="flex-1 flex flex-col gap-1.5">
        <div
          className="flex items-center gap-[3px] h-7 w-full cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            toggleAudio();
          }}
        >
          {Array.from({ length: 24 }).map((_, i) => {
            const barProgress = (i / 24) * 100;
            const isActive = barProgress < progress;
            return (
              <div
                key={`wave-${i}`}
                className={`w-[3px] rounded-full transition-all duration-200`}
                style={{
                  height: isPlaying
                    ? `${Math.random() * 70 + 30}%`
                    : `${35 + Math.sin(i / 2) * 25}%`,
                  backgroundColor: isOwn
                    ? isActive
                      ? "rgba(255,255,255,1)"
                      : "rgba(255,255,255,0.35)"
                    : isActive
                    ? "var(--color-primary, #FFAB00)"
                    : "rgba(0,0,0,0.15)",
                }}
              />
            );
          })}
        </div>

        {/* Time display */}
        <div
          className={`flex justify-between text-[10px] font-medium tabular-nums ${
            isOwn ? "text-white/80" : "text-gray-500 dark:text-white"
          }`}
        >
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );

  // Image Renderer (including GIFs)
  const renderImage = () => {
    const isGif =
      metadata.isGif ||
      fileUrl?.includes("giphy.com") ||
      fileUrl?.endsWith(".gif");

    return (
      <div
        className="mt-2 rounded-lg overflow-hidden relative group/img cursor-pointer transition-transform hover:opacity-95 active:scale-95"
        onClick={(e) => {
          e.stopPropagation();
          onImageClick && onImageClick(fileUrl);
        }}
      >
        {isGif ? (
          <img
            src={fileUrl}
            alt="GIF"
            className="max-w-[300px] h-auto object-cover rounded-lg"
            loading="lazy"
          />
        ) : (
          <img
            src={fileUrl}
            alt="attachment"
            className="max-w-[300px] h-auto object-cover rounded-lg"
            loading="lazy"
          />
        )}
      </div>
    );
  };

  // File Renderer
  const renderFile = () => (
    <div
      className={`mt-2 flex items-center gap-3 p-3 rounded-lg border ${
        isOwn
          ? "bg-white/20 border-white/30"
          : "bg-gray-100 dark:bg-boxdark-2 border-stroke dark:border-strokedark"
      }`}
    >
      <div
        className={`p-2 rounded-lg ${isOwn ? "bg-white/30" : "bg-primary/10"}`}
      >
        <File size={24} className={isOwn ? "text-white" : "text-primary"} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            isOwn ? "text-white" : "text-black dark:text-white"
          }`}
        >
          {metadata.originalName || "File"}
        </p>
        {metadata.fileSize && (
          <p
            className={`text-xs ${
              isOwn ? "text-white/70" : "text-gray-500 dark:text-white"
            }`}
          >
            {formatFileSize(metadata.fileSize)}
          </p>
        )}
      </div>
      <a
        href={fileUrl}
        download={metadata.originalName}
        className={`p-2 rounded-lg hover:bg-opacity-20 transition-colors ${
          isOwn
            ? "bg-white/20 hover:bg-white/30"
            : "bg-primary/10 hover:bg-primary/20"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <Download size={20} className={isOwn ? "text-white" : "text-primary"} />
      </a>
    </div>
  );

  // Video Renderer
  const renderVideo = () => (
    <div className="mt-2 rounded-lg overflow-hidden">
      <video src={fileUrl} controls className="max-w-[300px] h-auto rounded-lg">
        Your browser does not support the video tag.
      </video>
    </div>
  );

  // Call Renderer (System Message Style)
  const renderCall = () => {
    const isMissed = metadata.status === "missed";
    const isVideo = metadata.isVideo;
    const isDeclined = metadata.status === "declined";

    // For call messages, we ignore the bubble style and return a centered system-like message or a special bubble.
    // WhatsApp style: Icon + Text + Time inside a bubble, typically standard bubble but with specific content.

    return (
      <div className="flex items-center gap-3 min-w-[180px]">
        <div
          className={`p-3 rounded-full ${
            isMissed || isDeclined
              ? "bg-red-100 text-red-500 dark:bg-red-900/20"
              : "bg-gray-100 dark:bg-white/10"
          }`}
        >
          {isVideo ? (
            <VideoCamera size={24} weight="fill" />
          ) : (
            <Phone size={24} weight="fill" />
          )}
          {/* Note: User icon is just a placeholder if Phone/VideoCamera not imported. I'll fix imports. */}
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-sm">
            {isMissed
              ? "Missed Call"
              : isDeclined
              ? "Call Declined"
              : "Call Ended"}
          </span>
          {metadata.duration > 0 && (
            <span className="text-xs opacity-80">
              {formatTime(metadata.duration)}
            </span>
          )}
        </div>
      </div>
    );
  };

  // System messages (join/leave notifications)
  if (messageType === "system") {
    // Format system message based on type
    const getSystemMessageText = () => {
      const meta = message.metadata || metadata;
      const type = meta?.type;
      const username = meta?.username || "";
      const addedBy = meta?.addedBy || "";
      const removedBy = meta?.removedBy || "";

      switch (type) {
        case "member_joined":
          return addedBy
            ? `${username} was added by ${addedBy}`
            : `${username} joined the group`;
        case "member_removed":
          return removedBy
            ? `${username} was removed by ${removedBy}`
            : `${username} was removed from the group`;
        case "member_left":
          return `${username} left the group`;
        default:
          return message.content || message.message || "";
      }
    };

    return (
      <div className="flex justify-center w-full my-3">
        <div className="bg-gray-100 dark:bg-boxdark-2 text-gray-600 dark:text-gray-400 px-4 py-1.5 rounded-lg text-xs font-medium shadow-sm border border-gray-200 dark:border-strokedark">
          {getSystemMessageText()}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex group ${
        isOwn ? "justify-end" : "justify-start"
      } w-full mb-4 scroll-mt-20`}
    >
      <div
        className={`relative max-w-[85%] sm:max-w-[75%] ${
          isOwn
            ? "flex flex-row-reverse items-end gap-2"
            : "flex items-end gap-2"
        }`}
      >
        {/* Avatar (only for others) */}
        {!isOwn && (
          <div className="flex-shrink-0 mb-1">
            {message.avatar ? (
              <img
                src={message.avatar}
                alt={message.sender}
                className="w-8 h-8 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                {message.sender?.[0] || <User />}
              </div>
            )}
          </div>
        )}

        {/* Actions (Hover) - Center Aligned */}
        {messageType !== "call" && (
          <div
            className={`relative opacity-0 group-hover:opacity-100 transition-opacity self-center mx-1 ${
              isOwn ? "order-first" : "order-last"
            }`}
          >
            <MessageActions
              isOwn={isOwn}
              isPinned={message.isPinned}
              onReply={() => onReply && onReply(message)}
              onReact={() => setShowReactionPicker(!showReactionPicker)}
              onPin={() => onPin && onPin(message)}
              onDelete={() => onDelete && onDelete(message)}
              onEdit={
                messageType === "text"
                  ? () => onEdit && onEdit(message)
                  : undefined
              }
            />

            {/* Reaction Picker Popover */}
            {showReactionPicker && (
              <div
                className={`absolute bottom-full mb-2 ${
                  isOwn ? "left-auto right-0" : "left-0 right-auto"
                } z-50 bg-white dark:bg-boxdark shadow-lg rounded-lg border border-stroke dark:border-strokedark p-2 animate-fade-in`}
              >
                <div className="flex gap-2 items-center">
                  {["👍", "❤️", "😂", "😮", "😢", "😡"].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="text-xl hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                  <div className="border-l border-gray pl-2 ml-1">
                    <EmojiPicker onSelect={handleEmojiSelect} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
          {/* Sender Name */}
          {!isOwn && message.sender && messageType !== "call" && (
            <span className="text-xs text-gray-500 dark:text-white ml-1 mb-1">
              {message.sender}
            </span>
          )}

          {/* Message Bubble */}
          <div
            className={`relative px-4 py-3 shadow-sm ${
              isOwn
                ? "bg-primary text-white rounded-2xl rounded-tr-none shadow-primary/20"
                : "bg-white/60 dark:bg-black/30 text-black dark:text-white rounded-2xl rounded-tl-none border border-stroke/20 dark:border-strokedark/20 backdrop-blur-md shadow-sm"
            }`}
          >
            {/* Pinned Indicator */}
            {message.isPinned && (
              <div className="absolute -top-2 right-2 text-primary dark:text-white bg-white/80 dark:bg-black/50 backdrop-blur-sm rounded-full p-1 border border-stroke/20 shadow-md">
                <PushPin size={12} weight="fill" />
              </div>
            )}

            {/* Reply Context */}
            {(message.replyTo || message.metadata?.replyTo) && (
              <div
                className={`mb-2 rounded-lg border-l-4 p-2 text-sm cursor-pointer transition-opacity hover:opacity-80 ${
                  isOwn
                    ? "bg-white/10 border-white/50"
                    : "bg-gray-100 dark:bg-boxdark border-primary"
                }`}
                onClick={() => {
                  const targetId =
                    message.replyTo?.messageId ||
                    message.metadata?.replyTo?.messageId;
                  if (targetId) {
                    onGoToMessage && onGoToMessage(targetId);
                  }
                }}
              >
                <p className="font-bold text-xs opacity-80 flex items-center gap-1">
                  <ArrowArcLeft size={12} />
                  Replying to{" "}
                  {(message.replyTo || message.metadata.replyTo).sender}
                </p>
                <p className="truncate opacity-80 italic">
                  {(message.replyTo || message.metadata.replyTo).text ||
                    (message.replyTo || message.metadata.replyTo).message ||
                    "Media"}
                </p>
              </div>
            )}

            {/* Content */}
            {message.isDeleted ? (
              <p className="text-xs italic opacity-70 flex items-center gap-1.5">
                <Trash size={14} />
                {isOwn
                  ? "You deleted this message"
                  : "This message was deleted"}
              </p>
            ) : (
              <>
                {message.message && messageType !== "call" && (
                  <p className="text-base leading-relaxed whitespace-pre-wrap">
                    {message.message}
                  </p>
                )}
                {message.text && messageType !== "call" && (
                  <p className="text-base nav-link leading-relaxed whitespace-pre-wrap">
                    {message.text}
                  </p>
                )}

                {/* Render media based on message type */}
                {messageType === "audio" && renderAudio()}
                {messageType === "image" && renderImage()}
                {messageType === "video" && renderVideo()}
                {(messageType === "file" ||
                  (fileUrl &&
                    !["text", "image", "audio", "video", "call"].includes(
                      messageType
                    ))) &&
                  renderFile()}
                {messageType === "call" && renderCall()}
              </>
            )}

            {/* Reactions Badge */}
            {message.reactions && message.reactions.length > 0 && (
              <div
                className={`absolute -bottom-3 ${
                  isOwn ? "left-0" : "right-0"
                } bg-white dark:bg-boxdark rounded-full px-1.5 py-0.5 shadow-md border border-stroke dark:border-strokedark flex gap-0.5 text-xs animate-fade-in`}
              >
                {message.reactions.map((r, i) => (
                  <span key={i} className="animate-bounce-in">
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Timestamp & Status */}
          <span className="text-xs text-gray-500 dark:text-white mt-1 opacity-70 dark:opacity-100 flex items-center gap-1">
            {message.time}
            {isOwn && (
              <span
                className="inline-flex items-center"
                title={message.status || "sent"}
              >
                {message.status === "read" ? (
                  <Checks size={14} weight="bold" className="text-primary" />
                ) : message.status === "delivered" ? (
                  <Checks
                    size={14}
                    weight="bold"
                    className="text-gray-500 dark:text-white"
                  />
                ) : (
                  <Check
                    size={14}
                    weight="bold"
                    className="text-gray-500 dark:text-white"
                  />
                )}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
export default memo(MessageBubble);
