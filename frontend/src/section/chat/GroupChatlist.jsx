import { useState, useEffect, useRef } from "react";
import { Virtuoso } from "react-virtuoso";
import { MagnifyingGlass, Users, Plus, X, Camera } from "@phosphor-icons/react";
import { conversationsAPI, usersAPI, filesAPI } from "../../services/api";
import { useSocket } from "../../contexts/SocketContext";
import ImageCropperModal from "../../components/ImageCropperModal";
import { useToast } from "../../contexts/ToastContext";
import Avatar from "../../components/common/Avatar";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Modal from "../../components/common/Modal";

function GroupChatlist({ onGroupSelect, selectedGroupId }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const limit = 20;

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupImage, setNewGroupImage] = useState(null);
  const [groupImageFile, setGroupImageFile] = useState(null);
  const [groupImagePreview, setGroupImagePreview] = useState(null);
  const [tempImageUrl, setTempImageUrl] = useState(null);
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchUsers, setSearchUsers] = useState("");

  const imageInputRef = useRef(null);

  const { socket } = useSocket();
  const { error: showError, warning: showWarning } = useToast();

  // Fetch groups on mount
  useEffect(() => {
    fetchGroups(true);
  }, []);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      setGroups((prev) => {
        const groupIndex = prev.findIndex(
          (g) => g.conversationId === message.chatId
        );
        if (groupIndex === -1) return prev; // Message for a group not in list (or private)

        const updatedGroup = { ...prev[groupIndex] };
        updatedGroup.messages = [message, ...updatedGroup.messages]; // Prepend

        // Increment unread count if not selected
        if (
          selectedGroupId &&
          updatedGroup.conversationId !== selectedGroupId
        ) {
          updatedGroup.unreadCount = (updatedGroup.unreadCount || 0) + 1;
        }

        // Move to top
        const newGroups = [...prev];
        newGroups.splice(groupIndex, 1);
        newGroups.unshift(updatedGroup);

        return newGroups;
      });
    };

    const handleConversationUpdated = (updatedConv) => {
      setGroups((prev) =>
        prev.map((group) => {
          if (group.conversationId === updatedConv.conversationId) {
            return {
              ...group,
              groupName: updatedConv.groupName,
              groupImageUrl: updatedConv.groupImageUrl,
            };
          }
          return group;
        })
      );
    };

    const handleMessageRead = ({ chatId, userId }) => {
      const currentUserId = localStorage.getItem("userId");
      if (String(userId) === String(currentUserId)) {
        setGroups((prev) =>
          prev.map((group) => {
            if (group.conversationId === chatId) {
              return { ...group, unreadCount: 0 };
            }
            return group;
          })
        );
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:read", handleMessageRead);
    socket.on("conversation:updated", handleConversationUpdated);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:read", handleMessageRead);
      socket.off("conversation:updated", handleConversationUpdated);
    };
  }, [socket]);

  // Auto-select group if selectedGroupId exists (e.g. from URL)
  useEffect(() => {
    if (selectedGroupId && groups.length > 0) {
      const group = groups.find((g) => g.conversationId === selectedGroupId);

      if (group) {
        const groupData = {
          id: group.conversationId,
          name: group.groupName,
          avatar: group.groupImageUrl,
          conversation: group, // Pass the full group data
        };
        // Use a timeout to avoid render cycle warnings
        setTimeout(() => {
          onGroupSelect && onGroupSelect(groupData);
        }, 0);
      }
    }
  }, [selectedGroupId, groups]);

  // Search users when typing
  useEffect(() => {
    if (searchUsers.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchAvailableUsers(searchUsers);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setAvailableUsers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchUsers]);

  const fetchGroups = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(0);
      } else {
        setFetchingMore(true);
      }

      const offset = reset ? 0 : page * limit;
      const response = await conversationsAPI.getAll(limit, offset, "group");

      if (response.success) {
        if (reset) {
          setGroups(response.data);
          setPage(1);
        } else {
          setGroups((prev) => {
            const newGroups = response.data.filter(
              (newG) =>
                !prev.some((p) => p.conversationId === newG.conversationId)
            );
            return [...prev, ...newGroups];
          });
          setPage((prev) => prev + 1);
        }
        setHasMore(response.data.length === limit);
      }
    } catch (err) {
      console.error("Error fetching groups:", err);
    } finally {
      if (reset) setLoading(false);
      else setFetchingMore(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading && !fetchingMore && !searchQuery) {
      fetchGroups(false);
    }
  };

  const searchAvailableUsers = async (query) => {
    try {
      const response = await usersAPI.search(query);
      if (response.success) {
        const currentUserId = localStorage.getItem("userId");
        // Filter out already selected members AND the current user (creator)
        const filtered = response.data.filter(
          (user) =>
            !selectedMembers.some((m) => m.userId === user.userId) &&
            String(user.userId) !== String(currentUserId)
        );
        setAvailableUsers(filtered);
      }
    } catch (err) {
      console.error("Error searching users:", err);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showWarning("Image size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        showWarning("Please select a valid image file");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImageUrl(reader.result);
        setShowImageCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedBlob) => {
    const croppedFile = new File([croppedBlob], "group-icon.jpg", {
      type: "image/jpeg",
    });
    setGroupImageFile(croppedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setGroupImagePreview(reader.result);
    };
    reader.readAsDataURL(croppedBlob);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedMembers.length === 0) {
      showWarning("Please provide a group name and select at least one member");
      return;
    }

    try {
      let groupImageUrl = null;
      if (groupImageFile) {
        const uploadResponse = await filesAPI.upload(groupImageFile, "groups");
        if (uploadResponse.success) {
          groupImageUrl = uploadResponse.data.url;
        }
      }

      const memberIds = selectedMembers.map((m) => m.userId);
      const response = await conversationsAPI.create({
        type: "group",
        groupName: newGroupName.trim(),
        groupImageUrl: groupImageUrl,
        memberIds: memberIds,
      });

      if (response.success) {
        const group = response.data;
        const groupData = {
          id: group.conversationId,
          name: group.groupName,
          avatar: group.groupImageUrl,
          conversation: group,
        };
        onGroupSelect && onGroupSelect(groupData);
        setShowCreateGroup(false);
        setNewGroupName("");
        setNewGroupImage(null);
        setGroupImageFile(null);
        setGroupImagePreview(null);
        setSelectedMembers([]);
        setSearchUsers("");
        fetchGroups();
      }
    } catch (err) {
      console.error("Error creating group:", err);
      showError("Failed to create group. Please try again.");
    }
  };

  const addMember = (user) => {
    if (!selectedMembers.some((m) => m.userId === user.userId)) {
      setSelectedMembers((prev) => [...prev, user]);
      setSearchUsers("");
      setAvailableUsers([]);
    }
  };

  const removeMember = (userId) => {
    setSelectedMembers((prev) => prev.filter((m) => m.userId !== userId));
  };

  const getLastMessage = (conversation) => {
    if (conversation.messages && conversation.messages.length > 0) {
      const lastMsg = conversation.messages[0];
      if (lastMsg.messageType === "text") {
        return lastMsg.content || "";
      }
      return `📎 ${lastMsg.messageType}`;
    }
    return "No messages yet";
  };

  const filteredGroups = groups.filter((group) =>
    group.groupName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col w-full relative gradient-bg-sidebar border-r border-stroke/20 dark:border-strokedark/20">
      <div className="sticky h-[72px] border-b border-stroke/10 px-6 flex flex-row items-center justify-between gradient-bg-header backdrop-blur-md">
        <div className="flex items-center gap-2">
          <h3 className="text-2xl font-bold text-black dark:text-white">
            Group Chats
          </h3>
          <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary 2xl:ml-4">
            {groups.length}
          </span>
        </div>
        <button
          onClick={() => setShowCreateGroup(true)}
          className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/20 text-primary transition-colors"
          aria-label="Create new group"
        >
          <Plus size={20} weight="bold" />
        </button>
      </div>

      <div className="flex flex-1 flex-col min-h-0 gradient-bg-subtle">
        <div className="px-5 pt-5 pb-2">
          <form className="group" onSubmit={(e) => e.preventDefault()}>
            <div className="relative">
              <input
                type="text"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full"
                aria-label="Search group chats"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-body transition-colors duration-200 hover:text-primary dark:text-white"
                aria-label="Search"
              >
                <MagnifyingGlass size={20} weight="duotone" />
              </button>
            </div>
          </form>
        </div>

        <div className="flex-1 px-5 pb-5 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-500 dark:text-white">Loading groups...</p>
            </div>
          ) : (
            <Virtuoso
              style={{ height: "100%" }}
              data={filteredGroups}
              endReached={loadMore}
              overscan={200}
              className="no-scrollbar"
              itemContent={(index, group) => {
                const isSelected = selectedGroupId === group.conversationId;
                return (
                  <div
                    className={`flex items-center gap-4 p-3 mb-2 rounded-2xl cursor-pointer transition-all duration-300 group backdrop-blur-sm border border-transparent ${
                      isSelected
                        ? "bg-primary/20 border-primary/30 text-primary shadow-lg ring-1 ring-primary/20"
                        : "hover:bg-white/10 dark:hover:bg-black/20 text-black dark:text-white hover:border-white/10"
                    }`}
                    key={group.conversationId}
                    onClick={() => {
                      setGroups((prev) =>
                        prev.map((g) =>
                          g.conversationId === group.conversationId
                            ? { ...g, unreadCount: 0 }
                            : g
                        )
                      );
                      const groupData = {
                        id: group.conversationId,
                        name: group.groupName,
                        avatar: group.groupImageUrl,
                        conversation: group,
                      };
                      onGroupSelect(groupData);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && onGroupSelect(group)}
                    aria-label={`Group chat: ${group.groupName}`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar
                        src={group.groupImageUrl}
                        alt={group.groupName}
                        isGroup
                        size="lg"
                      />
                    </div>
                    <div className="flex-1 w-full min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="text-base font-bold text-black dark:text-slate-100 truncate">
                          {group.groupName}
                        </h5>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm text-gray-600 dark:text-white flex-1">
                          {getLastMessage(group)}
                        </p>
                        <div className="flex flex-col items-end ml-2">
                          <span className="text-xs font-medium text-gray-500 dark:text-white mb-0.5">
                            {group.participants?.length || 0} members
                          </span>
                          {group.unreadCount > 0 && (
                            <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
                              {group.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }}
              components={{
                EmptyPlaceholder: () =>
                  !loading && filteredGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                      <Users
                        size={48}
                        weight="duotone"
                        className="text-body/30 dark:text-bodydark/30 mb-3"
                      />
                      <p className="text-sm text-body dark:text-bodydark">
                        No groups found
                      </p>
                    </div>
                  ) : null,
              }}
            />
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      <Modal
        isOpen={showCreateGroup}
        onClose={() => {
          setShowCreateGroup(false);
          setNewGroupName("");
          setNewGroupImage(null);
          setSelectedMembers([]);
          setSearchUsers("");
        }}
        title="Create New Group"
        footer={
          <Button
            onClick={handleCreateGroup}
            disabled={!newGroupName.trim() || selectedMembers.length === 0}
            fullWidth
            size="lg"
          >
            Create Group
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Group Name */}
          <Input
            label="Group Name"
            placeholder="Enter group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            autoFocus
          />

          {/* Group Icon/Image */}
          <div>
            <label className="block mb-2 text-sm font-medium text-black dark:text-white">
              Group Icon (Optional)
            </label>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="flex justify-center items-center w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-boxdark-2 border-2 border-stroke dark:border-strokedark">
                  <Avatar
                    src={groupImagePreview}
                    alt="Group icon preview"
                    size="custom"
                    className="w-full h-full"
                    isGroup
                  />
                </div>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-opacity-90 transition-all group-hover:scale-110"
                >
                  <Camera size={14} weight="bold" />
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                >
                  {groupImagePreview ? "Change" : "Upload"} Icon
                </Button>
                <p className="mt-1 text-xs text-body dark:text-bodydark">
                  Max 5MB • Will be cropped to circle
                </p>
              </div>
            </div>
          </div>

          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div>
              <label className="block mb-2 text-sm font-medium text-black dark:text-white">
                Selected Members ({selectedMembers.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full"
                  >
                    <span className="text-sm text-black dark:text-white">
                      {member.username}
                    </span>
                    <button
                      onClick={() => removeMember(member.userId)}
                      className="text-danger hover:text-danger/80"
                    >
                      <X size={14} weight="bold" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Users */}
          <div>
            <Input
              label="Add Members"
              placeholder="Search users to add..."
              value={searchUsers}
              onChange={(e) => setSearchUsers(e.target.value)}
            />

            {availableUsers.length > 0 && (
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                {availableUsers.map((user) => (
                  <div
                    key={user.userId}
                    onClick={() => addMember(user)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-boxdark-2 cursor-pointer transition-colors"
                  >
                    <Avatar
                      src={user.profilePictureUrl}
                      alt={user.username}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-medium text-black dark:text-white">
                        {user.username}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Image Cropper Modal */}
      {showImageCropper && tempImageUrl && (
        <ImageCropperModal
          image={tempImageUrl}
          onCropComplete={handleCropComplete}
          onClose={() => {
            setShowImageCropper(false);
            setTempImageUrl(null);
          }}
        />
      )}
    </div>
  );
}

export default GroupChatlist;
