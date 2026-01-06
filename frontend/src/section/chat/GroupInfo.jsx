import { useState, useEffect } from "react";
import {
  Users,
  X,
  FileText,
  UserPlus,
  Crown,
  ShieldCheck,
  Trash,
  Bell,
  SignOut,
  Image as ImageIcon,
  PushPin,
  DotsThree,
  ShieldStar,
  UserMinus,
  PencilSimple,
  Check,
  Camera,
} from "@phosphor-icons/react";
import {
  messagesAPI,
  conversationsAPI,
  usersAPI,
  filesAPI,
} from "../../services/api";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import ConfirmModal from "../../components/ConfirmModal";
import Avatar from "../../components/common/Avatar";
import ImageCropperModal from "../../components/ImageCropperModal";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { useRef } from "react";

export default function GroupInfo({
  handleToggleGroupInfo,
  groupData,
  onMediaClick,
  onGoToMessage,
  onLeaveGroup,
}) {
  const [activeTab, setActiveTab] = useState("members");
  const [mediaItems, setMediaItems] = useState([]);
  const [fileItems, setFileItems] = useState([]);
  const [pinnedItems, setPinnedItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState("member");
  const [expandedBio, setExpandedBio] = useState({});
  const [memberActionMenu, setMemberActionMenu] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedName, setEditedName] = useState(
    groupData?.name || groupData?.conversation?.groupName || ""
  );
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const imageInputRef = useRef(null);
  const editImageInputRef = useRef(null);

  // Confirm modal states
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null, // 'removeMember' | 'leaveGroup'
    data: null,
    isLoading: false,
  });

  const { socket } = useSocket();
  const { user } = useAuth();
  const {
    error: showError,
    warning: showWarning,
    success: showSuccess,
  } = useToast();
  const conversationId =
    groupData?.conversation?.conversationId || groupData?.id;

  // Sync editedName with groupData
  useEffect(() => {
    setEditedName(groupData?.name || groupData?.conversation?.groupName || "");
  }, [groupData]);

  // Fetch data when tab changes
  useEffect(() => {
    if (!conversationId) return;

    if (activeTab === "members") {
      fetchMembers();
    } else if (activeTab === "media") {
      fetchMedia();
    } else if (activeTab === "files") {
      fetchFiles();
    } else if (activeTab === "pinned") {
      fetchPinned();
    }
  }, [activeTab, conversationId]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleNewMessage = (messageData) => {
      if (messageData.chatId !== conversationId) return;

      if (
        messageData.messageType === "image" ||
        messageData.messageType === "video"
      ) {
        const newMediaItem = {
          messageId: messageData.messageId,
          messageType: messageData.messageType,
          fileUrl: messageData.fileUrl,
          metadata: messageData.metadata || {},
          createdAt: messageData.createdAt,
          sender: messageData.sender,
        };
        setMediaItems((prev) => [newMediaItem, ...prev]);
      }

      if (
        messageData.messageType === "file" ||
        messageData.messageType === "audio"
      ) {
        const newFileItem = {
          messageId: messageData.messageId,
          messageType: messageData.messageType,
          fileUrl: messageData.fileUrl,
          metadata: messageData.metadata || {},
          createdAt: messageData.createdAt,
          sender: messageData.sender,
        };
        setFileItems((prev) => [newFileItem, ...prev]);
      }
    };

    socket.on("message:new", handleNewMessage);

    const handleMessagePinned = ({ messageId, isPinned, message }) => {
      if (isPinned) {
        if (message) {
          setPinnedItems((prev) => [message, ...prev]);
        } else {
          fetchPinned();
        }
      } else {
        setPinnedItems((prev) =>
          prev.filter((m) => m.id !== messageId && m.messageId !== messageId)
        );
      }
    };

    socket.on("message:pinned", handleMessagePinned);

    // Listen for role changes
    const handleRoleChanged = ({
      conversationId: changedConvId,
      userId: changedUserId,
      newRole,
    }) => {
      if (changedConvId !== conversationId) return;

      setMembers((prev) =>
        prev.map((m) =>
          m.userId === changedUserId ? { ...m, role: newRole } : m
        )
      );

      if (changedUserId === user?.userId) {
        setCurrentUserRole(newRole);
      }
    };

    socket.on("group:role_changed", handleRoleChanged);

    const handleMemberAdded = ({ conversationId: convId }) => {
      if (convId === conversationId) fetchMembers();
    };

    const handleMemberRemoved = ({ conversationId: convId }) => {
      if (convId === conversationId) fetchMembers();
    };

    socket.on("group:member_added", handleMemberAdded);
    socket.on("group:member_removed", handleMemberRemoved);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:pinned", handleMessagePinned);
      socket.off("group:role_changed", handleRoleChanged);
      socket.off("group:member_added", handleMemberAdded);
      socket.off("group:member_removed", handleMemberRemoved);
    };
  }, [socket, conversationId, user?.userId]);

  // Search users for adding to group
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timeoutId = setTimeout(async () => {
        try {
          const response = await usersAPI.search(searchQuery);
          if (response.success) {
            const currentUserId = localStorage.getItem("userId");
            const filtered = response.data.filter(
              (u) =>
                !members.some((m) => m.userId === u.userId) &&
                String(u.userId) !== String(currentUserId)
            );
            setSearchResults(filtered);
          }
        } catch (error) {
          console.error("Error searching users:", error);
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, members]);

  const fetchMembers = async () => {
    if (!conversationId) return;
    try {
      setLoading(true);
      const response = await conversationsAPI.getById(conversationId);
      if (response.success && response.data.participants) {
        setMembers(response.data.participants);
        const currentUser = response.data.participants.find(
          (p) => p.userId === user?.userId
        );
        if (currentUser) setCurrentUserRole(currentUser.role);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
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

  const handleAddMember = async (userId) => {
    if (!conversationId || currentUserRole !== "admin") return;
    try {
      const response = await conversationsAPI.addParticipants(conversationId, [
        userId,
      ]);
      if (response.success) {
        fetchMembers();
        setSearchQuery("");
        setSearchResults([]);
        setShowAddMember(false);
        showSuccess("Member added successfully");
      }
    } catch (error) {
      console.error("Error adding member:", error);
      showError("Failed to add member. Please try again.");
    }
  };

  const handleRemoveMember = (userId) => {
    if (!conversationId || currentUserRole !== "admin") return;
    if (userId === user?.userId) {
      showWarning(
        "You cannot remove yourself. Use the Leave Group option instead."
      );
      return;
    }

    // Find member name for display
    const member = members.find((m) => m.userId === userId);
    const memberName = member?.user?.username || "this member";

    setConfirmModal({
      isOpen: true,
      type: "removeMember",
      data: { userId, memberName },
      isLoading: false,
    });
  };

  const confirmRemoveMember = async () => {
    const { userId } = confirmModal.data;
    setConfirmModal((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await conversationsAPI.removeParticipants(
        conversationId,
        [userId]
      );
      if (response.success) {
        fetchMembers();
        setMemberActionMenu(null);
        showSuccess("Member removed from group");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      showError("Failed to remove member. Please try again.");
    } finally {
      setConfirmModal({
        isOpen: false,
        type: null,
        data: null,
        isLoading: false,
      });
    }
  };

  const handlePromoteToAdmin = async (userId) => {
    if (!conversationId || currentUserRole !== "admin") return;
    try {
      const response = await conversationsAPI.updateParticipantRole(
        conversationId,
        userId,
        "admin"
      );
      if (response.success) {
        setMembers((prev) =>
          prev.map((m) => (m.userId === userId ? { ...m, role: "admin" } : m))
        );
        setMemberActionMenu(null);
        showSuccess("Member promoted to admin");
      }
    } catch (error) {
      console.error("Error promoting member:", error);
      showError("Failed to promote member. Please try again.");
    }
  };

  const handleDemoteToMember = async (userId) => {
    if (!conversationId || currentUserRole !== "admin") return;
    if (userId === groupData?.conversation?.createdBy) {
      showWarning("Cannot demote the group creator");
      return;
    }
    try {
      const response = await conversationsAPI.updateParticipantRole(
        conversationId,
        userId,
        "member"
      );
      if (response.success) {
        setMembers((prev) =>
          prev.map((m) => (m.userId === userId ? { ...m, role: "member" } : m))
        );
        setMemberActionMenu(null);
        showSuccess("Admin demoted to member");
      }
    } catch (error) {
      console.error("Error demoting member:", error);
      showError("Failed to demote member. Please try again.");
    }
  };

  const toggleBio = (userId) => {
    setExpandedBio((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleLeaveGroup = () => {
    if (!conversationId) return;

    // Creator cannot leave
    if (groupData?.conversation?.createdBy === user?.userId) {
      showWarning(
        "Group creator cannot leave. Please delete the group instead."
      );
      return;
    }

    setConfirmModal({
      isOpen: true,
      type: "leaveGroup",
      data: {
        groupName:
          groupData?.name || groupData?.conversation?.groupName || "this group",
      },
      isLoading: false,
    });
  };

  const handleDeleteGroup = () => {
    if (!conversationId) return;

    setConfirmModal({
      isOpen: true,
      type: "deleteGroup",
      data: {
        groupName:
          groupData?.name || groupData?.conversation?.groupName || "this group",
      },
      isLoading: false,
    });
  };

  const confirmDeleteGroup = async () => {
    setConfirmModal((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await conversationsAPI.delete(conversationId);
      if (response.success) {
        showSuccess("Group deleted successfully");
        onLeaveGroup && onLeaveGroup(); // Close the panel/navigate back
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      showError(
        error.response?.data?.error ||
          "Failed to delete group. Please try again."
      );
    } finally {
      setConfirmModal({
        isOpen: false,
        type: null,
        data: null,
        isLoading: false,
      });
    }
  };

  const confirmLeaveGroup = async () => {
    setConfirmModal((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await conversationsAPI.leaveGroup(conversationId);
      if (response.success) {
        showSuccess("You have left the group");
        onLeaveGroup && onLeaveGroup();
      }
    } catch (error) {
      console.error("Error leaving group:", error);
      showError(
        error.response?.data?.error ||
          "Failed to leave group. Please try again."
      );
    } finally {
      setConfirmModal({
        isOpen: false,
        type: null,
        data: null,
        isLoading: false,
      });
    }
  };

  const closeConfirmModal = () => {
    if (!confirmModal.isLoading) {
      setConfirmModal({
        isOpen: false,
        type: null,
        data: null,
        isLoading: false,
      });
    }
  };

  const handleConfirmAction = () => {
    if (confirmModal.type === "removeMember") {
      confirmRemoveMember();
    } else if (confirmModal.type === "leaveGroup") {
      confirmLeaveGroup();
    } else if (confirmModal.type === "deleteGroup") {
      confirmDeleteGroup();
    }
  };

  const [pendingImageBlob, setPendingImageBlob] = useState(null);
  const [pendingImagePreview, setPendingImagePreview] = useState(null);

  // ... (keep refs)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (showEditModal) {
      setEditedName(
        groupData?.name || groupData?.conversation?.groupName || ""
      );
      setPendingImageBlob(null);
      setPendingImagePreview(null);
    }
  }, [showEditModal, groupData]);

  // ... (keep existing useEffects)

  // ... (keep search/fetch functions)

  // ... (keep member management functions)

  const handleSaveChanges = async () => {
    if (
      !editedName.trim() ||
      (editedName === (groupData?.name || groupData?.conversation?.groupName) &&
        !pendingImageBlob)
    ) {
      setShowEditModal(false);
      return;
    }

    try {
      setIsUpdating(true);
      let imageUrl =
        groupData?.avatar || groupData?.conversation?.groupImageUrl;

      // 1. Upload image if changed
      if (pendingImageBlob) {
        const file = new File([pendingImageBlob], "group-avatar.jpg", {
          type: "image/jpeg",
        });
        const uploadResponse = await filesAPI.upload(file, "groups");
        if (uploadResponse.success) {
          imageUrl = uploadResponse.data.fileUrl;
        } else {
          throw new Error("Failed to upload image");
        }
      }

      // 2. Update Group Info (Name + Image)
      const updates = {};
      if (
        editedName.trim() !==
        (groupData?.name || groupData?.conversation?.groupName)
      ) {
        updates.groupName = editedName.trim();
      }
      if (
        imageUrl !==
        (groupData?.avatar || groupData?.conversation?.groupImageUrl)
      ) {
        updates.groupImageUrl = imageUrl;
      }

      if (Object.keys(updates).length > 0) {
        const response = await conversationsAPI.update(conversationId, updates);
        if (response.success) {
          showSuccess("Group info updated successfully");
          setShowEditModal(false);
          // Reset pending states
          setPendingImageBlob(null);
          setPendingImagePreview(null);
        }
      } else {
        setShowEditModal(false);
      }
    } catch (error) {
      console.error("Error updating group info:", error);
      showError("Failed to update group info");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showError("Image size should be less than 5MB");
        return;
      }
      const url = URL.createObjectURL(file);
      setTempImageUrl(url);
      setShowImageCropper(true);
    }
  };

  const handleCropComplete = (croppedBlob) => {
    // Just store state, don't upload yet
    setPendingImageBlob(croppedBlob);
    const previewUrl = URL.createObjectURL(croppedBlob);
    setPendingImagePreview(previewUrl);

    // Cleanup temp cropper url
    setShowImageCropper(false);
    if (tempImageUrl) URL.revokeObjectURL(tempImageUrl);
    setTempImageUrl(null);
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

  const isAdmin = currentUserRole === "admin";
  const isCreator = groupData?.conversation?.createdBy === user?.userId;
  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === "admin" && b.role !== "admin") return -1;
    if (a.role !== "admin" && b.role === "admin") return 1;
    return (a.user?.username || "").localeCompare(b.user?.username || "");
  });

  const bioTruncateLength = 50;

  return (
    <div className="border-l flex flex-col h-full border-stroke/20 dark:border-strokedark/20 gradient-bg-sidebar">
      {/* Header - Compact */}
      <div className="flex h-[72px] flex-shrink-0 items-center justify-between px-4 py-3 border-b border-stroke/10 gradient-bg-header backdrop-blur-md">
        <span className="text-lg font-bold text-black dark:text-white">
          Group Details
        </span>
        <button
          onClick={handleToggleGroupInfo}
          className="hover:bg-white/10 dark:hover:bg-black/20 dark:text-white rounded-full p-2 transition-all"
        >
          <X size={20} weight="bold" />
        </button>
      </div>

      {/* Group Info - Compact */}
      <div className="px-4 py-4 border-b border-stroke/10 dark:border-strokedark/20 flex items-center gap-4">
        <div className="relative group/avatar">
          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-stroke dark:ring-strokedark">
            <Avatar
              src={groupData?.avatar || groupData?.conversation?.groupImageUrl}
              alt={groupData?.name}
              size="custom"
              className="w-full h-full"
              isGroup
            />
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowEditModal(true)}
              className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
              title="Edit group"
            >
              <PencilSimple size={20} className="text-white" />
            </button>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-black dark:text-white truncate">
              {groupData?.name || groupData?.conversation?.groupName || "Group"}
            </h3>
            {isAdmin && (
              <button
                onClick={() => setShowEditModal(true)}
                className="p-1 text-gray-400 hover:text-primary dark:text-white hover:bg-primary/10 rounded-full transition-colors"
                title="Edit group"
              >
                <PencilSimple size={16} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm font-medium text-gray-600 dark:text-white flex items-center gap-1">
              <Users size={14} />
              {members.length} members
            </span>
            {isAdmin && (
              <span className="text-xs text-primary flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
                <Crown size={10} weight="fill" />
                Admin
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions - Compact Inline */}
      <div className="px-4 py-2 border-b border-stroke/10 dark:border-strokedark/20 flex gap-2">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stroke/20 dark:text-white dark:border-strokedark hover:bg-white/5 dark:hover:bg-black/10 transition-colors text-xs backdrop-blur-sm">
          <Bell size={14} />
          Mute
        </button>
        {isAdmin && (
          <button
            onClick={() => setShowAddMember(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary transition-colors text-xs"
          >
            <UserPlus size={14} />
            Add
          </button>
        )}
        {isCreator ? (
          <button
            onClick={handleDeleteGroup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-danger/30 bg-danger/5 hover:bg-danger/10 text-danger transition-colors text-xs"
          >
            <Trash size={14} />
            Delete
          </button>
        ) : (
          <button
            onClick={handleLeaveGroup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-danger/30 bg-danger/5 hover:bg-danger/10 text-danger transition-colors text-xs"
          >
            <SignOut size={14} />
            Leave
          </button>
        )}
      </div>

      {/* Tabs - Compact */}
      <div className="flex px-2 border-b border-stroke/10 dark:border-strokedark/20">
        {[
          { key: "members", label: "Members", count: members.length },
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
                      : "bg-white/10 dark:bg-black/20 dark:text-white"
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
            {/* Members Tab */}
            {activeTab === "members" && (
              <div className="space-y-1">
                {sortedMembers.map((member) => {
                  const memberBio = member.user?.bio;
                  const shouldTruncate =
                    memberBio && memberBio.length > bioTruncateLength;
                  const isExpanded = expandedBio[member.userId];
                  const isMemberCreator =
                    member.userId === groupData?.conversation?.createdBy;

                  return (
                    <div
                      key={member.userId}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 dark:hover:bg-black/5 transition-colors"
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <Avatar
                          src={member.user?.profilePictureUrl}
                          alt={member.user?.username}
                          size="md"
                        />
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-base font-medium text-black dark:text-white truncate">
                            {member.user?.username}
                            {member.userId === user?.userId && (
                              <span className="text-[10px] text-gray-400 ml-1">
                                (You)
                              </span>
                            )}
                          </span>
                          {isMemberCreator && (
                            <Crown
                              size={12}
                              weight="fill"
                              className="text-amber-500"
                              title="Creator"
                            />
                          )}
                          {member.role === "admin" && !isMemberCreator && (
                            <ShieldCheck
                              size={12}
                              weight="fill"
                              className="text-primary"
                              title="Admin"
                            />
                          )}
                        </div>
                        {memberBio && (
                          <p className="text-[11px] text-gray-500 dark:text-white leading-tight mt-0.5">
                            {shouldTruncate && !isExpanded ? (
                              <>
                                {memberBio.slice(0, bioTruncateLength)}...
                                <button
                                  onClick={() => toggleBio(member.userId)}
                                  className="text-primary ml-0.5"
                                >
                                  more
                                </button>
                              </>
                            ) : (
                              <>
                                {memberBio}
                                {shouldTruncate && (
                                  <button
                                    onClick={() => toggleBio(member.userId)}
                                    className="text-primary ml-0.5"
                                  >
                                    less
                                  </button>
                                )}
                              </>
                            )}
                          </p>
                        )}
                      </div>

                      {/* Admin Actions */}
                      {isAdmin && member.userId !== user?.userId && (
                        <div className="relative">
                          <button
                            onClick={() =>
                              setMemberActionMenu(
                                memberActionMenu === member.userId
                                  ? null
                                  : member.userId
                              )
                            }
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-boxdark dark:text-white rounded-full transition-colors"
                          >
                            <DotsThree size={18} weight="bold" />
                          </button>

                          {memberActionMenu === member.userId && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setMemberActionMenu(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded-lg shadow-xl py-1 min-w-[150px] animate-fade-in">
                                {member.role !== "admin" ? (
                                  <button
                                    onClick={() =>
                                      handlePromoteToAdmin(member.userId)
                                    }
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-primary/10 text-left"
                                  >
                                    <ShieldStar
                                      size={14}
                                      className="text-primary"
                                    />
                                    Make Admin
                                  </button>
                                ) : (
                                  !isMemberCreator && (
                                    <button
                                      onClick={() =>
                                        handleDemoteToMember(member.userId)
                                      }
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs dark:text-white hover:bg-warning/10 text-left"
                                    >
                                      <UserMinus
                                        size={14}
                                        className="text-warning"
                                      />
                                      Remove Admin
                                    </button>
                                  )
                                )}
                                <button
                                  onClick={() =>
                                    handleRemoveMember(member.userId)
                                  }
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-danger/10 text-danger text-left"
                                >
                                  <Trash size={14} />
                                  Remove
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Media Tab */}
            {activeTab === "media" && (
              <div className="grid grid-cols-3 gap-1.5">
                {mediaItems.length > 0 ? (
                  mediaItems.map((item) => (
                    <div
                      key={item.messageId}
                      className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg bg-gray-200 dark:bg-boxdark-2"
                      onClick={() => onMediaClick?.(item.fileUrl)}
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
                    <ImageIcon size={24} className="mx-auto mb-2 opacity-50" />
                    No media shared yet
                  </div>
                )}
              </div>
            )}

            {/* Files Tab */}
            {activeTab === "files" && (
              <div className="space-y-1">
                {fileItems.length > 0 ? (
                  fileItems.map((file) => (
                    <div
                      key={file.messageId}
                      className="flex items-center gap-2.5 p-2 hover:bg-gray-2 dark:hover:bg-boxdark-2 rounded-lg cursor-pointer"
                    >
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <FileText size={18} weight="duotone" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-black dark:text-white truncate">
                          {file.metadata?.originalName ||
                            file.metadata?.fileName ||
                            "File"}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {formatFileSize(file.metadata?.fileSize)} •{" "}
                          {formatDate(file.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 text-xs dark:text-white">
                    <FileText
                      size={24}
                      className="mx-auto mb-2 opacity-50 dark:text-white"
                    />
                    No files shared yet
                  </div>
                )}
              </div>
            )}

            {/* Pinned Tab */}
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
                        <span className="text-[9px] text-gray-500">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-black dark:text-white line-clamp-2">
                        {msg.content ||
                          (msg.messageType !== "text"
                            ? `[${msg.messageType}]`
                            : "")}
                      </p>
                      <span className="text-[9px] text-gray-500 mt-1">
                        By {msg.sender?.username || msg.sender}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 text-xs dark:text-white">
                    <PushPin
                      size={24}
                      className="mx-auto mb-2 opacity-50 dark:text-white"
                    />
                    No pinned messages
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="absolute inset-0 bg-white dark:bg-boxdark z-20 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-stroke dark:border-strokedark">
            <span className="font-semibold text-black dark:text-white">
              Add Member
            </span>
            <button
              onClick={() => {
                setShowAddMember(false);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="p-1 rounded-full hover:bg-gray-2 dark:hover:bg-boxdark-2"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-3 flex-1 overflow-y-auto">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-stroke bg-white py-2 px-3 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white mb-3"
              autoFocus
            />
            <div className="space-y-1">
              {searchResults.map((searchUser) => (
                <div
                  key={searchUser.userId}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-2 dark:hover:bg-boxdark-2 cursor-pointer"
                  onClick={() => handleAddMember(searchUser.userId)}
                >
                  <Avatar
                    src={searchUser.profilePictureUrl}
                    alt={searchUser.username}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black dark:text-white truncate">
                      {searchUser.username}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {searchUser.email}
                    </p>
                  </div>
                  <UserPlus size={16} className="text-primary" />
                </div>
              ))}
              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="text-center py-4 text-gray-500 text-xs">
                  No users found
                </p>
              )}
              {searchQuery.length < 2 && (
                <p className="text-center py-4 text-gray-400 text-xs">
                  Type 2+ characters to search
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={handleConfirmAction}
        isLoading={confirmModal.isLoading}
        title={
          confirmModal.type === "removeMember"
            ? "Remove Member"
            : confirmModal.type === "leaveGroup"
            ? "Leave Group"
            : "Delete Group"
        }
        message={
          confirmModal.type === "removeMember"
            ? `Are you sure you want to remove ${confirmModal.data?.memberName} from the group?`
            : confirmModal.type === "leaveGroup"
            ? `Are you sure you want to leave ${confirmModal.data?.groupName}?`
            : `Are you sure you want to delete ${confirmModal.data?.groupName}? This action cannot be undone.`
        }
        confirmText={
          confirmModal.type === "removeMember"
            ? "Remove"
            : confirmModal.type === "leaveGroup"
            ? "Leave"
            : "Delete"
        }
        confirmVariant="danger"
      />

      {showEditModal && (
        <Modal
          isOpen={showEditModal}
          onClose={() => !isUpdating && setShowEditModal(false)}
          title="Edit Group Info"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowEditModal(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveChanges}
                loading={isUpdating}
                disabled={
                  (!editedName.trim() && !pendingImageBlob) || isUpdating
                }
              >
                Save Changes
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 bg-gray-100 dark:bg-boxdark-2">
                  <Avatar
                    src={
                      pendingImagePreview ||
                      groupData?.avatar ||
                      groupData?.conversation?.groupImageUrl
                    }
                    alt="Group"
                    size="custom"
                    className="w-full h-full"
                    isGroup
                  />
                </div>
                <button
                  onClick={() => editImageInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                >
                  <Camera size={16} weight="bold" />
                </button>
                <input
                  ref={editImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Click camera to change icon
              </p>
            </div>

            <Input
              label="Group Name"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder="Enter group name"
            />
          </div>
        </Modal>
      )}

      {showImageCropper && (
        <ImageCropperModal
          image={tempImageUrl}
          onCropComplete={handleCropComplete}
          onClose={() => {
            setShowImageCropper(false);
            if (tempImageUrl) URL.revokeObjectURL(tempImageUrl);
            setTempImageUrl(null);
          }}
          aspectRatio={1}
          circularCrop={true}
        />
      )}
    </div>
  );
}
