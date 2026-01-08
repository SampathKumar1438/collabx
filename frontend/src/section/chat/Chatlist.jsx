import { useState, useEffect } from "react";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { Virtuoso } from "react-virtuoso";
import { conversationsAPI, usersAPI } from "../../services/api";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import Avatar from "../../components/common/Avatar";
import Input from "../../components/common/Input";
import Modal from "../../components/common/Modal";

function Chatlist({ onChatSelect, selectedChatId }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typingStatus, setTypingStatus] = useState({}); // { chatId: "Typing..." }

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const limit = 20;

  const { socket } = useSocket();
  const { user } = useAuth();
  const { error: showError } = useToast();

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations(true);
  }, []);

  // Socket Event Listeners
  useEffect(() => {
    if (!socket) return;

    const handlePresenceUpdate = ({ userId, isOnline }) => {
      setConversations((prev) =>
        prev.map((conv) => {
          const updatedParticipants = conv.participants.map((p) => {
            if (p.userId === userId) {
              return {
                ...p,
                user: {
                  ...p.user,
                  isOnline,
                  lastActiveAt: isOnline
                    ? p.user.lastActiveAt
                    : new Date().toISOString(),
                },
              };
            }
            return p;
          });
          return { ...conv, participants: updatedParticipants };
        })
      );
    };

    const handleNewMessage = (message) => {
      setConversations((prev) => {
        // Find existing conversation
        const convIndex = prev.findIndex(
          (c) => c.conversationId === message.chatId
        );

        if (convIndex === -1) {
          // New conversation
          fetchConversations();
          return prev;
        }

        const updatedConv = { ...prev[convIndex] };
        updatedConv.messages = [message, ...(updatedConv.messages || [])]; // Prepend new message with safety check

        // Increment unread count if not selected AND message is not from self
        const currentUserId = localStorage.getItem("userId");
        const isFromSelf =
          String(message.senderId || message.sender?.userId) ===
          String(currentUserId);

        if (updatedConv.conversationId !== selectedChatId && !isFromSelf) {
          updatedConv.unreadCount = (updatedConv.unreadCount || 0) + 1;
        }

        // Move to top
        const newConversations = [...prev];
        newConversations.splice(convIndex, 1);
        newConversations.unshift(updatedConv);

        return newConversations;
      });

      // Confirm delivery
      socket.emit("message:received", {
        chatId: message.chatId,
        messageId: message.messageId,
      });
    };

    const handleTypingStart = ({ chatId, username }) => {
      setTypingStatus((prev) => ({
        ...prev,
        [chatId]: `${username} is typing...`,
      }));
    };

    const handleTypingStop = ({ chatId }) => {
      setTypingStatus((prev) => {
        const newState = { ...prev };
        delete newState[chatId];
        return newState;
      });
    };

    const handleNewConversation = (conversation) => {
      setConversations((prev) => {
        if (
          prev.find((c) => c.conversationId === conversation.conversationId)
        ) {
          return prev;
        }
        // Join the new chat room for real-time updates
        socket.emit("join:chat", { chatId: conversation.conversationId });
        return [conversation, ...prev];
      });
    };

    const handleMessageRead = ({ chatId, userId }) => {
      // Only clear unread count if the current user is the one who read the message
      const currentUserId = localStorage.getItem("userId");
      if (String(userId) === String(currentUserId)) {
        setConversations((prev) =>
          prev.map((conv) => {
            if (conv.conversationId === chatId) {
              return { ...conv, unreadCount: 0 };
            }
            return conv;
          })
        );
      }
    };

    socket.on("user:presence", handlePresenceUpdate);
    socket.on("message:new", handleNewMessage);
    socket.on("conversation:new", handleNewConversation);
    socket.on("user:typing", handleTypingStart);
    socket.on("user:stopped_typing", handleTypingStop);
    socket.on("message:read", handleMessageRead);

    return () => {
      socket.off("user:presence", handlePresenceUpdate);
      socket.off("message:new", handleNewMessage);
      socket.off("conversation:new", handleNewConversation);
      socket.off("user:typing", handleTypingStart);
      socket.off("user:stopped_typing", handleTypingStop);
      socket.off("message:read", handleMessageRead);
    };
  }, [socket]);

  // Auto-select chat if selectedChatId exists (e.g. from URL)
  useEffect(() => {
    if (selectedChatId && conversations.length > 0) {
      const conversation = conversations.find(
        (c) => c.conversationId === selectedChatId
      );

      if (conversation) {
        const chatData = {
          id: conversation.conversationId,
          name: getConversationName(conversation),
          avatar: getConversationAvatar(conversation),
          message: getLastMessage(conversation),
          time: conversation.messages?.[0]?.createdAt
            ? formatTime(conversation.messages[0].createdAt)
            : formatTime(conversation.createdAt),
          isOnline:
            conversation.participants.find(
              (p) => p.userId !== localStorage.getItem("userId")
            )?.user?.isOnline || false,
          lastActiveAt:
            conversation.participants.find(
              (p) => p.userId !== localStorage.getItem("userId")
            )?.user?.lastActiveAt || null,
          conversation: conversation,
          userId: conversation.participants.find(
            (p) => p.userId !== localStorage.getItem("userId")
          )?.userId,
        };
        // Use a timeout to avoid render cycle warnings
        setTimeout(() => {
          onChatSelect && onChatSelect(chatData);
        }, 0);
      }
    }
  }, [selectedChatId, conversations]);

  // Search contacts when typing
  useEffect(() => {
    if (contactSearch.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchContacts(contactSearch);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setContacts([]);
    }
  }, [contactSearch]);

  const fetchConversations = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(0);
      } else {
        setFetchingMore(true);
      }
      setError(null);

      const offset = reset ? 0 : page * limit;
      const response = await conversationsAPI.getAll(limit, offset, "private");

      if (response.success) {
        if (reset) {
          setConversations(response.data);
          setPage(1);
        } else {
          setConversations((prev) => {
            const newConvs = response.data.filter(
              (newC) =>
                !prev.some((p) => p.conversationId === newC.conversationId)
            );
            return [...prev, ...newConvs];
          });
          setPage((prev) => prev + 1);
        }
        setHasMore(response.data.length === limit);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
      if (reset) setError("Failed to load conversations");
    } finally {
      if (reset) setLoading(false);
      else setFetchingMore(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading && !fetchingMore && !searchQuery) {
      fetchConversations(false);
    }
  };

  const searchContacts = async (query) => {
    try {
      const response = await usersAPI.search(query);
      if (response.success) {
        const currentUserId = localStorage.getItem("userId");
        const filteredContacts = response.data.filter(
          (contact) => String(contact.userId) !== String(currentUserId)
        );
        setContacts(filteredContacts);
      }
    } catch (err) {
      console.error("Error searching contacts:", err);
    }
  };

  const handleStartChat = async (contact) => {
    try {
      // Create a private conversation with the selected contact
      const response = await conversationsAPI.create({
        type: "private",
        memberIds: [contact.userId],
      });

      if (response.success) {
        const conversation = response.data;
        // Transform to match expected format
        const chatData = {
          id: conversation.conversationId,
          name:
            conversation.participants.find((p) => p.userId === contact.userId)
              ?.user?.username || contact.username,
          avatar:
            conversation.participants.find((p) => p.userId === contact.userId)
              ?.user?.profilePictureUrl || contact.profilePictureUrl,
          isOnline:
            conversation.participants.find((p) => p.userId === contact.userId)
              ?.user?.isOnline || false,
          conversation: conversation,
          userId: contact.userId,
        };
        onChatSelect && onChatSelect(chatData);
        setShowNewChat(false);
        setContactSearch("");
        fetchConversations(); // Refresh list
      }
    } catch (err) {
      console.error("Error starting chat:", err);
      showError("Failed to start chat. Please try again.");
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  const getConversationName = (conversation) => {
    if (conversation.type === "group") {
      return conversation.groupName || "Group Chat";
    }
    // For private chats, get the other participant's name
    const otherParticipant = conversation.participants.find(
      (p) => p.userId !== localStorage.getItem("userId")
    );
    return otherParticipant?.user?.username || "Unknown User";
  };

  const getConversationAvatar = (conversation) => {
    if (conversation.type === "group") {
      return conversation.groupImageUrl || null;
    }
    const otherParticipant = conversation.participants.find(
      (p) => p.userId !== localStorage.getItem("userId")
    );
    return otherParticipant?.user?.profilePictureUrl || null;
  };

  const getLastMessage = (conversation) => {
    // user typing status overrides last message
    if (typingStatus[conversation.conversationId]) {
      return typingStatus[conversation.conversationId];
    }

    if (conversation.messages && conversation.messages.length > 0) {
      const lastMsg = conversation.messages[0];
      if (lastMsg.messageType === "text") {
        return lastMsg.content || "";
      }
      return `📎 ${lastMsg.messageType}`;
    }
    return "No messages yet";
  };

  const filteredConversations = conversations.filter((conv) => {
    const name = getConversationName(conv).toLowerCase();
    const message = getLastMessage(conv).toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || message.includes(query);
  });

  return (
    <div className="flex h-full flex-col w-full relative gradient-bg-sidebar border-r border-stroke/20 dark:border-strokedark/20">
      {/* Header */}
      <div className="flex-none h-[72px] border-b border-stroke/10 px-6 flex items-center justify-between gradient-bg-header backdrop-blur-md">
        <div className="flex items-center gap-2">
          <h3 className="text-2xl font-bold text-black dark:text-white">
            Chats
          </h3>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
            {conversations.length}
          </span>
        </div>
        <button
          onClick={() => setShowNewChat(true)}
          className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/20 text-primary transition-colors"
          aria-label="New Chat"
        >
          <Plus size={20} weight="bold" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex-none p-5 gradient-bg-subtle">
        <div className="relative group">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-stroke/30 bg-white/60 dark:bg-black/30 py-2.5 pl-10 pr-4 outline-none focus:ring-4 focus:ring-primary/20 dark:text-white transition-all backdrop-blur-sm shadow-sm"
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-white">
            <MagnifyingGlass size={18} />
          </span>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 px-3 pb-4 min-h-0">
        {loading && conversations.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500 dark:text-white">
              Loading conversations...
            </p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <Virtuoso
            style={{ height: "100%" }}
            data={filteredConversations}
            endReached={loadMore}
            overscan={200}
            className="custom-scrollbar"
            itemContent={(index, conversation) => {
              const chatData = {
                id: conversation.conversationId,
                name: getConversationName(conversation),
                avatar: getConversationAvatar(conversation),
                message: getLastMessage(conversation),
                time: conversation.messages?.[0]?.createdAt
                  ? formatTime(conversation.messages[0].createdAt)
                  : formatTime(conversation.createdAt),
                isOnline:
                  conversation.participants.find(
                    (p) => p.userId !== localStorage.getItem("userId")
                  )?.user?.isOnline || false,
                lastActiveAt:
                  conversation.participants.find(
                    (p) => p.userId !== localStorage.getItem("userId")
                  )?.user?.lastActiveAt || null,
                conversation: conversation,
                userId: conversation.participants.find(
                  (p) => p.userId !== localStorage.getItem("userId")
                )?.userId,
              };

              const isTyping = !!typingStatus[conversation.conversationId];

              return (
                <div
                  key={conversation.conversationId}
                  onClick={() => {
                    setConversations((prev) =>
                      prev.map((c) =>
                        c.conversationId === conversation.conversationId
                          ? { ...c, unreadCount: 0 }
                          : c
                      )
                    );
                    onChatSelect && onChatSelect(chatData);
                  }}
                  className={`flex items-center gap-4 p-3 mb-1 rounded-2xl cursor-pointer transition-all duration-300 group backdrop-blur-sm border border-transparent ${
                    selectedChatId === conversation.conversationId
                      ? "bg-primary/20 border-primary/30 text-primary shadow-lg ring-1 ring-primary/20"
                      : "hover:bg-white/10 dark:hover:bg-black/20 text-black dark:text-white hover:border-white/10"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar
                      src={chatData.avatar}
                      alt={chatData.name}
                      isOnline={chatData.isOnline}
                      size="lg"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h5
                        className={`font-bold text-base truncate ${
                          selectedChatId === conversation.conversationId
                            ? "text-white"
                            : "text-black dark:text-slate-100"
                        }`}
                      >
                        {chatData.name}
                      </h5>
                      <span
                        className={`text-xs font-medium ${
                          selectedChatId === conversation.conversationId
                            ? "text-white/80"
                            : "text-gray-500 dark:text-white"
                        }`}
                      >
                        {chatData.time}
                      </span>
                    </div>
                    <div className="flex justify-between items-center w-full">
                      <p
                        className={`text-sm truncate flex-1 ${
                          selectedChatId === conversation.conversationId
                            ? "text-white/90 font-medium"
                            : isTyping
                            ? "text-primary dark:text-primary"
                            : "text-gray-600 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white"
                        }`}
                      >
                        {chatData.message}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <div
                          className={`ml-2 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            selectedChatId === conversation.conversationId
                              ? "bg-white text-primary"
                              : "bg-primary text-white"
                          }`}
                        >
                          {conversation.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }}
          />
        )}
      </div>

      {/* New Chat / Contacts Modal Overlay */}
      <Modal
        isOpen={showNewChat}
        onClose={() => {
          setShowNewChat(false);
          setContactSearch("");
          setContacts([]);
        }}
        title="New Chat"
      >
        <div className="flex flex-col h-[400px]">
          {/* Search */}
          <div className="mb-4">
            <Input
              placeholder="Search contacts..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              icon={MagnifyingGlass}
              autoFocus
            />
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
            {contactSearch.length < 2 ? (
              <div className="text-center py-8 text-gray-500 dark:text-white">
                Type at least 2 characters to search
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-white">
                No contacts found
              </div>
            ) : (
              <>
                <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2">
                  Search Results
                </div>
                {contacts.map((contact) => (
                  <div
                    key={contact.userId}
                    onClick={() => handleStartChat(contact)}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-boxdark-2 cursor-pointer transition-colors"
                  >
                    <Avatar
                      src={contact.profilePictureUrl}
                      alt={contact.username}
                      isOnline={contact.isOnline}
                      size="md"
                    />
                    <div>
                      <h4 className="text-sm font-semibold text-black dark:text-white">
                        {contact.username}
                      </h4>
                      <p className="text-xs text-gray-500">{contact.email}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Chatlist;
