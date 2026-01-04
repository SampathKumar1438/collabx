import { useState, useRef, useEffect } from "react";
import ChatBackground from "../../components/ChatBackground";
import ChatHeader from "../../components/chat/ChatHeader";
import ChatInput from "../../components/chat/ChatInput";
import MessageList from "../../components/chat/MessageList";
import MediaLightbox from "../../components/MediaLightbox";
import ConfirmModal from "../../components/ConfirmModal";

const AI_RESPONSES = [
  "That's an interesting perspective! Tell me more.",
  "I can certainly help with that. Here's what I found...",
  "Could you clarify what you mean by that?",
  "I'm just a demo AI, but I'm learning every day! 🤖",
  "Generating that for you... just kidding, I'm a static response for now!",
  "Hello! How can I assist you today?",
];

const TypingIndicator = () => (
  <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl rounded-tl-none p-4 shadow-sm border border-stroke/20 dark:border-strokedark/20 flex items-center gap-3 animate-fade-in">
    <div className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
    </div>
    <span className="text-sm font-medium text-body dark:text-bodydark animate-pulse">
      AI is thinking...
    </span>
  </div>
);

export default function AIChat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm your AI Assistant. How can I help you today?",
      sender: "ai",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatBackgroundOpen, setChatBackgroundOpen] = useState(false);
  const [currentBackground, setCurrentBackground] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const savedBg = localStorage.getItem("chat_bg_ai");
    if (savedBg) {
      try {
        setCurrentBackground(JSON.parse(savedBg));
      } catch (e) {}
    }
  }, []);

  const handleSetBackground = (bg) => {
    setCurrentBackground(bg);
    bg
      ? localStorage.setItem("chat_bg_ai", JSON.stringify(bg))
      : localStorage.removeItem("chat_bg_ai");
  };

  const handleSend = ({ text }) => {
    if (!text) return;
    const newMsg = {
      id: Date.now(),
      text: text,
      sender: "user",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isOwn: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const responseText =
        AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)];
      const aiMsg = {
        id: Date.now() + 1,
        text: responseText,
        sender: "ai",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000);
  };

  const handleClearChat = () => {
    setShowClearConfirm(true);
  };

  const confirmClearChat = () => {
    setMessages([
      {
        id: Date.now(),
        text: "Chat history cleared. How can I help?",
        sender: "ai",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setShowClearConfirm(false);
  };

  const handleDelete = (msg) =>
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));

  const handleReact = (msg, emoji) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msg.id) {
          const current = m.reactions || [];
          const updated = current.includes(emoji)
            ? current.filter((r) => r !== emoji)
            : [...current, emoji];
          return { ...m, reactions: updated };
        }
        return m;
      })
    );
  };

  const handlePin = (msg) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isPinned: !m.isPinned } : m))
    );
  };

  const handleImageClick = (src) => {
    setLightboxSrc(src);
    setLightboxOpen(true);
  };

  return (
    <div className="flex h-full flex-col w-full gradient-bg backdrop-blur-md">
      <ChatHeader
        chatData={{
          name: "AI Assistant",
          status: "Always here for you",
          isOnline: true,
        }}
        isAI={true}
        onOpenBackground={() => setChatBackgroundOpen(true)}
        onDelete={handleClearChat}
        onSearch={() => console.log("Search AI")}
      />

      <MessageList
        messages={messages}
        currentBackground={currentBackground}
        onReply={setReplyTo}
        onDelete={handleDelete}
        onReact={handleReact}
        onPin={handlePin}
        onImageClick={handleImageClick}
        typingIndicator={isTyping ? <TypingIndicator /> : null}
      />

      <ChatInput
        onSend={handleSend}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />

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

      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={confirmClearChat}
        title="Clear Conversation"
        message="Are you sure you want to clear the entire conversation? This action cannot be undone."
        confirmText="Clear"
        confirmVariant="danger"
      />
    </div>
  );
}
