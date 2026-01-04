import { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const processedEventsRef = useRef(new Set());
  const reconnectTimeoutRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [socket, setSocket] = useState(null);

  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!user || !isAuthenticated) return;

    const eventsSet = processedEventsRef.current;

    const SOCKET_URL = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace("/api", "")
      : "http://localhost:5000";

    console.log("Connecting to socket at:", SOCKET_URL);

    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ["websocket", "polling"],
    });

    socketRef.current = newSocket;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
      setIsConnected(true);
      setReconnectAttempt(0);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      newSocket.emit("presence:update", { isOnline: true });
    });

    newSocket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      setIsConnected(false);

      if (reason === "io server disconnect") {
        newSocket.connect();
      }
    });

    newSocket.on("reconnect_attempt", (attempt) => {
      console.log(`🔄 Reconnection attempt ${attempt}`);
      setReconnectAttempt(attempt);
    });

    newSocket.on("reconnect", (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setReconnectAttempt(0);
      newSocket.emit("presence:update", { isOnline: true });
    });

    newSocket.on("reconnect_failed", () => {
      console.error("❌ Reconnection failed");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      setIsConnected(false);
    });

    newSocket.on("error", (err) => {
      console.error("Socket error:", err);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("presence:update", { isOnline: false });
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      eventsSet.clear();
    };
  }, [user, isAuthenticated]);

  // ✅ SAFE socket usage via functions (no ref access during render)
  const emit = (eventName, data) => {
    if (!socketRef.current) return;
    socketRef.current.emit(eventName, data);
  };

  const emitWithDeduplication = (eventName, data) => {
    const socket = socketRef.current;
    if (!socket) return;

    const eventKey = `${eventName}-${JSON.stringify(data)}-${Date.now()}`;

    if (!processedEventsRef.current.has(eventKey)) {
      processedEventsRef.current.add(eventKey);
      socket.emit(eventName, data);

      setTimeout(() => {
        processedEventsRef.current.delete(eventKey);
      }, 5000);
    }
  };

  // Memoize value to prevent unnecessary re-renders
  // We include socket state in the object
  const value = {
    socket,
    isConnected,
    reconnectAttempt,
    emit,
    emitWithDeduplication,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
