import { useState, useEffect } from "react";
import {
  Phone,
  Microphone,
  MicrophoneSlash,
  SpeakerHigh,
  SpeakerSlash,
  Users,
  User,
} from "@phosphor-icons/react";
import Avatar from "./common/Avatar";

function AudioCall({ participants = [], onEndCall, isGroup = false }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState("connecting"); // connecting, ringing, connected

  // Timer for call duration
  useEffect(() => {
    // Simulate call connecting
    const connectTimer = setTimeout(() => {
      setCallStatus("ringing");
    }, 1000);

    const answerTimer = setTimeout(() => {
      setCallStatus("connected");
    }, 3000);

    return () => {
      clearTimeout(connectTimer);
      clearTimeout(answerTimer);
    };
  }, []);

  useEffect(() => {
    if (callStatus === "connected") {
      const timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [callStatus]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Default single participant if none provided
  const defaultParticipant = {
    id: 1,
    name: "Sarah Johnson",
    avatar: null,
    status: "online",
  };

  const callParticipants =
    participants.length > 0 ? participants : [defaultParticipant];

  const getStatusText = () => {
    if (callStatus === "connecting") return "Connecting...";
    if (callStatus === "ringing") return "Ringing...";
    return formatDuration(callDuration);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-primary/90 via-primary to-primary/80 flex flex-col items-center justify-center">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6">
        {isGroup ? (
          // Group call UI
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-white/20 backdrop-blur-sm rounded-full mb-6">
              <Users size={64} weight="duotone" className="text-white" />
            </div>
            <h2 className="text-white text-3xl font-bold mb-2">
              Group Audio Call
            </h2>
            <p className="text-white/80 text-lg mb-4">
              {callParticipants.length} participants
            </p>

            {/* Participants list */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 max-h-48 overflow-auto">
              {callParticipants.map((participant, index) => (
                <div
                  key={participant.id}
                  className={`flex items-center gap-3 ${
                    index > 0 ? "mt-3" : ""
                  }`}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30">
                    <Avatar
                      src={participant.avatar}
                      alt={participant.name}
                      size="custom"
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-medium">{participant.name}</p>
                    <p className="text-white/60 text-sm">
                      {participant.status}
                    </p>
                  </div>
                  {!isMuted && participant.id === 1 && (
                    <div className="flex gap-0.5">
                      <div className="w-1 h-4 bg-white rounded-full animate-pulse"></div>
                      <div
                        className="w-1 h-6 bg-white rounded-full animate-pulse"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-1 h-5 bg-white rounded-full animate-pulse"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          // 1-on-1 call UI
          <div className="text-center mb-12">
            <div className="relative inline-block mb-8">
              {/* Main avatar */}
              <div className="relative z-10 w-48 h-48 rounded-full overflow-hidden border-8 border-white/20">
                <Avatar
                  src={callParticipants[0]?.avatar}
                  alt={callParticipants[0]?.name}
                  size="custom"
                  className="w-full h-full"
                />
              </div>

              {/* Animated rings */}
              {callStatus === "ringing" && (
                <>
                  <div className="absolute inset-0 w-48 h-48 rounded-full border-4 border-white/30 animate-ping"></div>
                  <div
                    className="absolute inset-0 w-48 h-48 rounded-full border-4 border-white/20 animate-ping"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                </>
              )}

              {/* Audio wave animation (when connected and not muted) */}
              {callStatus === "connected" && !isMuted && (
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                  <div className="w-2 h-8 bg-white rounded-full animate-pulse"></div>
                  <div
                    className="w-2 h-12 bg-white rounded-full animate-pulse"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-10 bg-white rounded-full animate-pulse"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-2 h-14 bg-white rounded-full animate-pulse"
                    style={{ animationDelay: "0.3s" }}
                  ></div>
                  <div
                    className="w-2 h-10 bg-white rounded-full animate-pulse"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                  <div
                    className="w-2 h-12 bg-white rounded-full animate-pulse"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                  <div
                    className="w-2 h-8 bg-white rounded-full animate-pulse"
                    style={{ animationDelay: "0.6s" }}
                  ></div>
                </div>
              )}
            </div>

            <h2 className="text-white text-4xl font-bold mb-3">
              {callParticipants[0]?.name}
            </h2>
            <p className="text-white/90 text-xl">{getStatusText()}</p>
          </div>
        )}

        {/* Call status indicator */}
        <div className="mb-8">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
              callStatus === "connected" ? "bg-success/20" : "bg-white/10"
            } backdrop-blur-sm`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                callStatus === "connected"
                  ? "bg-success animate-pulse"
                  : "bg-white animate-pulse"
              }`}
            ></div>
            <span className="text-white text-sm font-medium">
              {callStatus === "connected" ? "Connected" : "Connecting"}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          {/* Microphone */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-6 rounded-full transition-all shadow-xl ${
                isMuted
                  ? "bg-danger hover:bg-danger/90"
                  : "bg-white/20 hover:bg-white/30 backdrop-blur-sm"
              }`}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <MicrophoneSlash
                  size={32}
                  weight="fill"
                  className="text-white"
                />
              ) : (
                <Microphone size={32} weight="fill" className="text-white" />
              )}
            </button>
            <span className="text-white/80 text-xs">
              {isMuted ? "Unmute" : "Mute"}
            </span>
          </div>

          {/* End Call */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onEndCall}
              className="p-7 rounded-full bg-danger hover:bg-danger/90 transition-all shadow-2xl scale-110"
              aria-label="End call"
            >
              <Phone
                size={36}
                weight="fill"
                className="text-white rotate-135"
              />
            </button>
            <span className="text-white/80 text-xs">End Call</span>
          </div>

          {/* Speaker */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setIsSpeakerOff(!isSpeakerOff)}
              className={`p-6 rounded-full transition-all shadow-xl ${
                isSpeakerOff
                  ? "bg-danger hover:bg-danger/90"
                  : "bg-white/20 hover:bg-white/30 backdrop-blur-sm"
              }`}
              aria-label={isSpeakerOff ? "Speaker on" : "Speaker off"}
            >
              {isSpeakerOff ? (
                <SpeakerSlash size={32} weight="fill" className="text-white" />
              ) : (
                <SpeakerHigh size={32} weight="fill" className="text-white" />
              )}
            </button>
            <span className="text-white/80 text-xs">
              {isSpeakerOff ? "Speaker" : "Speaker"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AudioCall;
