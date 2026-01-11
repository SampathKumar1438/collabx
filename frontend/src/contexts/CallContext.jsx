import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useSocket } from "./SocketContext";
import callTune from "../assets/audio/microsoft_teams_call.mp3";
import toast from "react-hot-toast";
import { WarningCircle } from "@phosphor-icons/react";

const CallContext = createContext();

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
};

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

  // Audio Analysis Refs
  const audioContextRef = useRef(null);
  const analysersRef = useRef(new Map()); // id -> AnalyserNode
  const sourceNodesRef = useRef(new Map()); // id -> MediaStreamSource
  const animationFrameRef = useRef(null);
  const [activeSpeakers, setActiveSpeakers] = useState(new Set());

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
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
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

  const audioConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  // --- Audio Analysis Code ---
  const cleanupAudioAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Disconnect and clean up nodes
    sourceNodesRef.current.forEach((node) => node.disconnect());
    sourceNodesRef.current.clear();
    analysersRef.current.forEach((node) => node.disconnect());
    analysersRef.current.clear();

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setActiveSpeakers(new Set());
  };

  const setupAudioAnalysis = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
    }

    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }

    return audioContextRef.current;
  };

  const attachStreamAnalyzer = (stream, id) => {
    try {
      if (!stream || !stream.getAudioTracks().length) return;

      const audioCtx = setupAudioAnalysis();

      // If we already have an analyzer for this ID, check if stream changed?
      // Simpler to just cleanup old one for this ID if exists
      if (sourceNodesRef.current.has(id)) {
        sourceNodesRef.current.get(id).disconnect();
        analysersRef.current.get(id).disconnect();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;

      source.connect(analyser); // We don't connect to destination to avoid feedback loop for local

      sourceNodesRef.current.set(id, source);
      analysersRef.current.set(id, analyser);

      if (!animationFrameRef.current) {
        detectActiveSpeakers();
      }
    } catch (err) {
      console.error("Error attaching audio analyzer:", err);
    }
  };

  const detectActiveSpeakers = () => {
    if (!analysersRef.current.size) {
      animationFrameRef.current = requestAnimationFrame(detectActiveSpeakers);
      return;
    }

    const speakingThreshold = 15; // Threshold for "speaking" (0-255)
    const currentSpeakers = new Set();
    const dataArray = new Uint8Array(128); // Half of fftSize

    analysersRef.current.forEach((analyser, id) => {
      analyser.getByteFrequencyData(dataArray);

      // Calculate average volume
      const sum = dataArray.reduce((a, b) => a + b, 0);
      const average = sum / dataArray.length;

      if (average > speakingThreshold) {
        currentSpeakers.add(id);
      }
    });

    // Only update state if changed to avoid re-renders
    setActiveSpeakers((prev) => {
      // Simple set equality check
      if (prev.size !== currentSpeakers.size) return currentSpeakers;
      for (let a of prev) if (!currentSpeakers.has(a)) return currentSpeakers;
      return prev;
    });

    animationFrameRef.current = requestAnimationFrame(detectActiveSpeakers);
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

      // Optimization: Only update state if the stream is different
      setRemoteStreams((prev) => {
        const currentStream = prev.get(peerSocketId);
        if (currentStream && currentStream.id === stream.id) {
          return prev;
        }
        return new Map(prev).set(peerSocketId, stream);
      });
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
      console.log("Socket not available yet");
      return;
    }

    console.log("Setting up call socket listeners");

    const handleIncomingCall = async (data) => {
      console.log("Incoming call received:", data);
      console.log("Current callState:", callState);

      if (callState !== "idle") {
        console.log("Busy - rejecting call");
        socket.emit("call:busy", { to: data.fromSocketId });
        return;
      }

      console.log("Setting up incoming call...");
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
      console.log("Call state set to incoming");
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
    const handleOffer = async ({
      from,
      offer,
      callerName,
      callerAvatar,
      callerId,
    }) => {
      console.log(`Received offer from ${from} (${callerName})`);

      // Store participant info if provided (Group Call Logic)
      if (callerName) {
        setParticipantInfo((prev) =>
          new Map(prev).set(from, {
            userId: callerId,
            name: callerName || "User",
            avatar: callerAvatar,
          })
        );
      }

      const pc = createPeerConnection(from, false);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Process queued remote ICE candidates if any
        if (pc.remoteCandidates && pc.remoteCandidates.length > 0) {
          console.log(
            `Processing ${pc.remoteCandidates.length} queued remote candidates for ${from}`
          );
          for (const candidate of pc.remoteCandidates) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pc.remoteCandidates = [];
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("call:answer", { to: from, answer });
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

          // Remap remote stream if it exists under default key
          setRemoteStreams((prev) => {
            const stream = prev.get("default-1-1");
            if (stream) {
              console.log(
                `Remapping default-1-1 stream to ${responderSocketId}`
              );
              const newMap = new Map(prev);
              newMap.delete("default-1-1");
              newMap.set(responderSocketId, stream);
              return newMap;
            }
            return prev;
          });
        }
      }

      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));

        // Process queued remote ICE candidates if any
        if (pc.remoteCandidates && pc.remoteCandidates.length > 0) {
          console.log(
            `Processing ${pc.remoteCandidates.length} queued remote candidates for ${responderSocketId}`
          );
          for (const candidate of pc.remoteCandidates) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pc.remoteCandidates = [];
        }

        // Flush queued candidates if any (for 1-to-1 initiator)
        if (pc.queuedCandidates && pc.queuedCandidates.length > 0) {
          console.log(
            `Flushing ${pc.queuedCandidates.length} queued candidates to ${responderSocketId}`
          );
          pc.queuedCandidates.forEach((candidate) => {
            socket.emit("call:ice-candidate", {
              to: responderSocketId,
              candidate: candidate,
            });
          });
          pc.queuedCandidates = []; // Clear queue
        }

        // If we received an answer, the call is connected
        setCallState("connected");
        stopRinging();
      }
    };

    const handleIceCandidate = async ({ from, candidate }) => {
      // 'from' is crucial now
      const targetSocketId = from;
      let pc = peerConnections.current.get(targetSocketId);

      // Fix for legacy 1-to-1: if we don't have a PC for this socket ID yet,
      // check if we have the placeholder 'default-1-1'.
      if (!pc) {
        pc = peerConnections.current.get("default-1-1");
      }

      if (pc) {
        try {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            // Queue it
            if (!pc.remoteCandidates) pc.remoteCandidates = [];
            pc.remoteCandidates.push(candidate);
            console.log(
              `Queued remote ICE candidate from ${from} (pending remote description)`
            );
          }
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
      toast.error("Call declined");
      endCallCleanup();
    };

    const handleBusy = () => {
      toast.error("User is busy in another call");
      endCallCleanup();
    };

    const handleOffline = () => {
      toast.error("User is currently offline");
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
    socket.on("call:busy", handleBusy);
    socket.on("call:offline", handleOffline);

    return () => {
      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:peer-joined", handlePeerJoined);
      socket.off("call:offer", handleOffer);
      socket.off("call:answered", handleAnswer);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:peer-left", handlePeerLeft);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:rejected", handleCallRejected);
      socket.off("call:busy", handleBusy);
      socket.off("call:offline", handleOffline);
    };
  }, [socket, callState, call]); // 'call' dep needed for isGroup check inside?

  // --- Audio Analysis Effects ---
  useEffect(() => {
    if (callState === "connected" || callState === "outgoing") {
      if (localStream) {
        attachStreamAnalyzer(localStream, "local");
      }

      remoteStreams.forEach((stream, id) => {
        attachStreamAnalyzer(stream, id);
      });
    }

    return () => {
      // We generally cleanup on endCallCleanup, but here we can handle
      // specific stream removals if we want more granular control.
      // For now, rely on endCallCleanup.
    };
  }, [localStream, remoteStreams, callState]);

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
          audio: audioConstraints,
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
        // Init 1-to-1 with listeners
        console.log("Initializing 1-to-1 call initiator...");
        const pc = new RTCPeerConnection(rtcConfig);

        // Add tracks
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        // 1. Queue candidates until we know who to send to (or re-map default)
        // actually for now we can just store them and emit later,
        // OR rely on the fact we don't have socketId yet.
        // We will store them in a temporary queue on the PC itself or a ref?
        // Let's use a simple array on the component to hold "early candidates for default-1-1"
        // But better: simply let the 'onicecandidate' fire, and if we don't have a recipient socket ID,
        // we can't emit.
        // BUT wait, we need to send them eventually.
        // Let's attach them to the pc object temporarily?
        pc.queuedCandidates = [];

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log(
              "Generated ICE candidate (initiator):",
              event.candidate
            );
            // We don't have 'recipientCallSocketId' yet.
            // We store it.
            pc.queuedCandidates.push(event.candidate);
          }
        };

        pc.ontrack = (event) => {
          console.log("Received remote track (initiator)");
          const stream = event.streams[0];
          // We assume single remote stream for 1-to-1
          // We can set it in the map using a temporary key or wait?
          // The map is used for rendering.
          // Let's set it to 'default-1-1' temporarily so UI can show it?
          // Or wait for answer? Usually track comes after answer/connection.
          setRemoteStreams((prev) => new Map(prev).set("default-1-1", stream));
        };

        pc.onconnectionstatechange = () => {
          console.log(`Initiator PC state: ${pc.connectionState}`);
          if (
            pc.connectionState === "failed" ||
            pc.connectionState === "closed"
          ) {
            // cleanup if needed
          }
        };

        offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        peerConnections.current.set("default-1-1", pc);
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
          audio: audioConstraints,
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

      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        toast.error(
          "Permission denied. Please allow camera/microphone access to answer."
        );
      } else if (err.name === "NotFoundError") {
        toast.error("No camera or microphone found.");
      } else {
        toast.error("Failed to answer call");
      }

      endCallCleanup();
    }
  };

  const rejectCall = () => {
    stopRinging(); // Stop immediately

    if (call?.isGroup) {
      // Just ignore/don't join
    } else if (call?.caller?.socketId) {
      socket.emit("call:reject", {
        to: call.caller.socketId,
        chatId: call.chatId,
        isVideo: call.isVideo,
      });
    }

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
    cleanupAudioAnalysis();
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
        activeSpeakers,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
