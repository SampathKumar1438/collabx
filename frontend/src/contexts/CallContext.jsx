import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useSocket } from "./SocketContext";
import callTune from "../assets/audio/microsoft_teams_call.mp3";
import toast from "react-hot-toast";
import { WarningCircle } from "@phosphor-icons/react";

const CallContext = createContext();

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
  const { socket } = useSocket();

  // Call State
  const [call, setCall] = useState(null); // { isIncoming, isVideo, caller, recipient, isGroup, chatId, ... }
  const [callState, setCallState] = useState("idle");
  const [localStream, setLocalStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // Group Call: Map of remote streams: socketId -> Stream
  const [remoteStreams, setRemoteStreams] = useState(new Map());

  // Participant info: socketId -> { name, avatar, userId }
  const [participantInfo, setParticipantInfo] = useState(new Map());

  // Legacy 1-to-1 remote stream state (computed from map or kept for backward compat)
  // We can just derive it or keep it sync. Let's use `remoteStreams` as source of truth.
  const remoteStream =
    remoteStreams.size > 0 ? Array.from(remoteStreams.values())[0] : null;

  const [isMuted, setIsMuted] = useState(false);

  // WebRTC Refs
  // Map socketId -> RTCPeerConnection
  const peerConnections = useRef(new Map());
  const localStreamRef = useRef(null);
  // Using local asset for Teams Ringtone
  const ringtoneRef = useRef(new Audio(callTune));

  const playRingtone = () => {
    try {
      ringtoneRef.current.loop = true;
      ringtoneRef.current
        .play()
        .catch((e) => console.log("Audio play failed", e));
    } catch (e) {
      console.error("Error playing ringtone", e);
    }
  };

  const playOutgoingRingtone = () => {
    // Optionally use a different sound for outgoing, but user requested 'microsoft_teams_call' logic
    playRingtone();
  };

  const stopRinging = () => {
    try {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    } catch (e) {
      console.error("Error stopping ringtone", e);
    }
  };

  //discover public addresses & helps in finding the best path to connect peers.
  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
    ],
  };

  // --- WebRTC Helper Functions ---

  const createPeerConnection = (peerSocketId, isInitiator = false) => {
    if (peerConnections.current.has(peerSocketId)) {
      console.warn(`PC for ${peerSocketId} already exists`);
      return peerConnections.current.get(peerSocketId);
    }

    console.log(
      `Creating PeerConnection for ${peerSocketId} (Initiator: ${isInitiator})`
    );
    const pc = new RTCPeerConnection(rtcConfig);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("call:ice-candidate", {
          to: peerSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log(`Received remote track from ${peerSocketId}`);
      const stream = event.streams[0];
      setRemoteStreams((prev) => new Map(prev).set(peerSocketId, stream));
    };

    pc.onconnectionstatechange = () => {
      console.log(
        `Connection state with ${peerSocketId}: ${pc.connectionState}`
      );
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        closePeerConnection(peerSocketId);
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    peerConnections.current.set(peerSocketId, pc);
    return pc;
  };

  const closePeerConnection = (peerSocketId) => {
    const pc = peerConnections.current.get(peerSocketId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(peerSocketId);
    }
    setRemoteStreams((prev) => {
      const newMap = new Map(prev);
      newMap.delete(peerSocketId);
      return newMap;
    });
    setParticipantInfo((prev) => {
      const newMap = new Map(prev);
      newMap.delete(peerSocketId);
      return newMap;
    });
  };

  // --- Socket Listeners ---
  useEffect(() => {
    if (!socket) {
      console.log("⚠️ Socket not available yet");
      return;
    }

    console.log("✅ Setting up call socket listeners");

    const handleIncomingCall = async (data) => {
      console.log("📞 Incoming call received:", data);
      console.log("Current callState:", callState);

      if (callState !== "idle") {
        console.log("⚠️ Busy - rejecting call");
        socket.emit("call:busy", { to: data.fromSocketId });
        return;
      }

      console.log("✅ Setting up incoming call...");
      setCall({
        isIncoming: true,
        caller: {
          id: data.callerId,
          name: data.callerName,
          avatar: data.callerAvatar,
          socketId: data.fromSocketId,
        },
        chatId: data.chatId,
        offer: data.offer, // Null for group calls initially
        isVideo: data.isVideo,
        isGroup: data.isGroup, // Important flag
      });
      setCallState("incoming");
      playRingtone();
      console.log("✅ Call state set to incoming");
    };

    // Group Call: A new peer joined the room
    const handlePeerJoined = async ({
      peerId,
      peerSocketId,
      peerName,
      peerAvatar,
    }) => {
      console.log(`Peer joined: ${peerId} (${peerSocketId})`);
      if (peerSocketId === socket.id) return;

      // Store participant info
      setParticipantInfo((prev) =>
        new Map(prev).set(peerSocketId, {
          userId: peerId,
          name: peerName || "User",
          avatar: peerAvatar,
        })
      );

      // Initiate connection to them
      const pc = createPeerConnection(peerSocketId, true);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("call:offer", { to: peerSocketId, offer });
      } catch (err) {
        console.error("Error initiating offer to joined peer", err);
      }
    };

    // Received an Offer (from a peer in the group or 1-to-1)
    const handleOffer = async ({ from, offer }) => {
      console.log(`Received offer from ${from}`);
      const pc = createPeerConnection(from, false);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("call:answer", { to: from, answer });

        // Flush buffer if any (for this specific peer)
        // Note: simple buffer needs to be map-based for proper multiple peers support
        // but for now assume 1 buffer or improve buffer logic later.
      } catch (err) {
        console.error("Error handling offer", err);
      }
    };

    const handleAnswer = async ({ responderSocketId, answer }) => {
      console.log(`Received answer from ${responderSocketId}`);
      let pc = peerConnections.current.get(responderSocketId);

      // Fix for legacy 1-to-1 connection mapping
      if (!pc) {
        pc = peerConnections.current.get("default-1-1");
        if (pc) {
          console.log(`Remapping default-1-1 PC to ${responderSocketId}`);
          peerConnections.current.delete("default-1-1");
          peerConnections.current.set(responderSocketId, pc);

          // Also try to ensure participant info is set?
          // We set it when we got 'incoming', but here we are the initiator.
          // Wait, initiator stores 'recipient' in call state.
          // We should ideally sync participantInfo map, but for 1-to-1 Render it uses 'call.recipient'.
          // So strict mapping in participantInfo might not be required for 1-to-1 UI,
          // but good for consistency.
        }
      }

      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        // If we received an answer, the call is connected
        setCallState("connected");
        stopRinging();
      }
    };

    const handleIceCandidate = async ({ from, candidate }) => {
      // 'from' is crucial now
      const targetSocketId = from; // For group call candidates usually come with 'from' or we deduce
      // The backend emits { candidate, from: senderSocketId }

      // If we don't have 'from' (legacy 1-to-1 without update), fallback?
      // Our backend update ensures 'from' is sent.

      let pc = peerConnections.current.get(targetSocketId);

      // Fix for legacy 1-to-1: if we don't have a PC for this socket ID yet,
      // check if we have the placeholder 'default-1-1'.
      if (!pc) {
        pc = peerConnections.current.get("default-1-1");
        if (pc) {
          console.log(`Applying ICE candidate from ${from} to default-1-1 PC`);
        }
      }

      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding ice candidate", e);
        }
      }
    };

    const handlePeerLeft = ({ peerSocketId }) => {
      console.log(`Peer left: ${peerSocketId}`);
      closePeerConnection(peerSocketId);
    };

    const handleCallEnded = ({ enderId }) => {
      // Ideally trigger "left" for that peer.
      // If 1-to-1, end all.
      // If group, maybe keep alive?
      // For simple logic: if 1-to-1 end cleanup.
      if (!call?.isGroup) {
        endCallCleanup();
      }
    };

    const handleCallRejected = () => {
      endCallCleanup();
    };

    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:peer-joined", handlePeerJoined);
    socket.on("call:offer", handleOffer);
    socket.on("call:answered", handleAnswer); // Unified answer handler
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:peer-left", handlePeerLeft);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:rejected", handleCallRejected);

    return () => {
      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:peer-joined", handlePeerJoined);
      socket.off("call:offer", handleOffer);
      socket.off("call:answered", handleAnswer);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:peer-left", handlePeerLeft);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:rejected", handleCallRejected);
    };
  }, [socket, callState, call]); // 'call' dep needed for isGroup check inside?

  // --- Public Actions ---

  const startCall = async ({
    recipientId,
    chatId,
    name,
    avatar,
    isVideo,
    isGroup = false,
  }) => {
    try {
      let stream;
      try {
        // Try to get video if requested
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo ? true : false,
        });
      } catch (videoError) {
        // If video fails (camera in use), fall back to audio only
        if (
          isVideo &&
          (videoError.name === "NotReadableError" ||
            videoError.name === "NotAllowedError")
        ) {
          console.warn(
            "Camera not available, falling back to audio only:",
            videoError
          );
          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? "animate-slide-in-right" : "animate-fade-out"
                } max-w-md w-full pointer-events-auto flex items-center gap-3 p-4 overflow-hidden rounded-xl shadow-xl border bg-warning/10 border-warning/30 bg-white/90 dark:bg-boxdark/90 backdrop-blur-md`}
              >
                <WarningCircle
                  size={24}
                  weight="fill"
                  className="text-warning flex-shrink-0"
                />
                <p className="text-sm text-body dark:text-bodydark">
                  Camera is in use or not available. Continuing with audio only.
                </p>
              </div>
            ),
            { duration: 4000, position: "top-right" }
          );
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          isVideo = false; // Update to audio-only
        } else {
          throw videoError; // Re-throw if it's a different error
        }
      }

      setLocalStream(stream);
      localStreamRef.current = stream;

      setCall({
        isOutgoing: true,
        recipient: { id: recipientId, name, avatar }, // For group, name is group name
        isVideo,
        chatId: chatId,
        isGroup,
      });
      setCallState("outgoing");

      // If 1-to-1, we create an offer immediately.
      // If Group, we DO NOT create an offer immediately. We wait for peers to join.

      let offer = null;
      if (!isGroup) {
        // Fake socket for 1-to-1? or just special handling.
        // Wait, backend needs 'recipientId' to find user.
        // We don't have socketId yet! 1-to-1 logic relies on "start" carrying offer.
        // So for 1-to-1 we create a temporary "holding" PC? No, we don't know who to offer TO yet until backend resolves?
        // Actually current 1-to-1 works by: Start -> Backend -> Incoming. Caller waits for Answer.
        // BUT standard WebRTC start requires creating offer.
        // Let's create a PC and offer for 1-to-1.
        // BUT we don't have socketId of recipient.
        // Problem: 'peerConnections' map is keyed by socketId.
        // Solution: For 1-to-1, we can key by 'recipientId' temporarily or handle answer specially.
        // Lets stick to:
        // Group: Just emit start.
        // 1-to-1: Keep legacy logic? Or migrate?
        // Let's migrate 1-to-1 to also use "wait for join" if possible?
        // Backend current 1-to-1 "call:incoming" sends offer. So caller must generate it.

        // Temporary PC for 1-to-1 generation
        const pc = new RTCPeerConnection(rtcConfig);
        // Add tracks
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // We can't put it in map yet because we don't know socket Id.
        // We can store it in a single ref for 1-to-1 fallback?
        // Or key it by "default"?
        peerConnections.current.set("default-1-1", pc);
        // When answer comes, it must have 'responderSocketId', we can re-map it?
      }

      socket.emit("call:start", {
        recipientId,
        chatId,
        offer,
        isVideo,
        isGroup,
      });

      // Play ringing sound for outgoing call
      playOutgoingRingtone();
    } catch (err) {
      console.error("Error starting call:", err);
    }
  };

  const answerCall = async () => {
    if (!call || !call.isIncoming) return;

    try {
      let stream;
      let actualIsVideo = call.isVideo;

      try {
        // Try to get video if requested
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: call.isVideo,
        });
      } catch (videoError) {
        // If video fails (camera in use), fall back to audio only
        if (
          call.isVideo &&
          (videoError.name === "NotReadableError" ||
            videoError.name === "NotAllowedError")
        ) {
          console.warn(
            "Camera not available when answering, falling back to audio only:",
            videoError
          );
          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? "animate-slide-in-right" : "animate-fade-out"
                } max-w-md w-full pointer-events-auto flex items-center gap-3 p-4 overflow-hidden rounded-xl shadow-xl border bg-warning/10 border-warning/30 bg-white/90 dark:bg-boxdark/90 backdrop-blur-md`}
              >
                <WarningCircle
                  size={24}
                  weight="fill"
                  className="text-warning flex-shrink-0"
                />
                <p className="text-sm text-body dark:text-bodydark">
                  Camera is in use or not available. Joining with audio only.
                </p>
              </div>
            ),
            { duration: 4000, position: "top-right" }
          );
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          actualIsVideo = false; // Update to audio-only
        } else {
          throw videoError; // Re-throw if it's a different error
        }
      }

      setLocalStream(stream);
      localStreamRef.current = stream;

      if (call.isGroup) {
        // Group Call: Join the room
        socket.emit("call:join", { chatId: call.chatId });
        setCallState("connected");
        // We wait for 'call:peer-joined' or 'call:offer'
      } else {
        // 1-to-1: Respond to offer
        const pc = createPeerConnection(call.caller.socketId, false);
        await pc.setRemoteDescription(new RTCSessionDescription(call.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("call:answer", {
          to: call.caller.socketId,
          answer,
        });
        setCallState("connected");
      }
      stopRinging();
    } catch (err) {
      console.error("Error answering call", err);
      endCallCleanup();
    }
  };

  const rejectCall = () => {
    if (call?.isGroup) {
      // Just ignore/don't join
    } else if (call?.caller?.socketId) {
      socket.emit("call:reject", {
        to: call.caller.socketId,
        chatId: call.chatId,
        isVideo: call.isVideo,
      });
    }
    stopRinging();
    endCallCleanup();
  };

  const endCall = () => {
    stopRinging();
    // If group, leave room
    if (call?.chatId) {
      socket.emit("call:leave", { chatId: call.chatId });
    }

    // If 1-to-1, emit end
    if (!call?.isGroup) {
      const payload = {
        chatId: call?.chatId,
        isVideo: call?.isVideo,
      };

      if (call?.isIncoming && call?.caller?.socketId) {
        payload.to = call.caller.socketId;
      } else if (call?.recipient?.id) {
        payload.recipientId = call.recipient.id;
      }

      if (payload.to || payload.recipientId) {
        socket.emit("call:end", payload);
      }
    }

    endCallCleanup();
  };

  const endCallCleanup = () => {
    try {
      stopRinging();
    } catch (e) {
      console.error("Error stopping ringtone", e);
    }

    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {
      console.error("Error stopping local tracks", e);
    }

    try {
      // Close all PCs
      if (peerConnections.current) {
        peerConnections.current.forEach((pc) => pc.close());
        peerConnections.current.clear();
      }
    } catch (e) {
      console.error("Error closing peer connections", e);
    }

    setLocalStream(null);
    setRemoteStreams(new Map()); // Clear Map
    setParticipantInfo(new Map()); // Clear participant info
    setCall(null);
    setCallState("idle");
    setIsMuted(false);
    setIsVideoEnabled(true);
  };

  return (
    <CallContext.Provider
      value={{
        call,
        callState,
        localStream,
        remoteStream,
        remoteStreams,
        participantInfo,
        startCall,
        answerCall,
        rejectCall,
        endCall,
        isMuted,
        setIsMuted,
        isVideoEnabled,
        setIsVideoEnabled,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
