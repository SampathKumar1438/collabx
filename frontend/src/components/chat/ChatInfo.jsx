import React, { useState, useEffect } from "react";
import {
  X,
  Image,
  FileText,
  Bell,
  Prohibit,
  Trash,
  PushPin,
  User,
  At,
  Globe,
  Circle,
} from "@phosphor-icons/react";
import { messagesAPI, usersAPI } from "../../services/api";
import { useSocket } from "../../contexts/SocketContext";
import Avatar from "../common/Avatar";

export default function ChatInfo({
  chatData,
  onClose,
  onMediaClick,
  onGoToMessage,
}) {
  const [activeTab, setActiveTab] = useState("media");
  const [mediaItems, setMediaItems] = useState([]);
  const [fileItems, setFileItems] = useState([]);
  const [pinnedItems, setPinnedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [showFullBio, setShowFullBio] = useState(false);

  const { socket } = useSocket();
  const conversationId = chatData?.conversation?.conversationId || chatData?.id;
  const userId =
    chatData?.userId ||
    chatData?.conversation?.participants?.find(
      (p) => p.userId !== localStorage.getItem("userId")
    )?.userId;

  // Fetch user details
  useEffect(() => {
    if (userId) fetchUserDetails();
  }, [userId]);

  // Fetch media when tab changes
  useEffect(() => {
    if (!conversationId) return;
    if (activeTab === "media") fetchMedia();
    else if (activeTab === "files") fetchFiles();
    else if (activeTab === "pinned") fetchPinned();
  }, [activeTab, conversationId]);

  // Listen for user presence updates
  useEffect(() => {
    if (!socket || !userId) return;
    const handlePresence = ({ userId: updatedUserId, isOnline }) => {
      if (updatedUserId === userId) {
        setUserDetails((prev) => (prev ? { ...prev, isOnline } : prev));
      }
    };
    socket.on("user:presence", handlePresence);
    return () => socket.off("user:presence", handlePresence);
  }, [socket, userId]);

  // Listen for new messages
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleNewMessage = (messageData) => {
      if (messageData.chatId !== conversationId) return;
      if (
        messageData.messageType === "image" ||
        messageData.messageType === "video"
      ) {
        setMediaItems((prev) => [
          {
            messageId: messageData.messageId,
            messageType: messageData.messageType,
            fileUrl: messageData.fileUrl,
            metadata: messageData.metadata || {},
            createdAt: messageData.createdAt,
            sender: messageData.sender,
          },
          ...prev,
        ]);
      }
      if (
        messageData.messageType === "file" ||
        messageData.messageType === "audio"
      ) {
        setFileItems((prev) => [
          {
            messageId: messageData.messageId,
            messageType: messageData.messageType,
            fileUrl: messageData.fileUrl,
            metadata: messageData.metadata || {},
            createdAt: messageData.createdAt,
            sender: messageData.sender,
          },
          ...prev,
        ]);
      }
    };

    const handleMessagePinned = ({ messageId, isPinned, message }) => {
      if (isPinned) {
        if (message) setPinnedItems((prev) => [message, ...prev]);
        else fetchPinned();
      } else {
        setPinnedItems((prev) =>
          prev.filter((m) => m.id !== messageId && m.messageId !== messageId)
        );
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:pinned", handleMessagePinned);
    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:pinned", handleMessagePinned);
    };
  }, [socket, conversationId]);

  const fetchUserDetails = async () => {
    try {
      const response = await usersAPI.getById(userId);
      if (response.success) setUserDetails(response.data);
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const fetchMedia = async () => {
    if (!conversationId) return;
    try {
      setLoading(true);
      const response = await messagesAPI.getMedia(conversationId, 50, 0);
      if (response.success) setMediaItems(response.data);
    } catch (error) {
      console.error("Error fetching media:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    if (!conversationId) return;
    try {
      setLoading(true);
      const response = await messagesAPI.getFiles(conversationId, 50, 0);
      if (response.success) setFileItems(response.data);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPinned = async () => {
    if (!conversationId) return;
    try {
      setLoading(true);
      const response = await messagesAPI.getPinned(conversationId);
      if (response.success) setPinnedItems(response.data);
    } catch (error) {
      console.error("Error fetching pinned messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const formatLastSeen = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const displayData = {
    name: userDetails?.username || chatData?.name || "User",
    avatar: userDetails?.profilePictureUrl || null, // Only use actual profile picture, not fallbacks
    bio: userDetails?.bio || null,
    email: userDetails?.email || null,
    isOnline: userDetails?.isOnline ?? chatData?.isOnline ?? false,
    lastActiveAt: userDetails?.lastActiveAt || chatData?.lastActiveAt,
  };

  const bioTruncateLength = 80;
  const shouldTruncateBio =
    displayData.bio && displayData.bio.length > bioTruncateLength;

  return (
    <div className="h-full flex flex-col bg-transparent border-l border-stroke/20 dark:border-strokedark/20">
      {/* Header - Compact */}
      <div className="flex h-[72px] flex-shrink-0 items-center justify-between px-4 py-3 border-b border-stroke/10 bg-white/5 dark:bg-black/5 backdrop-blur-md">
        <span className="text-lg font-bold text-black dark:text-white">
          Contact Info
        </span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 dark:hover:bg-black/20 rounded-full dark:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Profile Section - Compact Horizontal */}
      <div className="px-4 py-3 border-b border-stroke/10 dark:border-strokedark/20 flex items-start gap-3">
        {/* Avatar with online indicator */}
        <div className="relative flex-shrink-0">
          <Avatar
            src={displayData.avatar}
            alt={displayData.name}
            size="xl"
            isOnline={displayData.isOnline}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-black dark:text-white truncate">
            {displayData.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full ${
                displayData.isOnline ? "bg-success" : "bg-gray-400"
              }`}
            />
            <span className="text-xs text-gray-500 dark:text-white">
              {displayData.isOnline
                ? "Online"
                : `Last seen ${formatLastSeen(displayData.lastActiveAt)}`}
            </span>
          </div>

          {displayData.bio && (
            <p className="text-sm text-gray-600 dark:text-white mt-1.5 leading-relaxed">
              {shouldTruncateBio && !showFullBio ? (
                <>
                  {displayData.bio.slice(0, bioTruncateLength)}...
                  <button
                    onClick={() => setShowFullBio(true)}
                    className="text-primary ml-1"
                  >
                    more
                  </button>
                </>
              ) : (
                <>
                  {displayData.bio}
                  {shouldTruncateBio && (
                    <button
                      onClick={() => setShowFullBio(false)}
                      className="text-primary ml-1"
                    >
                      less
                    </button>
                  )}
                </>
              )}
            </p>
          )}

          {/* Email */}
          {displayData.email && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500 dark:text-white">
              <At size={12} />
              <span className="truncate">{displayData.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions - Compact Inline */}
      <div className="px-4 py-2 flex gap-2 border-b border-stroke dark:border-strokedark">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stroke dark:text-white dark:border-stroke dark:hover:bg-boxdark-2 transition-colors text-xs">
          <Bell size={14} />
          Mute
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-danger/30 bg-danger/5 hover:bg-danger/10 text-danger transition-colors text-xs">
          <Prohibit size={14} />
          Block
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-danger/30 bg-danger/5 hover:bg-danger/10 text-danger transition-colors text-xs">
          <Trash size={14} />
          Delete
        </button>
      </div>

      {/* Content Tabs - Compact */}
      <div className="flex px-2 border-b border-stroke/10 dark:border-strokedark/20">
        {[
          { key: "media", label: "Media", count: mediaItems.length },
          { key: "files", label: "Files", count: fileItems.length },
          { key: "pinned", label: "Pinned", count: pinnedItems.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-2 px-3 text-sm font-semibold transition-all relative ${
              activeTab === tab.key
                ? "text-primary dark:text-primary"
                : "text-gray-600 dark:text-white hover:text-black dark:hover:text-white"
            }`}
          >
            <span className="flex items-center gap-1">
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`text-[10px] px-1 rounded-full ${
                    activeTab === tab.key
                      ? "bg-primary text-white"
                      : "bg-gray-200 dark:bg-gray-700 dark:text-white"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </span>
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === "media" && (
              <div className="grid grid-cols-3 gap-1.5">
                {mediaItems.length > 0 ? (
                  mediaItems.map((item) => (
                    <div
                      key={item.messageId}
                      className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg bg-gray-200 dark:bg-boxdark-2"
                      onClick={() => onMediaClick(item.fileUrl)}
                    >
                      {item.messageType === "video" ? (
                        <>
                          <video
                            src={item.fileUrl}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/60 rounded-full p-1.5">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                              </svg>
                            </div>
                          </div>
                        </>
                      ) : (
                        <img
                          src={item.fileUrl}
                          alt="Shared"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 text-center py-8 text-gray-500 dark:text-white text-xs">
                    <Image size={24} className="mx-auto mb-2 opacity-50" />
                    No media shared yet
                  </div>
                )}
              </div>
            )}

            {activeTab === "files" && (
              <div className="space-y-1">
                {fileItems.length > 0 ? (
                  fileItems.map((file) => (
                    <div
                      key={file.messageId}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 dark:hover:bg-black/10 transition-colors"
                    >
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <FileText size={18} weight="duotone" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black dark:text-white truncate">
                          {file.metadata?.originalName ||
                            file.metadata?.fileName ||
                            "File"}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-white">
                          {formatFileSize(file.metadata?.fileSize)} •{" "}
                          {formatDate(file.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-white text-xs">
                    <FileText size={24} className="mx-auto mb-2 opacity-50" />
                    No files shared yet
                  </div>
                )}
              </div>
            )}

            {activeTab === "pinned" && (
              <div className="space-y-1.5">
                {pinnedItems.length > 0 ? (
                  pinnedItems.map((msg) => (
                    <div
                      key={msg.messageId || msg.id}
                      onClick={() => onGoToMessage?.(msg.messageId || msg.id)}
                      className="p-2.5 bg-gray-50 dark:bg-boxdark-2 rounded-lg border border-stroke dark:border-strokedark hover:border-primary cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                          <PushPin size={10} weight="fill" />
                          Pinned
                        </span>
                        <span className="text-[9px] text-gray-500 dark:text-white">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-black dark:text-white line-clamp-2">
                        {msg.content ||
                          (msg.messageType !== "text"
                            ? `[${msg.messageType}]`
                            : "")}
                      </p>
                      <span className="text-[9px] text-gray-500 dark:text-white mt-1">
                        By {msg.sender?.username || msg.sender}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-white text-xs">
                    <PushPin size={24} className="mx-auto mb-2 opacity-50" />
                    No pinned messages
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
