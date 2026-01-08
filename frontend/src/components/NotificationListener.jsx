import { useEffect, useRef } from "react";
import { useSocket } from "../contexts/SocketContext";
import notificationSound from "../assets/audio/samsung.mp3";

export default function NotificationListener() {
  const { socket } = useSocket();
  const audioRef = useRef(new Audio(notificationSound));

  useEffect(() => {
    // Pre-load audio
    audioRef.current.load();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (messageData) => {
      // Check if message is from self
      const currentUserId = localStorage.getItem("userId");
      const senderId = messageData?.senderId || messageData?.sender?.userId;

      console.log("NotificationListener: New message received", {
        messageId: messageData?.messageId,
        senderId,
        currentUserId,
        isFromSelf: String(senderId) === String(currentUserId),
      });

      if (senderId && String(senderId) !== String(currentUserId)) {
        console.log("Playing notification sound");
        const audio = audioRef.current;

        // Reset and play
        audio.currentTime = 0;
        audio.play().catch((e) => {
          console.error("Error playing notification sound:", e);
          // Auto-play policy might block this if user hasn't interacted with document
        });
      }
    };

    socket.on("message:new", handleNewMessage);

    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, [socket]);

  return null;
}
