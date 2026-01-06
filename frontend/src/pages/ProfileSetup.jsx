import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Camera, Check } from "@phosphor-icons/react";
import { formatFileUrl } from "../utils/formatFileUrl";
import { useAuth } from "../contexts/AuthContext";
import { filesAPI } from "../services/api";
import ImageCropperModal from "../components/ImageCropperModal";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import Alert from "../components/common/Alert";

export default function ProfileSetup() {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [tempImageUrl, setTempImageUrl] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();

  // Pre-fill username from signup data
  useEffect(() => {
    if (user?.username && !username) {
      setUsername(user.username);
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

    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    try {
      setLoading(true);

      let profilePictureUrl = null;

      // Upload profile picture if selected
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
        profileComplete: true,
      });

      // Redirect to chat
      navigate("/");
    } catch (err) {
      console.error("Profile setup error:", err);
      setError(err.message || "Failed to setup profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-white to-purple-50 dark:from-boxdark dark:via-boxdark dark:to-boxdark-2 p-4">
        <div className="w-full max-w-md min-h-fit flex flex-col">
          <div className="bg-white dark:bg-boxdark rounded-2xl shadow-xl p-6 border border-stroke dark:border-strokedark flex flex-col">
            {/* Header - Compact */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
                <User size={24} className="text-primary" weight="duotone" />
              </div>
              <h1 className="text-xl font-bold text-black dark:text-white mb-1">
                Complete Your Profile
              </h1>
              <p className="text-body dark:text-bodydark text-xs">
                One more step before you can start chatting
              </p>
            </div>

            {error && (
              <Alert
                type="error"
                message={error}
                onClose={() => setError("")}
              />
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Profile Picture - Compact */}
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-boxdark-2 border-2 border-white dark:border-strokedark shadow-md ring-2 ring-primary/10">
                    {previewUrl ? (
                      <img
                        src={formatFileUrl(previewUrl)}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20">
                        <User
                          size={32}
                          className="text-primary"
                          weight="duotone"
                        />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-opacity-90 transition-all group-hover:scale-110"
                  >
                    <Camera size={16} weight="bold" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
                <p className="mt-2 text-[10px] text-body dark:text-bodydark text-center">
                  Click camera to upload (optional, max 5MB)
                </p>
              </div>

              {/* Username */}
              <Input
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                maxLength={50}
                required
                helperText="This is how others will see you"
              />

              {/* Bio - Smaller */}
              <Input
                label="Bio (optional)"
                multiline
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                maxLength={500}
                helperText={`${bio.length}/500`}
              />

              {/* Submit Button - Always visible */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading || !username.trim()}
                  loading={loading}
                  fullWidth
                  size="lg"
                  icon={Check}
                >
                  Complete Setup
                </Button>
              </div>
            </form>

            {/* Footer */}
            <p className="mt-3 text-center text-[10px] text-body dark:text-bodydark">
              You can update these details anytime from settings
            </p>
          </div>
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
    </>
  );
}
