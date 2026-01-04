import { useState, useEffect, lazy, Suspense } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../section/chat/Sidebar";

// Lazy load chat sections for code splitting
const Chatlist = lazy(() => import("../section/chat/Chatlist"));
const Inbox = lazy(() => import("../section/chat/Inbox"));
const GroupChatlist = lazy(() => import("../section/chat/GroupChatlist"));
const GroupInbox = lazy(() => import("../section/chat/GroupInbox"));
const AIChat = lazy(() => import("../section/chat/AIChat"));

// Loading component for lazy sections
const SectionLoader = () => (
  <div className="flex-1 flex items-center justify-center bg-transparent">
    <div className="text-center p-6 bg-white/50 dark:bg-boxdark/50 backdrop-blur-md rounded-2xl shadow-lg">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
        Loading...
      </p>
    </div>
  </div>
);

function Chat({ view = "dms" }) {
  const { conversationId, groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);

  // Determine current view from prop or URL
  const getCurrentView = () => {
    if (view === "dms" || location.pathname.startsWith("/messages")) return 0;
    if (view === "groups" || location.pathname.startsWith("/groups")) return 1;
    if (view === "ai" || location.pathname === "/ai-chat") return 2;
    return 0;
  };

  const currentView = getCurrentView();

  // Handle navigation from sidebar
  const handleNavigation = (viewKey) => {
    // Reset selections when switching views
    setSelectedGroup(null);
    setSelectedChat(null);

    switch (viewKey) {
      case 0:
        navigate("/messages");
        break;
      case 1:
        navigate("/groups");
        break;
      case 2:
        navigate("/ai-chat");
        break;
      case 3:
        navigate("/profile");
        break;
      default:
        break;
    }
  };

  // Handle group selection - update URL
  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    if (group?.id || group?.conversation?.conversationId) {
      const id = group.id || group.conversation.conversationId;
      navigate(`/groups/${id}`, { replace: true });
    }
  };

  // Handle chat selection - update URL
  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    if (chat?.id || chat?.conversation?.conversationId) {
      const id = chat.id || chat.conversation.conversationId;
      navigate(`/messages/${id}`, { replace: true });
    }
  };

  // Handle back navigation on mobile
  const handleBack = () => {
    setSelectedChat(null);
    setSelectedGroup(null);
    if (currentView === 0) {
      navigate("/messages", { replace: true });
    } else if (currentView === 1) {
      navigate("/groups", { replace: true });
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden relative bg-white dark:bg-boxdark">
      {/* Main Container */}
      <div className="flex h-full w-full overflow-hidden relative z-10">
        {/* Sidebar - Hidden on mobile if a chat is open */}
        <div
          className={`${
            conversationId || groupId ? "hidden md:flex" : "flex"
          } flex-shrink-0`}
        >
          <Sidebar onNavigate={handleNavigation} currentView={currentView} />
        </div>

        <div className="flex-1 flex overflow-hidden relative">
          {/* DMs View */}
          {currentView === 0 && (
            <Suspense fallback={<SectionLoader />}>
              <div className="flex-1 flex overflow-hidden w-full">
                <div
                  className={`${
                    conversationId ? "hidden md:flex" : "flex"
                  } w-full md:w-80 lg:w-96 xl:w-1/4 flex-shrink-0 border-r border-stroke/10 dark:border-strokedark/10`}
                >
                  <Chatlist
                    onChatSelect={handleChatSelect}
                    selectedChatId={selectedChat?.id || conversationId}
                  />
                </div>
                <div
                  className={`${
                    conversationId ? "flex" : "hidden md:flex"
                  } flex-1 h-full`}
                >
                  <Inbox chatData={selectedChat} onBack={handleBack} />
                </div>
              </div>
            </Suspense>
          )}

          {/* Groups View */}
          {currentView === 1 && (
            <Suspense fallback={<SectionLoader />}>
              <div className="flex-1 flex overflow-hidden w-full">
                <div
                  className={`${
                    groupId ? "hidden md:flex" : "flex"
                  } w-full md:w-80 lg:w-96 xl:w-1/4 flex-shrink-0 border-r border-stroke/10 dark:border-strokedark/10`}
                >
                  <GroupChatlist
                    onGroupSelect={handleGroupSelect}
                    selectedGroupId={selectedGroup?.id || groupId}
                  />
                </div>
                <div
                  className={`${
                    groupId ? "flex" : "hidden md:flex"
                  } flex-1 h-full`}
                >
                  <GroupInbox groupData={selectedGroup} onBack={handleBack} />
                </div>
              </div>
            </Suspense>
          )}

          {/* AI Chat View */}
          {currentView === 2 && (
            <Suspense fallback={<SectionLoader />}>
              <div className="flex-1 flex h-full">
                <AIChat />
              </div>
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}

export default Chat;
