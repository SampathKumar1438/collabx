import { useEffect, useRef, memo } from "react";
import {
  Phone,
  VideoCamera,
  VideoCameraSlash,
  Microphone,
  MicrophoneSlash,
} from "@phosphor-icons/react";
import { useCall } from "../contexts/CallContext";
import Avatar from "./common/Avatar";

// Separate component to handle individual video stream lifecycle
// using memo to prevent re-renders when props haven't changed
const VideoTile = memo(({ tile, isSpeaking, isVideoCall }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && tile.stream) {
      videoRef.current.srcObject = tile.stream;
    }
  }, [tile.stream]);

  return (
    <div
      className={`relative bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border-2 transition-all duration-200 aspect-video md:aspect-auto md:h-full ${
        isSpeaking
          ? "border-green-500 shadow-green-500/20 scale-[1.01]"
          : "border-white/5"
      }`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={tile.isLocal} // Always mute local
        className={`w-full h-full object-cover ${
          tile.isLocal ? "mirror-mode" : ""
        } ${!tile.videoEnabled || !isVideoCall ? "opacity-0" : ""}`}
      />

      {/* Avatar Fallback (Audio Only) */}
      {(!tile.videoEnabled || !isVideoCall) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-700">
          <div
            className={`w-24 h-24 rounded-full border-4 overflow-hidden mb-2 ${
              isSpeaking ? "border-green-500 animate-pulse" : "border-gray-500"
            }`}
          >
            <Avatar
              src={tile.avatar}
              alt={tile.name}
              size="custom"
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      {/* Info Overlay */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 max-w-full pr-3">
        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2">
          {tile.isLocal ? (
            <div className="text-xs font-bold text-gray-300">You</div>
          ) : (
            <div className="text-sm font-semibold truncate max-w-[120px]">
              {tile.name}
            </div>
          )}

          {/* Mic Status Icon (Visual only for now, mapped to speaking) */}
          {isSpeaking ? (
            <Microphone
              size={14}
              className="text-green-500 animate-pulse"
              weight="fill"
            />
          ) : (
            <div className="w-3.5 h-3.5 rounded-full bg-white/20" />
          )}
        </div>
      </div>

      {/* Speaking "Ring" Effect (Optional extra visual) */}
      {isSpeaking && (
        <div className="absolute inset-0 border-4 border-green-500/50 rounded-2xl pointer-events-none animate-pulse"></div>
      )}
    </div>
  );
});

function VideoCall() {
  const {
    call,
    callState,
    localStream,
    // remoteStream, // Deprecated in component logic favor of remoteStreams map
    remoteStreams,
    participantInfo,
    endCall,
    isMuted,
    setIsMuted,
    isVideoEnabled,
    setIsVideoEnabled,
    activeSpeakers,
  } = useCall();

  // No longer need refs here for single streams, as tiles handle themselves

  const toggleMute = () => {
    if (localStream) {
      const newMutedState = !isMuted;
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMutedState;
      });
      setIsMuted(newMutedState);
    }
  };

  // Helper to toggle video
  const toggleVideo = () => {
    if (localStream) {
      const newVideoState = !isVideoEnabled;
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = newVideoState;
      });
      setIsVideoEnabled(newVideoState);
    }
  };

  if (!call) return null;

  const isVideoCall = call.isVideo;

  // Combine all participants (Local + Remote) into a single array for the grid
  const tiles = [];

  // 1. Local User
  if (localStream) {
    tiles.push({
      id: "local",
      isLocal: true,
      name: "You",
      stream: localStream,
      videoEnabled: isVideoEnabled,
      avatar: null, // Could fetch local avatar if available in context
    });
  }

  // 2. Remote Users
  remoteStreams.forEach((stream, id) => {
    // For 1-to-1, id might be 'default-1-1' or actual socketId
    let info = participantInfo.get(id);

    // Fallback for 1-to-1 if participantInfo is missing
    if (!info && !call.isGroup) {
      info = {
        name: call.recipient?.name || call.caller?.name || "User",
        avatar: call.recipient?.avatar || call.caller?.avatar,
      };
    }

    tiles.push({
      id: id,
      isLocal: false,
      name: info?.name || "User",
      stream: stream,
      videoEnabled: true, // we assume true for remote unless we have signaling for it
      avatar: info?.avatar,
    });
  });

  // Calculate Grid Columns
  const count = tiles.length;
  let gridClass = "grid-cols-1";
  if (count > 1) gridClass = "grid-cols-1 md:grid-cols-2";
  if (count > 2) gridClass = "grid-cols-2 md:grid-cols-2";
  if (count > 4) gridClass = "grid-cols-2 md:grid-cols-3";
  if (count > 6) gridClass = "grid-cols-3 md:grid-cols-3";

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in text-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm text-sm font-medium">
            {call.isGroup ? "Group Call" : "Call"}
          </div>
          <div className="text-white/70 text-sm">
            {callState === "connected" ? "Connected" : "Connecting..."}
          </div>
        </div>
      </div>

      {/* Main Grid Area */}
      <div
        className={`flex-1 p-2 grid ${gridClass} gap-2 content-center overflow-y-auto`}
      >
        {tiles.map((tile) => (
          <VideoTile
            key={tile.id}
            tile={tile}
            isSpeaking={activeSpeakers.has(tile.id)}
            isVideoCall={isVideoCall}
          />
        ))}
      </div>

      {/* Controls Bar */}
      <div className="bg-black/90 backdrop-blur-lg p-3 flex justify-center items-center gap-4 z-10 border-t border-white/10">
        <button
          onClick={toggleMute}
          className={`p-3 rounded-full transition-all ${
            isMuted
              ? "bg-white text-black"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {isMuted ? (
            <MicrophoneSlash size={20} weight="fill" />
          ) : (
            <Microphone size={20} weight="fill" />
          )}
        </button>

        <button
          onClick={endCall}
          className="p-3 rounded-full bg-red-500 hover:bg-red-600 transition-all text-white shadow-lg hover:scale-105"
        >
          <Phone size={24} weight="fill" className="rotate-[135deg]" />
        </button>

        {isVideoCall && (
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-all ${
              !isVideoEnabled
                ? "bg-white text-black"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {!isVideoEnabled ? (
              <VideoCameraSlash size={20} weight="fill" />
            ) : (
              <VideoCamera size={20} weight="fill" />
            )}
          </button>
        )}
      </div>

      <style>{`
            .mirror-mode {
                transform: scaleX(-1);
            }
      `}</style>
    </div>
  );
}

export default VideoCall;
