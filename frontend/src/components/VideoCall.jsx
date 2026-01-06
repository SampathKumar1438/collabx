import { useEffect, useRef } from "react";
import {
  Phone,
  VideoCamera,
  VideoCameraSlash,
  Microphone,
  MicrophoneSlash,
  SpeakerHigh,
  SpeakerSlash,
  User,
} from "@phosphor-icons/react";
import { useCall } from "../contexts/CallContext";
import Avatar from "./common/Avatar";

function VideoCall() {
  const {
    call,
    callState,
    localStream,
    remoteStream,
    remoteStreams,
    participantInfo,
    endCall,
    isMuted,
    setIsMuted,
    isVideoEnabled,
    setIsVideoEnabled,
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Attach streams to video elements
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoEnabled]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

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
  const participantName = call.recipient?.name || call.caller?.name || "User";
  const participantAvatar = call.recipient?.avatar || call.caller?.avatar;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-semibold">
              {participantName}
            </h2>
            <p className="text-white/70 text-sm mt-1">
              {callState === "outgoing"
                ? "Calling..."
                : callState === "ringing"
                ? "Incoming Call..."
                : "Connected"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      {/* Main Video Area */}
      <div className="flex-1 relative flex items-center justify-center bg-gray-900 overflow-hidden">
        {/* Render Remote Videos (Grid or Single) */}
        {(() => {
          // 1-to-1 Mode (Backward Compatible or optimized single view)
          if (!call.isGroup || !remoteStreams || remoteStreams.size <= 1) {
            let streamToRender = remoteStream;
            if (call.isGroup && remoteStreams && remoteStreams.size > 0) {
              streamToRender = Array.from(remoteStreams.values())[0];
            }

            return (
              <>
                <video
                  ref={(el) => {
                    if (el && streamToRender) el.srcObject = streamToRender;
                  }}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${
                    !streamToRender || !isVideoCall
                      ? "opacity-0 pointer-events-none absolute"
                      : ""
                  }`}
                />

                {/* Audio-Only Placeholder for Remote */}
                {(!streamToRender || !isVideoCall) && (
                  <div className="flex flex-col items-center justify-center absolute inset-0">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 mb-6 bg-gray-800">
                      <Avatar
                        src={participantAvatar}
                        alt={participantName}
                        size="custom"
                        className="w-full h-full"
                      />
                    </div>
                    <h3 className="text-white text-2xl font-semibold mb-2">
                      {participantName}
                    </h3>
                    <p className="text-white/60 animate-pulse">
                      {callState === "connected"
                        ? isVideoCall
                          ? "Waiting for video..."
                          : "Voice Connected"
                        : "Connecting..."}
                    </p>
                  </div>
                )}
              </>
            );
          }

          // Group Mode (Grid)
          const streams = Array.from(remoteStreams.entries()); // [socketId, stream]
          const gridCols =
            streams.length > 4
              ? "grid-cols-3"
              : streams.length > 1
              ? "grid-cols-2"
              : "grid-cols-1";

          return (
            <div
              className={`grid ${gridCols} gap-4 p-4 w-full h-full max-h-screen overflow-hidden`}
            >
              {streams.map(([socketId, stream]) => {
                const participant = participantInfo.get(socketId) || {};
                const participantName = participant.name || "User";
                const participantAvatar = participant.avatar;

                return (
                  <div
                    key={socketId}
                    className="relative bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-white/10"
                  >
                    <video
                      ref={(el) => {
                        if (el) el.srcObject = stream;
                      }}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />

                    {/* Participant name label */}
                    <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1.5 rounded-lg text-white text-sm font-medium backdrop-blur-sm flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full overflow-hidden">
                        <Avatar
                          src={participantAvatar}
                          alt={participantName}
                          size="custom"
                          className="w-full h-full"
                        />
                      </div>
                      {participantName}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Local Video (PiP) - Only for Video Calls */}
        {isVideoCall && isVideoEnabled && (
          <div className="absolute bottom-24 right-6 w-32 h-48 md:w-48 md:h-64 bg-black rounded-xl overflow-hidden border-2 border-white/20 shadow-lg z-20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted // Always mute local video to prevent echo
              className="w-full h-full object-cover mirror-mode"
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-8">
        <div className="flex items-center justify-center gap-6">
          {/* Microphone */}
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-all ${
              isMuted
                ? "bg-white text-black"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            {isMuted ? (
              <MicrophoneSlash size={32} weight="fill" />
            ) : (
              <Microphone size={32} weight="fill" />
            )}
          </button>

          {/* End Call */}
          <button
            onClick={endCall}
            className="p-5 rounded-full bg-red-500 hover:bg-red-600 transition-all text-white shadow-lg transform hover:scale-105"
          >
            <Phone size={32} weight="fill" className="rotate-[135deg]" />
          </button>

          {/* Video Toggle (Only if Video Call) */}
          {isVideoCall && (
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-all ${
                !isVideoEnabled
                  ? "bg-white text-black"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {isVideoEnabled ? (
                <VideoCamera size={32} weight="fill" />
              ) : (
                <VideoCameraSlash size={32} weight="fill" />
              )}
            </button>
          )}
        </div>
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
