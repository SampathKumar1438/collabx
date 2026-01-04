import {
  useRef,
  useEffect,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Virtuoso } from "react-virtuoso";
import MessageBubble from "./MessageBubble";
import DoodleBackground from "../common/DoodleBackground";

// Helper function to format date labels like WhatsApp
const formatDateLabel = (dateString) => {
  if (!dateString) return null;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const messageDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  if (messageDate.getTime() === today.getTime()) {
    return "Today";
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else {
    // Format: "Monday, January 1, 2026" or shorter based on year
    const isThisYear = date.getFullYear() === now.getFullYear();
    const options = isThisYear
      ? { weekday: "long", month: "long", day: "numeric" }
      : { weekday: "long", month: "long", day: "numeric", year: "numeric" };
    return date.toLocaleDateString("en-US", options);
  }
};

// Get date key for grouping (YYYY-MM-DD)
const getDateKey = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

const MessageList = forwardRef(
  (
    {
      messages,
      currentBackground,
      onReply,
      onReact,
      onDelete,
      onImageClick,
      onPin,
      onEdit,
      typingIndicator,
      onLoadMore,
      onGoToMessage, // Add this prop
      hasMore = true,
      loadingMore = false,
    },
    ref
  ) => {
    const START_INDEX = 100000;
    const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);
    const internalMessagesRef = useRef(messages);
    const internalWithDatesRef = useRef([]);

    // Group messages by date and create array with date separators
    const messagesWithDates = useMemo(() => {
      const result = [];
      let lastDateKey = null;

      messages.forEach((msg) => {
        // Get the date from createdAt or time property
        const msgDate = msg.createdAt || msg.time;
        const dateKey = getDateKey(msgDate);

        // Insert date separator if date changed
        if (dateKey && dateKey !== lastDateKey) {
          result.push({
            type: "date-separator",
            id: `date-${dateKey}`,
            date: msgDate,
            label: formatDateLabel(msgDate),
          });
          lastDateKey = dateKey;
        }

        result.push({ type: "message", ...msg });
      });

      return result;
    }, [messages]);

    // Handle firstItemIndex for bi-directional scrolling (prepending items)
    useEffect(() => {
      const nextMessages = messages;
      const prevMessages = internalMessagesRef.current;

      // Check if items were prepended (length increased and first item changed)
      if (nextMessages.length > prevMessages.length) {
        const firstNext = nextMessages[0];
        const firstPrev = prevMessages[0];

        if (firstNext && firstPrev && firstNext.id !== firstPrev.id) {
          // Prepended items
          // Calculate how many items were added to the rendered list (with dates)
          const diff =
            messagesWithDates.length - internalWithDatesRef.current.length;
          setFirstItemIndex((idx) => idx - diff);
        }
      } else if (nextMessages.length === 0) {
        // Reset if messages cleared
        setFirstItemIndex(START_INDEX);
      }

      internalMessagesRef.current = nextMessages;
      internalWithDatesRef.current = messagesWithDates;
    }, [messages, messagesWithDates]);

    // Combine default doodle background with custom override logic
    const customStyle = currentBackground
      ? {
          backgroundImage:
            currentBackground.type === "image"
              ? `url(${currentBackground.value})`
              : currentBackground.type === "gradient"
              ? currentBackground.value
              : "none",
          backgroundColor:
            currentBackground.type === "color"
              ? currentBackground.value
              : "transparent",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : {};

    const virtuosoRef = useRef(null);

    useEffect(() => {
      // If messages just loaded (from empty to non-empty) and it's the initial batch (<= 20), scroll to bottom
      if (messages.length > 0 && messages.length <= 20) {
        setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({
            index: messagesWithDates.length - 1 + (firstItemIndex || 0),
            align: "end",
          });
        }, 100);
      }
    }, [messages.length, messagesWithDates.length]);

    useImperativeHandle(
      ref,
      () => (
        {
          scrollToMessageId: (messageId) => {
            console.log("MessageList: scrollToMessageId", messageId);
            const index = messagesWithDates.findIndex(
              (m) => String(m.id) === String(messageId)
            );

            if (index !== -1) {
              const absoluteIndex = index + (firstItemIndex || 0);
              console.log(
                "MessageList: found index",
                index,
                "absoluteIndex",
                absoluteIndex
              );

              // 1. Precise scroll using Virtuoso index
              virtuosoRef.current?.scrollToIndex({
                index: absoluteIndex,
                align: "center",
                behavior: "auto",
              });

              // 2. Recursive highlight once element exists in DOM
              const start = Date.now();
              const highlightIfReady = () => {
                const element = document.getElementById(`message-${messageId}`);
                if (element) {
                  console.log("MessageList: element found, highlighting");
                  element.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                  element.classList.add(
                    "ring-offset-2",
                    "ring-4",
                    "ring-primary",
                    "bg-primary/20",
                    "transition-all",
                    "duration-500"
                  );
                  setTimeout(() => {
                    element.classList.remove(
                      "ring-offset-2",
                      "ring-4",
                      "ring-primary",
                      "bg-primary/20"
                    );
                  }, 3000);
                } else if (Date.now() - start < 2000) {
                  // Try for up to 2 seconds
                  requestAnimationFrame(highlightIfReady);
                }
              };

              // Try highlighting with a slight delay to allow rendering
              setTimeout(highlightIfReady, 100);
              return true;
            }
            console.log("MessageList: messageId not found in current messages");
            return false;
          },
        },
        [messagesWithDates, firstItemIndex]
      )
    );

    return (
      <div className="relative h-full w-full">
        {/* Default Doodle Background (only visible if no custom background opaque layer is set) */}
        {!currentBackground && <DoodleBackground />}

        <Virtuoso
          ref={virtuosoRef}
          style={{ height: "100%", ...customStyle }}
          className="no-scrollbar z-10"
          data={messagesWithDates}
          firstItemIndex={firstItemIndex}
          initialTopMostItemIndex={
            messagesWithDates.length > 0
              ? messagesWithDates.length - 1 + firstItemIndex
              : firstItemIndex
          }
          followOutput="auto"
          startReached={() => {
            if (hasMore && !loadingMore) {
              onLoadMore();
            }
          }}
          components={{
            Header: () =>
              loadingMore ? (
                <div className="flex items-center justify-center my-4">
                  <div className="bg-white/20 dark:bg-black/30 px-4 py-2 rounded-full text-xs text-black dark:text-white shadow-sm border border-white/20 dark:border-white/10 flex items-center gap-2 backdrop-blur-sm">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    Loading older messages...
                  </div>
                </div>
              ) : !hasMore && messages.length > 0 ? (
                <div className="flex items-center justify-center my-4 opacity-70">
                  <div className="bg-gray dark:bg-boxdark-2 px-4 py-1.5 rounded-full text-xs text-black dark:text-white shadow-sm border border-stroke dark:border-strokedark">
                    Beginning of conversation
                  </div>
                </div>
              ) : null,
            Footer: () =>
              typingIndicator ? (
                <div className="flex w-full justify-start animate-fade-in pb-2 px-6">
                  {typingIndicator}
                </div>
              ) : (
                <div className="pb-2" />
              ),
          }}
          itemContent={(index, item) => {
            if (item.type === "date-separator") {
              return (
                <div className="flex items-center justify-center my-3">
                  <div className="bg-white/80 dark:bg-boxdark-2/80 px-4 py-1 rounded-lg text-xs text-gray-700 dark:text-white shadow-sm border border-stroke/50 dark:border-strokedark/50 backdrop-blur-sm font-medium">
                    {item.label}
                  </div>
                </div>
              );
            }
            return (
              <div className="px-6" id={`message-${item.id}`}>
                <MessageBubble
                  message={item}
                  isOwn={
                    item.isOwn ||
                    item.sender === "You" ||
                    item.sender === "user"
                  }
                  onReply={onReply}
                  onReact={onReact}
                  onPin={onPin}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onImageClick={onImageClick}
                  onGoToMessage={onGoToMessage}
                />
              </div>
            );
          }}
        />
      </div>
    );
  }
);

export default MessageList;
