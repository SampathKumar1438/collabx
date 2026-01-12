import { useCall } from "../contexts/CallContext";
import VideoCall from "./VideoCall";
import AudioCall from "./AudioCall";
import { Phone, VideoCamera } from "@phosphor-icons/react";

export default function CallOverlay() {
  const { call, callState, answerCall, rejectCall } = useCall();

  if (callState === "idle" || !call) return null;

  if (callState === "incoming") {
    const isVideo = call.isVideo;
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black animate-fade-in">
        <div className="bg-white dark:bg-boxdark rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center gap-5 border border-stroke dark:border-strokedark">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-primary/20">
            {call.caller?.avatar ? (
              <img
                src={call.caller.avatar}
                alt={call.caller.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary flex items-center justify-center text-white text-3xl font-bold">
                {call.caller?.name?.[0] || "?"}
              </div>
            )}
          </div>

          <div className="text-center">
            <h3 className="text-lg font-bold text-black dark:text-white">
              {call.caller?.name || "Unknown"}
            </h3>
            <p className="text-body dark:text-bodydark flex items-center justify-center gap-2 mt-1 text-sm">
              {isVideo ? (
                <VideoCamera size={18} weight="fill" />
              ) : (
                <Phone size={18} weight="fill" />
              )}
              Incoming {isVideo ? "Video" : "Voice"} Call...
            </p>
          </div>

          <div className="flex items-center gap-6 w-full justify-center mt-1">
            <button
              onClick={rejectCall}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all duration-300">
                <Phone size={24} weight="fill" className="rotate-[135deg]" />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Decline
              </span>
            </button>

            <button
              onClick={answerCall}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-500 group-hover:bg-green-500 group-hover:text-white transition-all duration-300 animate-bounce">
                <Phone size={24} weight="fill" />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Accept
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Call (Outgoing or Connected)
  if (
    callState === "outgoing" ||
    callState === "connected" ||
    callState === "ringing"
  ) {
    // Re-use VideoCall component for both Video and Audio interfaces (Audio just hides local video)
    return call.isVideo ? <VideoCall /> : <AudioCall />;
  }

  return null;
}
