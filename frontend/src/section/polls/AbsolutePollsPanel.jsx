import { useState, useEffect, useRef } from "react";
import { Plus, ChartBar, ArrowUp } from "@phosphor-icons/react";
import PollCard from "../../components/polls/PollCard";
import CreatePollModal from "../../components/polls/CreatePollModal";
import { createPoll, getPolls, votePoll } from "../../services/pollService";
import { useSocket } from "../../contexts/SocketContext";
import DoodleBackground from "../../components/common/DoodleBackground"; // Import DoodleBackground

export default function AbsolutePollsPanel() {
  const [polls, setPolls] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const { socket } = useSocket();
  const scrollContainerRef = useRef(null);

  // Initial Fetch & Reset
  useEffect(() => {
    setPolls([]);
    setPage(1);
    setHasMore(true);
    fetchPolls(1);
  }, []);

  const fetchPolls = async (pageNum) => {
    try {
      setIsLoading(true);
      // Fetch 4 items at a time
      const data = await getPolls(pageNum, 4);

      if (data.length < 4) {
        setHasMore(false);
      }

      setPolls((prev) => (pageNum === 1 ? data : [...prev, ...data]));
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to load polls", error);
      setIsLoading(false);
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        scrollContainerRef.current;

      // Toggle Scroll to Top Button
      if (scrollTop > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }

      // Infinite Scroll Logic
      if (
        scrollTop + clientHeight >= scrollHeight - 50 &&
        hasMore &&
        !isLoading
      ) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchPolls(nextPage);
      }
    }
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Socket Listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("poll:new", (newPoll) => {
      // Add new poll to top
      setPolls((prev) => [newPoll, ...prev]);
    });

    socket.on("poll:vote", (data) => {
      const { pollId, optionId, removedOptionId, username } = data;

      setPolls((prev) =>
        prev.map((poll) => {
          if (poll.pollId !== pollId) return poll;

          // Update options
          const updatedOptions = poll.options.map((opt) => {
            let newVotes = opt.votes || 0;
            let newVoters = [...(opt.voters || [])];
            const isAnonymous = poll.anonymous;

            // Remove vote if this was the previous choice
            if (removedOptionId && opt.optionId === removedOptionId) {
              newVotes = Math.max(0, newVotes - 1);
              if (!isAnonymous) {
                newVoters = newVoters.filter((v) => v !== username);
              }
            }

            // Add vote if this is the new choice
            if (opt.optionId === optionId) {
              newVotes += 1;
              if (!isAnonymous && !newVoters.includes(username)) {
                newVoters.push(username);
              }
            }

            return {
              ...opt,
              votes: newVotes,
              voters: newVoters,
            };
          });

          // Also update 'userVotedOptionId' for the current user if needed?
          // Ideally we derive UI state from this, but PollCard state tracks "hasVoted" mostly.
          // To update UI correctly for vote switching, PollCard might need to check 'userVotedOptionId' from updated poll prop,
          // OR we ensure the local state is reactive.

          return { ...poll, options: updatedOptions };
        })
      );
    });

    return () => {
      socket.off("poll:new");
      socket.off("poll:vote");
    };
  }, [socket]);

  const handleCreatePoll = async (pollData) => {
    try {
      await createPoll({
        question: pollData.question,
        options: pollData.options.map((text) => ({ text })),
        expiry: pollData.settings.expiry,
        anonymous: pollData.settings.anonymous,
        audience: pollData.settings.audience,
      });
    } catch (error) {
      console.error("Failed to create poll", error);
    }
  };

  const handleVote = async (pollId, selectedOptionIds) => {
    try {
      const optionId = selectedOptionIds[0];
      await votePoll(pollId, optionId);
    } catch (error) {
      console.error("Failed to vote", error);
    }
  };

  return (
    <div className="flex flex-col h-full w-full gradient-bg-sidebar relative overflow-hidden">
      {/* Use Doodle Background */}
      <DoodleBackground />

      {/* Sticky Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-stroke/10 dark:border-strokedark/10 gradient-bg-header backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <ChartBar size={24} weight="duotone" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-black dark:text-white leading-tight">
              Absolute Polls
            </h1>
            <p className="text-xs text-body dark:text-bodydark font-medium">
              Real-time voting & feedback
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg active:scale-95 font-medium text-sm"
        >
          <Plus size={18} weight="bold" />
          <span className="hidden sm:inline">Create Poll</span>
        </button>
      </div>

      {/* Scrollable Content */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 relative z-10"
      >
        {polls.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
            <div className="p-4 bg-gray-100 dark:bg-meta-4 rounded-full mb-4">
              <ChartBar size={48} weight="duotone" />
            </div>
            <h3 className="text-lg font-semibold text-black dark:text-white mb-1">
              No polls yet
            </h3>
            <p className="text-sm text-body dark:text-bodydark max-w-xs mx-auto">
              Create a new poll to gather feedback from your team.
            </p>
          </div>
        ) : (
          polls.map((poll) => (
            <PollCard key={poll.pollId} poll={poll} onVote={handleVote} />
          ))
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex justify-center p-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="absolute bottom-6 right-6 z-30 p-3 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-all animate-bounce"
        >
          <ArrowUp size={20} weight="bold" />
        </button>
      )}

      <CreatePollModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreatePoll}
      />
    </div>
  );
}
