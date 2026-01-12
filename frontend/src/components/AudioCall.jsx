import { useState, useEffect, useRef } from "react";
import { Phone, Microphone, MicrophoneSlash } from "@phosphor-icons/react";
import Avatar from "./common/Avatar";
import { useCall } from "../contexts/CallContext";

function AudioCall() {
  const {
    call,
    callState,
    remoteStreams,
    participantInfo,
    endCall,
    isMuted,
    setIsMuted,
    activeSpeakers,
    localStream,
  } = useCall();

  const [callDuration, setCallDuration] = useState(0);

  // Timer for call duration
  useEffect(() => {
    let timer;
    if (callState === "connected") {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callState]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  if (!call) return null;

  // Build Tiles
  const tiles = [];

  // 1. Local
  if (localStream) {
    // Or just always show local user even if stream is loading
    tiles.push({
      id: "local",
      isLocal: true,
      name: "You",
      avatar: null, // Context could provide this
    });
  }

  // 2. Remote
  remoteStreams.forEach((_, id) => {
    let info = participantInfo.get(id);
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
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center animate-fade-in text-white">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/5 flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                callState === "connected"
                  ? "bg-green-500 animate-pulse"
                  : "bg-yellow-500"
              }`}
            ></div>
            <span className="text-sm font-medium tracking-wide">
              {callState === "connected"
                ? formatDuration(callDuration)
                : "Connecting..."}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Area */}
      <div
        className={`p-4 w-full max-w-7xl grid ${gridClass} gap-4 content-center flex-1 z-10 overflow-auto`}
      >
        {tiles.map((tile) => {
          const isSpeaking = activeSpeakers.has(tile.id);

          return (
            <div
              key={tile.id}
              className={`relative bg-white/5 backdrop-blur-md rounded-3xl border-2 transition-all duration-300 flex flex-col items-center justify-center aspect-square md:aspect-auto ${
                isSpeaking
                  ? "border-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] scale-[1.02]"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              {/* Avatar Circle */}
              <div className="relative mb-4">
                {/* Speaking Waves */}
                {isSpeaking && (
                  <>
                    <div className="absolute inset-0 rounded-full border-4 border-primary/40 animate-ping"></div>
                    <div className="absolute inset-[-10px] rounded-full border-2 border-primary/20 animate-pulse"></div>
                  </>
                )}

                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl relative z-10">
                  <Avatar
                    src={tile.avatar}
                    alt={tile.name}
                    size="custom"
                    className="w-full h-full"
                  />
                </div>
              </div>

              {/* Name & Status */}
              <div className="text-center">
                <h3 className="text-xl font-bold mb-1">{tile.name}</h3>
                <p className="text-white/50 text-sm flex items-center justify-center gap-1.5">
                  {isSpeaking ? (
                    <>
                      <Microphone
                        size={14}
                        weight="fill"
                        className="text-primary"
                      />
                      <span className="text-primary font-medium">
                        Speaking...
                      </span>
                    </>
                  ) : (
                    <>
                      {tile.isLocal && isMuted ? (
                        <MicrophoneSlash size={14} />
                      ) : (
                        <Microphone size={14} className="opacity-50" />
                      )}
                      <span>
                        {tile.isLocal && isMuted ? "Muted" : "Listening"}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="mb-4 flex items-center gap-4 z-20">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-4 rounded-full transition-all shadow-xl backdrop-blur-md border ${
            isMuted
              ? "bg-white text-black border-white"
              : "bg-black/40 text-white border-white/10 hover:bg-black/60"
          }`}
        >
          {isMuted ? (
            <MicrophoneSlash size={24} weight="fill" />
          ) : (
            <Microphone size={24} weight="fill" />
          )}
        </button>

        <button
          onClick={endCall}
          className="p-5 rounded-full bg-red-500 hover:bg-red-600 transition-all text-white shadow-2xl hover:scale-105 hover:shadow-red-500/30"
        >
          <Phone size={28} weight="fill" className="rotate-[135deg]" />
        </button>
      </div>
      {/* Hidden Audio Elements for Remote Streams */}
      {Array.from(remoteStreams).map(([id, stream]) => (
        <AudioStream key={id} stream={stream} />
      ))}
    </div>
  );
}

// Helper component to handle stream attachment
function AudioStream({ stream }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      controls={false}
      className="hidden"
    />
  );
}

export default AudioCall;
