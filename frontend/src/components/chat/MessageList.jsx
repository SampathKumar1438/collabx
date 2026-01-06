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

        // Insert date separator if date changed and label is valid
        if (dateKey && dateKey !== lastDateKey) {
          const label = formatDateLabel(msgDate);
          // Only add separator if we have a valid label
          if (label) {
            result.push({
              type: "date-separator",
              id: `date-${dateKey}`,
              date: msgDate,
              label: label,
            });
          }
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
    // Background style logic
    const getBackgroundStyle = () => {
      if (!currentBackground) return {};

      if (currentBackground.type === "pattern") {
        return {
          maskImage: currentBackground.value,
          WebkitMaskImage: currentBackground.value,
          maskRepeat: "repeat",
          WebkitMaskRepeat: "repeat",
          backgroundColor: "var(--pattern-primary)", // Uses the theme-aware variable
        };
      }

      return {
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
      };
    };

    const backgroundStyle = getBackgroundStyle();

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
      () => ({
        scrollToMessageId: (messageId) => {
          console.log("MessageList: scrollToMessageId", messageId);

          const index = messagesWithDates.findIndex(
            (m) => String(m.id) === String(messageId)
          );

          if (index !== -1) {
            console.log("MessageList: found at data index", index);

            // Use Virtuoso's scrollToIndex with the data index
            // Note: Virtuoso uses index relative to the data array when using firstItemIndex
            virtuosoRef.current?.scrollToIndex({
              index: index,
              align: "center",
              behavior: "smooth",
            });

            // Wait for Virtuoso to render, then highlight
            const highlightElement = () => {
              const element = document.getElementById(`message-${messageId}`);
              console.log(
                "MessageList: Looking for element",
                `message-${messageId}`,
                "found:",
                !!element
              );

              if (element) {
                console.log("MessageList: element found, highlighting");
                // Scroll into view as backup
                element.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
                // Add highlight classes
                element.classList.add(
                  "ring-offset-2",
                  "ring-4",
                  "ring-primary",
                  "bg-primary/20",
                  "transition-all",
                  "duration-500"
                );
                // Remove highlight after 3 seconds
                setTimeout(() => {
                  element.classList.remove(
                    "ring-offset-2",
                    "ring-4",
                    "ring-primary",
                    "bg-primary/20"
                  );
                }, 3000);
                return true;
              }
              return false;
            };

            // Try multiple times with increasing delays
            const attempts = [100, 300, 500, 1000, 1500];
            let attemptIndex = 0;

            const tryHighlight = () => {
              if (highlightElement()) {
                return; // Success
              }
              attemptIndex++;
              if (attemptIndex < attempts.length) {
                setTimeout(
                  tryHighlight,
                  attempts[attemptIndex] - (attempts[attemptIndex - 1] || 0)
                );
              } else {
                console.log(
                  "MessageList: Could not find element after all attempts"
                );
              }
            };

            setTimeout(tryHighlight, attempts[0]);
            return true;
          }
          console.log("MessageList: messageId not found in current messages");
          return false;
        },
      }),
      [messagesWithDates]
    );

    return (
      <div className="relative h-full w-full overflow-hidden">
        {/* Layered Background System */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {!currentBackground ? (
            <DoodleBackground />
          ) : (
            <div
              className="w-full h-full transition-all duration-300"
              style={backgroundStyle}
            />
          )}
        </div>

        <Virtuoso
          ref={virtuosoRef}
          style={{ height: "100%" }}
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
            if (hasMore && !loadingMore && typeof onLoadMore === "function") {
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
