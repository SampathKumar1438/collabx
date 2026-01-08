import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Camera,
  FloppyDisk,
  ArrowLeft,
  Envelope,
  ChatCircle,
} from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import { filesAPI } from "../services/api";
import ImageCropperModal from "../components/ImageCropperModal";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import Alert from "../components/common/Alert";
import Sidebar from "../section/chat/Sidebar";

export default function ProfileEdit() {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [tempImageUrl, setTempImageUrl] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();

  // Load current user data
  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setBio(user.bio || "");
      setPreviewUrl(user.profilePictureUrl || null);
    }
  }, [user]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImageUrl(reader.result);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedBlob) => {
    // Convert blob to file
    const croppedFile = new File([croppedBlob], "profile.jpg", {
      type: "image/jpeg",
    });
    setProfilePicture(croppedFile);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(croppedBlob);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    try {
      setLoading(true);

      let profilePictureUrl = user?.profilePictureUrl;

      // Upload new profile picture if selected
      if (profilePicture) {
        const uploadResponse = await filesAPI.upload(
          profilePicture,
          "profiles"
        );
        if (uploadResponse.success) {
          profilePictureUrl = uploadResponse.data.url;
        }
      }

      // Update profile
      await updateProfile({
        username: username.trim(),
        bio: bio.trim(),
        profilePictureUrl,
      });

      setSuccess(true);
      // Redirect to profile page after 1 second to show success message
      setTimeout(() => {
        navigate("/profile");
      }, 1000);
    } catch (err) {
      console.error("Profile update error:", err);
      setError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden relative">
      <div className="flex h-full w-full relative z-10 overflow-hidden">
        {/* Sidebar - Consistent with Chat.jsx */}
        <div className="hidden md:flex flex-shrink-0">
          <Sidebar onNavigate={() => {}} currentView={3} />
        </div>

        {/* Main Content - Full Height No Scroll */}
        <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
          {/* Header */}
          <div className="flex-shrink-0 gradient-bg-header border-b border-stroke/20 dark:border-strokedark/20 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/profile")}
                className="hover:bg-gray-2 dark:hover:bg-boxdark-2 rounded-full p-2 transition-colors"
                aria-label="Go back to profile"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-black dark:text-white leading-tight">
                  Edit Profile
                </h1>
                <p className="text-xs text-body dark:text-bodydark">
                  Update your personal details
                </p>
              </div>
            </div>
          </div>

          {/* Edit Form - 2 Column Layout */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-hidden p-6">
            <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Photo & Basic Rights */}
              <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2">
                <div className="bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/10 dark:from-primary/10 dark:via-secondary/10 dark:to-primary/20 rounded-2xl p-8 border border-primary/20 flex flex-col items-center text-center">
                  <div className="relative group mb-4">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-strokedark shadow-xl ring-4 ring-primary/20">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center relative bg-gradient-to-b from-[#E8E0D5] to-[#D0C8BD] dark:from-[#4A4A4A] dark:to-[#3A3A3A]">
                          {/* WhatsApp-style silhouette */}
                          <div className="absolute inset-0 flex items-end justify-center overflow-hidden">
                            <div
                              className="absolute bottom-0 w-[70%] h-[45%] rounded-t-full bg-[#C5BDB2] dark:bg-[#5A5A5A]"
                              style={{ transform: "translateY(15%)" }}
                            />
                          </div>
                          <div
                            className="absolute rounded-full bg-[#C5BDB2] dark:bg-[#5A5A5A]"
                            style={{ width: "35%", height: "35%", top: "22%" }}
                          />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-opacity-90 hover:scale-110 transition-all border-2 border-white dark:border-boxdark"
                    >
                      <Camera size={18} weight="bold" />
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-black dark:text-white mb-1">
                    Profile Photo
                  </h3>
                  <p className="text-xs text-body dark:text-bodydark mb-4">
                    Allowed *.jpeg, *.jpg, *.png, *.gif <br /> max size of 5 MB
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>

                {/* Basic Info Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                      Username
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        maxLength={50}
                        required
                        className="pl-12"
                      />
                      <User
                        size={20}
                        className="absolute left-4 top-4 text-body dark:text-bodydark"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                      Email Address
                    </label>
                    <div className="relative opacity-70">
                      <Input
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="pl-12 cursor-not-allowed bg-gray dark:bg-boxdark-2"
                      />
                      <Envelope
                        size={20}
                        className="absolute left-4 top-4 text-body dark:text-bodydark"
                      />
                      <span className="absolute right-4 top-4 text-xs font-medium text-body dark:text-bodydark bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                        Locked
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Bio & Save */}
              <div className="flex flex-col h-full overflow-y-auto pl-2">
                <div className="flex-1 space-y-4">
                  <div className="h-full flex flex-col">
                    <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                      Bio
                    </label>
                    <div className="relative flex-1">
                      <textarea
                        rows={12}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Write a little bit about yourself..."
                        maxLength={500}
                        className="w-full h-full rounded-xl border border-stroke bg-transparent py-4 pl-12 pr-6 outline-none focus:border-primary focus-visible:shadow-none dark:border-strokedark dark:bg-boxdark-2 dark:focus:border-primary resize-none"
                      ></textarea>
                      <ChatCircle
                        size={20}
                        className="absolute left-4 top-4 text-body dark:text-bodydark"
                      />
                      <div className="absolute bottom-4 right-4 text-xs text-body dark:text-bodydark bg-white dark:bg-boxdark-2 px-2 py-1 rounded-md border border-stroke dark:border-strokedark">
                        {bio.length}/500
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="mt-6 flex flex-col gap-4">
                  {error && (
                    <Alert
                      type="error"
                      message={error}
                      onClose={() => setError("")}
                    />
                  )}

                  {success && (
                    <Alert
                      type="success"
                      message="Profile updated successfully! Redirecting..."
                    />
                  )}

                  <Button
                    type="submit"
                    disabled={loading || !username.trim()}
                    loading={loading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-lg"
                  >
                    <FloppyDisk size={24} />
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Image Cropper Modal */}
      {showCropper && tempImageUrl && (
        <ImageCropperModal
          image={tempImageUrl}
          onCropComplete={handleCropComplete}
          onClose={() => {
            setShowCropper(false);
            setTempImageUrl(null);
          }}
        />
      )}
    </div>
  );
}
