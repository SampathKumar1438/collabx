import { useState, useEffect, useRef } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import ChatBackground from "../../components/ChatBackground";
import ChatHeader from "../../components/chat/ChatHeader";
import ChatInput from "../../components/chat/ChatInput";
import MessageList from "../../components/chat/MessageList";
import GroupInfo from "./GroupInfo";
import MediaLightbox from "../../components/MediaLightbox";
import { messagesAPI, filesAPI, conversationsAPI } from "../../services/api";
import { useSocket } from "../../contexts/SocketContext";
import { useCall } from "../../contexts/CallContext";
import { useToast } from "../../contexts/ToastContext";

export default function GroupInbox({ groupData, onBack }) {
  const [messages, setMessages] = useState([]);
  const [chatBackgroundOpen, setChatBackgroundOpen] = useState(false);
  const [currentBackground, setCurrentBackground] = useState(null);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [localGroupData, setLocalGroupData] = useState(groupData);
  const messageListRef = useRef(null);

  const { socket } = useSocket();
  const conversationId =
    groupData?.conversation?.conversationId || groupData?.id;

  const { startCall } = useCall();
  const { error: showError } = useToast();
  const messagesPerPage = 20;

  // Fetch messages and members when group changes
  useEffect(() => {
    if (conversationId) {
      setPage(0);
      setHasMore(true);
      setSearchQuery(""); // Reset search
      setIsSearching(false);
      fetchMessages(0, true); // Reset to first page
      fetchMembers();
      conversationsAPI.markAsRead(conversationId);
      const savedBg = localStorage.getItem(`chat_bg_group_${conversationId}`);
      if (savedBg) {
        try {
          setCurrentBackground(JSON.parse(savedBg));
        } catch (e) {
          console.error(e);
        }
      } else {
        setCurrentBackground(null);
      }
    } else {
      setMessages([]);
      setMembers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    setLocalGroupData(groupData);
  }, [groupData]);

  // Socket.IO: Join/Leave chat rooms and listen for events
  useEffect(() => {
    if (!socket || !conversationId) return;

    // Join the chat room
    socket.emit("join:chat", { chatId: conversationId });

    // Listen for new messages
    const handleNewMessage = (messageData) => {
      if (messageData.chatId !== conversationId) return;

      // Mark as read
      conversationsAPI.markAsRead(conversationId);
      socket.emit("message:read", { chatId: conversationId });

      const sender = members.find((m) => m.userId === messageData.senderId);
      const currentUserId = localStorage.getItem("userId");
      const newMsg = {
        id: messageData.messageId,
        sender: sender?.username || messageData.sender?.username || "System",
        avatar:
          sender?.profilePictureUrl ||
          messageData.sender?.profilePictureUrl ||
          null,
        message: messageData.content || "",
        content: messageData.content || "",
        createdAt: messageData.createdAt, // Keep original timestamp for date grouping
        time: !isNaN(new Date(messageData.createdAt).getTime())
          ? new Date(messageData.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
        isOwn: String(messageData.senderId) === String(currentUserId),
        status: messageData.status || "sent",
        messageType: messageData.messageType || "text",
        fileUrl: messageData.fileUrl,
        metadata: messageData.metadata || {},
        replyTo: messageData.metadata?.replyTo || null,
      };

      setMessages((prev) => {
        // Prevent duplicate messages
        if (prev.some((m) => m.id === newMsg.id)) {
          return prev;
        }
        return [...prev, newMsg];
      });
    };

    // Listen for message edits
    const handleMessageEdited = (messageData) => {
      if (messageData.chatId !== conversationId) return;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageData.messageId
            ? { ...msg, message: messageData.content, edited: true }
            : msg
        )
      );
    };

    // Listen for message deletes
    const handleMessageDeleted = (messageData) => {
      if (messageData.chatId !== conversationId) return;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageData.messageId
            ? { ...msg, isDeleted: true, message: "" }
            : msg
        )
      );
    };

    // Listen for typing indicators
    const handleUserTyping = ({ chatId, username }) => {
      console.log("GROUP TYPING EVENT RECEIVED:", { chatId, username });
      if (chatId === conversationId) {
        setTypingUser(username);
      }
    };

    const handleUserStoppedTyping = ({ chatId }) => {
      if (chatId === conversationId) {
        setTypingUser(null);
      }
    };

    // Listen for user presence updates
    const handleUserPresence = ({ userId, isOnline }) => {
      setMembers((prev) =>
        prev.map((member) =>
          member.userId === userId
            ? { ...member, user: { ...member.user, isOnline } }
            : member
        )
      );
    };

    const handleMessageStatus = ({ messageId, status, all }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (all && status === "read") return { ...msg, status: "read" };
          if (msg.id === messageId) return { ...msg, status };
          return msg;
        })
      );
    };

    // Listen for group notifications (join/leave)
    const handleGroupNotification = (notificationData) => {
      if (notificationData.chatId !== conversationId) return;

      // Add system message to chat
      const systemMsg = {
        id: `system-${Date.now()}`,
        sender: "System",
        message: notificationData.message,
        time: new Date(notificationData.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isOwn: false,
        isSystem: true,
        messageType: "system",
        metadata: {
          type: notificationData.type,
          userId: notificationData.userId,
          username: notificationData.username,
        },
      };

      setMessages((prev) => [...prev, systemMsg]);
    };

    const handleConversationUpdated = (updatedConv) => {
      if (updatedConv.conversationId === conversationId) {
        setLocalGroupData((prev) => ({
          ...prev,
          name: updatedConv.groupName,
          avatar: updatedConv.groupImageUrl,
          conversation: {
            ...prev?.conversation,
            groupName: updatedConv.groupName,
            groupImageUrl: updatedConv.groupImageUrl,
          },
        }));
      }
    };

    // Listen for member added events
    const handleMemberAdded = ({ conversationId: convId, newMembers }) => {
      if (convId === conversationId) {
        fetchMembers(); // Refresh member list
      }
    };

    // Listen for member removed events
    const handleMemberRemoved = ({
      conversationId: convId,
      removedMemberIds,
    }) => {
      if (convId === conversationId) {
        setMembers((prev) =>
          prev.filter((m) => !removedMemberIds.includes(m.userId))
        );
      }
    };

    // Listen for reaction updates
    const handleMessageReaction = ({ chatId, messageId, reactions }) => {
      if (chatId === conversationId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, reactions } : msg
          )
        );
      }
    };

    // Listen for message pins
    const handleMessagePinned = ({ messageId, isPinned }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, isPinned } : msg))
      );
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:status", handleMessageStatus);
    socket.on("message:edited", handleMessageEdited);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("user:typing", handleUserTyping);
    socket.on("user:stopped_typing", handleUserStoppedTyping);
    socket.on("user:presence", handleUserPresence);
    socket.on("group:notification", handleGroupNotification);
    socket.on("group:member_added", handleMemberAdded);
    socket.on("group:member_removed", handleMemberRemoved);
    socket.on("message:pinned", handleMessagePinned);
    socket.on("message:reaction", handleMessageReaction);
    socket.on("conversation:updated", handleConversationUpdated);

    return () => {
      // Do NOT leave the chat room to ensure we receive notifications
      // socket.emit("leave:chat", { chatId: conversationId });
      socket.off("message:new", handleNewMessage);
      socket.off("message:status", handleMessageStatus);
      socket.off("message:edited", handleMessageEdited);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("user:typing", handleUserTyping);
      socket.off("user:stopped_typing", handleUserStoppedTyping);
      socket.off("user:presence", handleUserPresence);
      socket.off("group:notification", handleGroupNotification);
      socket.off("group:member_added", handleMemberAdded);
      socket.off("group:member_removed", handleMemberRemoved);
      socket.off("message:pinned", handleMessagePinned);
      socket.off("message:reaction", handleMessageReaction);
      socket.off("conversation:updated", handleConversationUpdated);
    };
  }, [socket, conversationId]);

  const handleVideoCall = () => {
    if (!conversationId) return;
    startCall({
      recipientId: null, // No specific recipient for group start
      chatId: conversationId,
      name: groupData.name || "Group Call",
      avatar: groupData.avatar,
      isVideo: true,
      isGroup: true,
    });
  };

  const handleAudioCall = () => {
    if (!conversationId) return;
    startCall({
      recipientId: null,
      chatId: conversationId,
      name: groupData.name || "Group Call",
      avatar: groupData.avatar,
      isVideo: false,
      isGroup: true,
    });
  };

  const fetchMessages = async (
    pageNum = 0,
    reset = false,
    query = searchQuery
  ) => {
    if (!conversationId) return;

    try {
      const loadingState = pageNum === 0 ? setLoading : setLoadingMore;
      loadingState(true);

      const offset = pageNum * messagesPerPage;
      const response = await messagesAPI.getByConversation(
        conversationId,
        messagesPerPage,
        offset,
        query
      );

      if (response.success) {
        const currentUserId = localStorage.getItem("userId");
        const transformedMessages = response.data.map((msg) => ({
          id: msg.messageId,
          sender: msg.sender?.username || "Unknown",
          avatar: msg.sender?.profilePictureUrl || null,
          message: msg.content || "",
          content: msg.content || "",
          createdAt: msg.createdAt, // Keep original timestamp for date grouping
          time: !isNaN(new Date(msg.createdAt).getTime())
            ? new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          isOwn: String(msg.senderId) === String(currentUserId),
          status: msg.status,
          messageType: msg.messageType,
          fileUrl: msg.fileUrl,
          metadata: msg.metadata || {},
          replyTo: msg.metadata?.replyTo || null,
          isPinned: msg.isPinned || false,
          isDeleted: msg.isDeleted || false,
        }));

        if (reset || pageNum === 0) {
          setMessages(transformedMessages);
        } else {
          // Prepend older messages - filter duplicates
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const uniqueNew = transformedMessages.filter(
              (m) => !existingIds.has(m.id)
            );
            return [...uniqueNew, ...prev];
          });
        }

        // Check if there are more messages
        setHasMore(transformedMessages.length === messagesPerPage);

        if (socket && conversationId) {
          socket.emit("message:read", { chatId: conversationId });
        }
        return response;
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      return { success: false };
    } finally {
      const loadingState = pageNum === 0 ? setLoading : setLoadingMore;
      loadingState(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      return await fetchMessages(nextPage, false);
    }
    return { success: false, data: [] };
  };

  const fetchMembers = async () => {
    if (!conversationId) return;

    try {
      const response = await conversationsAPI.getById(conversationId);
      if (response.success && response.data.participants) {
        setMembers(response.data.participants);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  const handleSetBackground = (bg) => {
    setCurrentBackground(bg);
    if (conversationId) {
      bg
        ? localStorage.setItem(
            `chat_bg_group_${conversationId}`,
            JSON.stringify(bg)
          )
        : localStorage.removeItem(`chat_bg_group_${conversationId}`);
    }
  };

  const handleSend = async ({ text, files, audio, gifUrl, replyTo }) => {
    if (!conversationId) return;

    try {
      setSending(true);

      // 1. Handle Text-only message (if no files/audio/gif)
      if (text && (!files || files.length === 0) && !audio && !gifUrl) {
        const messageData = {
          conversationId: conversationId,
          content: text.trim(),
          messageType: "text",
          metadata: replyTo
            ? {
                replyTo: {
                  messageId: replyTo.id,
                  sender: replyTo.sender,
                  text: replyTo.message || replyTo.text,
                },
              }
            : {},
        };
        const response = await messagesAPI.send(messageData);
        if (response.success) {
          const newMsg = {
            id: response.data.messageId,
            sender: "You",
            message: response.data.content,
            time: new Date(response.data.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            isOwn: true,
            messageType: "text",
            metadata: response.data.metadata || {},
          };
          setMessages((prev) => [...prev, newMsg]);

          if (socket) {
            socket.emit("message:send", {
              chatId: conversationId,
              messageId: response.data.messageId,
              senderId: localStorage.getItem("userId"),
              content: response.data.content,
              messageType: response.data.messageType,
              metadata: response.data.metadata,
              createdAt: response.data.createdAt,
              sender: JSON.parse(localStorage.getItem("user") || "{}"),
            });
          }
        }
      }

      // 2. Handle GIF
      if (gifUrl) {
        const messageData = {
          conversationId: conversationId,
          content: text || "",
          messageType: "image",
          fileUrl: gifUrl,
          metadata: {
            isGif: true,
            source: "giphy",
            ...(replyTo && {
              replyTo: {
                messageId: replyTo.id,
                sender: replyTo.sender,
                text: replyTo.message || replyTo.text,
              },
            }),
          },
        };
        const response = await messagesAPI.send(messageData);
        if (response.success) {
          const newMsg = {
            id: response.data.messageId,
            sender: "You",
            message: response.data.content,
            time: new Date(response.data.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            isOwn: true,
            messageType: "image",
            fileUrl: gifUrl,
            metadata: response.data.metadata || {},
          };
          setMessages((prev) => [...prev, newMsg]);

          if (socket) {
            socket.emit("message:send", {
              chatId: conversationId,
              messageId: response.data.messageId,
              senderId: localStorage.getItem("userId"),
              content: response.data.content,
              messageType: response.data.messageType,
              fileUrl: gifUrl,
              metadata: response.data.metadata,
              createdAt: response.data.createdAt,
              sender: JSON.parse(localStorage.getItem("user") || "{}"),
            });
          }
        }
      }

      // 3. Handle Audio
      if (audio) {
        try {
          let audioBlob = audio;
          if (!(audio instanceof Blob)) {
            audioBlob = new Blob([audio], { type: "audio/webm" });
          }
          const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, {
            type: audioBlob.type || "audio/webm",
          });

          const uploadResponse = await filesAPI.upload(audioFile, "messages");

          if (uploadResponse.success) {
            const messageData = {
              conversationId: conversationId,
              content: "",
              messageType: "audio",
              fileUrl: uploadResponse.data.url,
              metadata: {
                fileName: uploadResponse.data.fileName,
                fileSize: uploadResponse.data.size,
                mimeType: uploadResponse.data.mimeType || "audio/webm",
                ...(replyTo && {
                  replyTo: {
                    messageId: replyTo.id,
                    sender: replyTo.sender,
                    text: replyTo.message || replyTo.text,
                  },
                }),
              },
            };
            const response = await messagesAPI.send(messageData);
            if (response.success) {
              const newMsg = {
                id: response.data.messageId,
                sender: "You",
                message: "",
                time: new Date(response.data.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                isOwn: true,
                messageType: "audio",
                fileUrl: response.data.fileUrl,
                metadata: response.data.metadata || {},
              };
              setMessages((prev) => [...prev, newMsg]);

              if (socket) {
                socket.emit("message:send", {
                  chatId: conversationId,
                  messageId: response.data.messageId,
                  senderId: localStorage.getItem("userId"),
                  content: response.data.content,
                  messageType: response.data.messageType,
                  fileUrl: response.data.fileUrl,
                  metadata: response.data.metadata,
                  createdAt: response.data.createdAt,
                  sender: JSON.parse(localStorage.getItem("user") || "{}"),
                });
              }
            }
          }
        } catch (err) {
          console.error("Audio upload error:", err);
          showError("Failed to upload audio recording.");
        }
      }

      // 4. Handle Multiple Files
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            const uploadResponse = await filesAPI.upload(file, "messages");

            if (uploadResponse.success) {
              let mType = "file";
              if (file.type.startsWith("image/")) mType = "image";
              else if (file.type.startsWith("video/")) mType = "video";
              else if (file.type.startsWith("audio/")) mType = "audio";

              const messageData = {
                conversationId: conversationId,
                content: i === 0 ? text || "" : "",
                messageType: mType,
                fileUrl: uploadResponse.data.url,
                metadata: {
                  fileName: uploadResponse.data.fileName,
                  fileSize: uploadResponse.data.size,
                  mimeType: uploadResponse.data.mimeType,
                  originalName: file.name,
                  ...(i === 0 &&
                    replyTo && {
                      replyTo: {
                        messageId: replyTo.id,
                        sender: replyTo.sender,
                        text: replyTo.message || replyTo.text,
                      },
                    }),
                },
              };

              const response = await messagesAPI.send(messageData);
              if (response.success) {
                const newMsg = {
                  id: response.data.messageId,
                  sender: "You",
                  message: response.data.content,
                  time: new Date(response.data.createdAt).toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  ),
                  isOwn: true,
                  messageType: response.data.messageType,
                  fileUrl: response.data.fileUrl,
                  metadata: response.data.metadata || {},
                };
                setMessages((prev) => [...prev, newMsg]);

                if (socket) {
                  socket.emit("message:send", {
                    chatId: conversationId,
                    messageId: response.data.messageId,
                    senderId: localStorage.getItem("userId"),
                    content: response.data.content,
                    messageType: response.data.messageType,
                    fileUrl: response.data.fileUrl,
                    metadata: response.data.metadata,
                    createdAt: response.data.createdAt,
                    sender: JSON.parse(localStorage.getItem("user") || "{}"),
                  });
                }
              }
            }
          } catch (err) {
            console.error(`File upload error for ${file.name}:`, err);
            showError(`Failed to upload ${file.name}`);
          }
        }
      }

      setReplyTo(null);
    } catch (error) {
      console.error("Error sending message:", error);
      showError("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    setHasMore(true);
    fetchMessages(0, true, searchQuery);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setPage(0);
    setHasMore(true);
    fetchMessages(0, true, "");
  };

  const handleEdit = async (msg, newContent) => {
    try {
      if (!newContent) return;

      const response = await messagesAPI.update(msg.id, newContent);
      if (response.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id ? { ...m, message: newContent, edited: true } : m
          )
        );

        if (socket) {
          socket.emit("message:edit", {
            chatId: conversationId,
            messageId: msg.id,
            content: newContent,
          });
        }
      }
    } catch (error) {
      console.error("Error editing message:", error);
      showError("Failed to edit message. Please try again.");
    }
  };

  const handleDelete = async (msg) => {
    try {
      await messagesAPI.delete(msg.id);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isDeleted: true } : m))
      );

      if (socket) {
        socket.emit("message:delete", {
          chatId: conversationId,
          messageId: msg.id,
        });
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      showError("Failed to delete message. Please try again.");
    }
  };

  const handleReact = (msg, emoji) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msg.id) {
          const current = m.reactions || [];
          const isRemoving = current.includes(emoji);

          // Update to only ONE reaction
          const updated = isRemoving ? [] : [emoji];

          // Emit socket event for real-time update
          if (socket && conversationId) {
            socket.emit("message:react", {
              chatId: conversationId,
              messageId: msg.id,
              emoji,
              action: isRemoving ? "remove" : "add",
            });
          }

          return { ...m, reactions: updated };
        }
        return m;
      })
    );
  };

  const handlePin = async (msg) => {
    const newPinnedState = !msg.isPinned;
    try {
      // Optimistic update
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, isPinned: newPinnedState } : m
        )
      );

      // API call to persist
      if (newPinnedState) {
        await messagesAPI.pin(msg.id);
      } else {
        await messagesAPI.unpin(msg.id);
      }

      // Socket notification for others
      if (socket) {
        socket.emit(newPinnedState ? "message:pin" : "message:unpin", {
          chatId: conversationId,
          messageId: msg.id,
        });
      }
    } catch (error) {
      console.error("Error pinning message:", error);
      showError("Failed to update pin. Please try again.");
      // Rollback
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, isPinned: !newPinnedState } : m
        )
      );
    }
  };

  const handleGoToMessage = async (messageId) => {
    if (!messageId) return;
    console.log("[Navigation] Looking for messageId:", messageId);
    setGroupInfoOpen(false);

    // 1. Check if it's already in the list
    if (messageListRef.current) {
      const found = messageListRef.current.scrollToMessageId(messageId);
      if (found) {
        console.log("[Navigation] Found immediately");
        return;
      }
    }

    // 2. If not found, load more until we find it or reach the end
    let currentHasMore = hasMore;
    let attempts = 0;
    let lastLength = messages.length;

    console.log("[Navigation] Not in current view, loading history...");

    while (currentHasMore && attempts < 15) {
      const response = await loadMoreMessages();
      attempts++;

      // Wait for React state & Virtuoso update
      await new Promise((resolve) => setTimeout(resolve, 600));

      console.log(
        `[Navigation] Batch ${attempts} loaded. Current messages: ${messages.length}`
      );

      if (messageListRef.current) {
        const found = messageListRef.current.scrollToMessageId(messageId);
        if (found) {
          console.log("[Navigation] Found after loading batch", attempts);
          return;
        }
      }

      // Safeguard: if length didn't change and we thought we had more, stop
      if (messages.length === lastLength) {
        console.log("[Navigation] No new messages received, stopping search.");
        break;
      }
      lastLength = messages.length;
      currentHasMore =
        response?.success && response.data?.length === messagesPerPage;
    }

    console.log("[Navigation] Message not found after searching history.");
    showError("Message not found in history.");
  };
  const handleImageClick = (src) => {
    setLightboxSrc(src);
    setLightboxOpen(true);
  };

  if (!groupData) {
    return (
      <div className="flex h-full w-full gradient-bg backdrop-blur-sm items-center justify-center">
        <div className="text-center p-8 rounded-3xl gradient-bg-subtle border border-stroke/30 backdrop-blur-md shadow-xl">
          <p className="text-body dark:text-bodydark text-lg font-medium">
            Select a group to start chatting
          </p>
        </div>
      </div>
    );
  }

  const memberCount = members.length;
  const onlineCount = members.filter((m) => m.user?.isOnline).length;

  const group = {
    id: groupData.id || groupData.conversation?.conversationId,
    name: groupData.name || groupData.conversation?.groupName || "Group",
    avatar: groupData.avatar || groupData.conversation?.groupImageUrl || null,
    conversation: groupData.conversation,
    memberCount,
    onlineCount,
  };

  return (
    <div className="flex h-full w-full gradient-bg overflow-hidden transition-all duration-300 backdrop-blur-md">
      <div className="flex-1 flex flex-col h-full border-l border-stroke/20 dark:border-strokedark/20 overflow-hidden">
        <ChatHeader
          chatData={group}
          isGroup={true}
          onBack={onBack}
          onOpenBackground={() => setChatBackgroundOpen(true)}
          onProfileClick={() => setGroupInfoOpen((prev) => !prev)}
          onEdit={() => setGroupInfoOpen(true)}
          onVideoCall={handleVideoCall}
          onAudioCall={handleAudioCall}
          isSearchOpen={isSearching}
          onSearchToggle={() => setIsSearching(!isSearching)}
          messages={messages}
          onGoToMessage={handleGoToMessage}
        />
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">
              Loading messages...
            </p>
          </div>
        ) : (
          <MessageList
            ref={messageListRef}
            messages={messages}
            currentBackground={currentBackground}
            onReply={(msg) => {
              setEditingMessage(null);
              setReplyTo(msg);
            }}
            onReact={handleReact}
            onPin={handlePin}
            onEdit={(msg) => {
              setReplyTo(null);
              setEditingMessage(msg);
            }}
            onDelete={handleDelete}
            onImageClick={handleImageClick}
            onLoadMore={loadMoreMessages}
            onGoToMessage={handleGoToMessage}
            hasMore={hasMore}
            loadingMore={loadingMore}
            typingIndicator={
              typingUser ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                  {typingUser} is typing...
                </div>
              ) : null
            }
          />
        )}
        <ChatInput
          onSend={handleSend}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          onEdit={handleEdit}
          disabled={sending}
          socket={socket}
          conversationId={conversationId}
        />
      </div>

      {groupInfoOpen && (
        <div className="fixed md:relative inset-y-0 right-0 w-full md:w-[320px] h-full flex-shrink-0 border-l border-stroke/20 gradient-bg-sidebar z-50 md:z-20 shadow-lg animate-fade-in overflow-hidden backdrop-blur-md">
          <GroupInfo
            handleToggleGroupInfo={() => setGroupInfoOpen(false)}
            groupData={group}
            onGoToMessage={handleGoToMessage}
            onMediaClick={handleImageClick}
            onLeaveGroup={() => {
              setGroupInfoOpen(false);
              // Reload to refresh the chat list
              window.location.reload();
            }}
          />
        </div>
      )}

      {lightboxOpen && (
        <MediaLightbox
          src={lightboxSrc}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <ChatBackground
        isOpen={chatBackgroundOpen}
        onClose={() => setChatBackgroundOpen(false)}
        currentBackground={currentBackground}
        onSelectBackground={handleSetBackground}
      />
    </div>
  );
}
