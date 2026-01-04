import {
  FileArrowUp,
  PaperPlaneTilt,
  Smiley,
  Microphone,
  File as FileIcon,
  X,
  Eye,
  Gif,
  StopCircle,
  PencilSimple,
  ArrowArcLeft,
  Trash,
  Pause,
  Play,
  Check,
} from "@phosphor-icons/react";
import { useState, useRef, useEffect } from "react";
import EmojiPicker from "../EmojiPicker";
import Giphy from "../Giphy";
import { useToast } from "../../contexts/ToastContext";

export default function ChatInput({
  onSend,
  disabled = false,
  replyTo = null,
  onCancelReply,
  editingMessage = null,
  onCancelEdit,
  onEdit,
  socket = null,
  conversationId = null,
}) {
  const [messageInput, setMessageInput] = useState("");
  const [files, setFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [waveform, setWaveform] = useState(Array(20).fill(2));

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const isTypingRef = useRef(false);

  const { error: showError } = useToast();

  // Load message into input when editing
  useEffect(() => {
    if (editingMessage) {
      setMessageInput(editingMessage.message || editingMessage.text || "");
      if (inputRef.current) inputRef.current.focus();
    } else {
      setMessageInput("");
    }
  }, [editingMessage]);

  // Typing indicator logic
  useEffect(() => {
    if (!socket || !conversationId) return;

    if (messageInput.trim()) {
      if (!isTypingRef.current) {
        socket.emit("typing:start", { chatId: conversationId });
        isTypingRef.current = true;
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing:stop", { chatId: conversationId });
        isTypingRef.current = false;
      }, 3000);
    } else {
      if (isTypingRef.current) {
        socket.emit("typing:stop", { chatId: conversationId });
        isTypingRef.current = false;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [messageInput, socket, conversationId]);

  // Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          setAudioBlob(blob);
        }
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
        // Clear recording interval
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        setRecordingDuration(0);
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        setRecordingDuration(0);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
        // Randomize waveform for visual effect
        setWaveform(
          Array.from({ length: 20 }, () => Math.floor(Math.random() * 15) + 2)
        );
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      showError("Failed to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch (error) {
        console.error("Error stopping recording:", error);
      }
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const pauseRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "paused"
    ) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
        setWaveform(
          Array.from({ length: 20 }, () => Math.floor(Math.random() * 15) + 2)
        );
      }, 1000);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null; // Prevent generating blob
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
    setIsRecording(false);
    setIsPaused(false);
    setRecordingDuration(0);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB

    const oversized = selectedFiles.filter((f) => f.size > MAX_SIZE);
    if (oversized.length > 0) {
      showError(
        `Files exceeding 100MB: ${oversized.map((f) => f.name).join(", ")}`
      );
    }

    const validFiles = selectedFiles.filter((f) => f.size <= MAX_SIZE);

    console.log(
      "Files selected:",
      validFiles.map((f) => ({ name: f.name, type: f.type, size: f.size }))
    );
    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (files.length <= 1) setPreviewOpen(false);
  };

  const handleEmojiSelect = (emoji) => {
    // emoji is received from EmojiPicker as a string character
    if (emoji && typeof emoji === "string") {
      setMessageInput((prev) => prev + emoji);
      // Focus back on input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleGifSelect = (gifUrl) => {
    // Send GIF as an image message
    onSend({
      text: "",
      files: null,
      audio: null,
      gifUrl: gifUrl,
      replyTo: replyTo,
    });
    setGifOpen(false);
    setReplyTo(null);
  };

  const handleKeyDown = (e) => {
    // Send message on Enter (but not Shift+Enter for new line)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (messageInput.trim() || files.length > 0 || audioBlob) {
        handleSendMessage(e);
      }
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (messageInput.trim() || files.length > 0 || audioBlob) {
      // Stop typing indicator
      if (socket && conversationId && isTypingRef.current) {
        socket.emit("typing:stop", { chatId: conversationId });
        isTypingRef.current = false;
      }

      console.log("Sending message with:", {
        text: messageInput,
        filesCount: files.length,
        hasAudio: !!audioBlob,
        fileDetails: files.map((f) => ({
          name: f.name,
          type: f.type,
          size: f.size,
        })),
      });

      if (editingMessage) {
        onEdit(editingMessage, messageInput);
        onCancelEdit();
      } else {
        onSend({
          text: messageInput,
          files: files,
          audio: audioBlob,
          replyTo: replyTo,
        });
      }
      setMessageInput("");
      setFiles([]);
      setAudioBlob(null);
      onCancelReply && onCancelReply();
    }
  };

  const handleSendAudio = () => {
    if (audioBlob) {
      console.log("Sending audio:", {
        size: audioBlob.size,
        type: audioBlob.type,
      });
      onSend({
        audio: audioBlob,
        replyTo: replyTo,
      });
      setAudioBlob(null);
      onCancelReply && onCancelReply();
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="sticky bottom-0 border-t border-stroke/10 gradient-bg-input px-6 py-5 backdrop-blur-xl">
      {/* Reply Preview */}
      {replyTo && (
        <div className="flex items-center justify-between bg-primary/5 dark:bg-primary/10 mb-2 rounded-lg p-3 border-l-4 border-primary animate-fade-in">
          <div className="flex flex-col text-sm">
            <span className="font-bold text-primary flex items-center gap-2">
              <ArrowArcLeft size={16} />
              Replying to {replyTo.sender}
            </span>
            <span className="truncate max-w-xs text-body dark:text-white opacity-80">
              {replyTo.message || replyTo.text || "Media"}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Edit Preview */}
      {editingMessage && (
        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 mb-2 rounded-lg p-3 border-l-4 border-amber-500 animate-fade-in">
          <div className="flex flex-col text-sm">
            <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <PencilSimple size={16} />
              Editing message
            </span>
            <span className="truncate max-w-xs text-body dark:text-white opacity-80">
              {editingMessage.message || editingMessage.text}
            </span>
          </div>
          <button
            onClick={onCancelEdit}
            className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Selected Files Preview Area (Small chips above input) */}
      {files.length > 0 && !previewOpen && (
        <div className="flex gap-2 mb-2 overflow-x-auto py-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-gray-100 dark:bg-boxdark-2 border border-stroke dark:border-strokedark rounded-md px-2 py-1 min-w-fit"
            >
              <FileIcon size={16} className="text-body dark:text-white" />
              <span className="text-xs truncate max-w-[100px] text-body dark:text-white">
                {file.name}
              </span>
              <button
                onClick={() => removeFile(index)}
                className="hover:text-danger"
              >
                <X size={12} weight="bold" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        className="flex items-center justify-between space-x-4.5"
        onSubmit={handleSendMessage}
      >
        <div className="relative w-full">
          {isRecording ? (
            <div className="flex items-center h-13 w-full rounded-xl border border-stroke/20 bg-white/40 dark:bg-white/5 py-2.5 px-5 transition-all focus-within:ring-2 focus-within:ring-primary/30 backdrop-blur-sm">
              <div className="flex items-center gap-3 flex-grow">
                {/* Recording indicator with glow */}
                <div className="relative">
                  <span className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75"></span>
                  <span className="relative w-3 h-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-full block shadow-lg shadow-red-500/50"></span>
                </div>

                {/* Timer */}
                <span className="text-sm font-bold font-mono text-red-600 dark:text-red-400 min-w-[50px] bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-md">
                  {formatRecordingTime(recordingDuration)}
                </span>

                {/* Animated Waveform */}
                <div className="flex items-center gap-[3px] h-8 flex-grow max-w-[180px] overflow-hidden px-2">
                  {waveform.map((h, i) => (
                    <div
                      key={i}
                      className={`w-[4px] rounded-full bg-gradient-to-t from-red-500 to-rose-400 transition-all duration-150 ${
                        !isPaused && "animate-waveform"
                      }`}
                      style={{
                        height: `${Math.max(4, h * 1.5)}px`,
                        animationDelay: `${i * 50}ms`,
                        opacity: isPaused ? 0.4 : 0.9,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Cancel button */}
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 transition-all group"
                >
                  <Trash
                    size={16}
                    className="group-hover:scale-110 transition-transform"
                  />
                  <span className="text-xs font-semibold hidden sm:inline">
                    Cancel
                  </span>
                </button>

                {/* Pause/Resume button */}
                <button
                  type="button"
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  className={`p-2 rounded-lg transition-all ${
                    isPaused
                      ? "bg-green-100 dark:bg-green-900/30 text-green-600 hover:bg-green-200"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {isPaused ? (
                    <Play size={18} weight="fill" />
                  ) : (
                    <Pause size={18} weight="fill" />
                  )}
                </button>

                {/* Done button */}
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-md shadow-green-500/25 hover:shadow-green-500/40"
                >
                  <Check size={16} weight="bold" />
                  <span className="text-xs font-semibold hidden sm:inline">
                    Done
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <input
                ref={inputRef}
                type="text"
                placeholder={
                  editingMessage ? "Edit message..." : "Type a message..."
                }
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className={`h-13 w-full rounded-xl border bg-white/40 dark:bg-white/5 pl-4 md:pl-5 pr-28 md:pr-36 text-black placeholder-body dark:placeholder-gray-400 outline-none transition-all backdrop-blur-sm dark:text-white ${
                  editingMessage
                    ? "border-amber-500/50 focus:ring-2 focus:ring-amber-500/30"
                    : "border-stroke/20 focus:ring-2 focus:ring-primary/30 dark:border-strokedark/20"
                }`}
              />
              <div className="absolute right-2 md:right-5 top-1/2 -translate-y-1/2 items-center justify-end space-x-1 md:space-x-2 flex">
                {files.length > 0 && (
                  <button
                    type="button"
                    className={`hover:text-primary transition-colors ${
                      previewOpen
                        ? "text-primary"
                        : "text-gray-500 dark:text-white"
                    }`}
                    onClick={() => setPreviewOpen(!previewOpen)}
                    aria-label="Preview files"
                  >
                    <Eye size={20} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={startRecording}
                  className={`hover:text-primary transition ${
                    isRecording
                      ? "text-red-500 scale-110"
                      : "text-gray-500 dark:text-white"
                  }`}
                  aria-label="Start recording"
                >
                  <Microphone size={20} />
                </button>

                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  className="text-gray-500 dark:text-white hover:text-primary"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach file"
                >
                  <FileArrowUp size={20} />
                </button>

                <button
                  type="button"
                  className={`hover:text-primary ${
                    gifOpen ? "text-primary" : "text-gray-500 dark:text-white"
                  }`}
                  onClick={() => setGifOpen(!gifOpen)}
                  aria-label="Send GIF"
                >
                  <Gif size={20} />
                </button>
                <EmojiPicker onSelect={handleEmojiSelect} />
              </div>
            </>
          )}
        </div>
        <button
          type="submit"
          disabled={
            disabled ||
            isRecording ||
            (!messageInput.trim() && files.length === 0 && !audioBlob)
          }
          className="flex items-center justify-center h-13 max-w-13 w-full rounded-md border border-stroke bg-primary text-white hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <PaperPlaneTilt size={24} />
        </button>
      </form>

      {/* Audio Recording Review UI */}
      {audioBlob && !isRecording && (
        <div className="mt-3 animate-fade-in">
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 dark:from-primary/20 dark:via-secondary/20 dark:to-primary/20 rounded-2xl border border-primary/20 shadow-lg shadow-primary/5">
            {/* Custom styled audio container */}
            <div className="flex-1 relative">
              <div className="flex items-center gap-3 bg-white/10 dark:bg-black/20 rounded-xl p-2 shadow-inner backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-secondary">
                  <Microphone size={18} className="text-white" />
                </div>
                <audio
                  controls
                  src={URL.createObjectURL(audioBlob)}
                  className="flex-1 h-8 [&::-webkit-media-controls-panel]:bg-transparent [&::-webkit-media-controls-current-time-display]:text-xs [&::-webkit-media-controls-time-remaining-display]:text-xs"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all font-semibold text-sm"
                onClick={handleSendAudio}
              >
                <PaperPlaneTilt size={16} weight="fill" />
                Send
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all font-semibold text-sm border border-gray-200 dark:border-gray-700"
                onClick={() => setAudioBlob(null)}
              >
                <Trash size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {gifOpen && <Giphy onSelect={handleGifSelect} />}

      {/* File Preview Modal */}
      {previewOpen && files.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-white/10 dark:bg-black/20 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col backdrop-blur-2xl border border-stroke/10 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-black dark:text-white">
                Selected Files ({files.length})
              </h3>
              <button
                onClick={() => setPreviewOpen(false)}
                className="hover:text-danger"
              >
                <X size={24} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2 p-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-white/5 dark:bg-black/10 p-3 rounded-lg border border-stroke/10"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      {file.type.startsWith("image/") ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt="preview"
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <FileIcon size={24} className="text-primary" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <p className="text-sm font-medium text-black dark:text-white truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-body dark:text-bodydark">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-danger hover:bg-danger/10 p-1.5 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setPreviewOpen(false);
                }}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
