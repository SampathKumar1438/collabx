import { useState, useEffect } from "react";
import { Plus, ChartBar } from "@phosphor-icons/react";
import PollCard from "../../components/polls/PollCard";
import CreatePollModal from "../../components/polls/CreatePollModal";
import { createPoll, getPolls, votePoll } from "../../services/pollService";
import { useSocket } from "../../contexts/SocketContext";

export default function AbsolutePollsPanel() {
  const [polls, setPolls] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { socket } = useSocket();

  // Initial Fetch
  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      const data = await getPolls();
      setPolls(data);
    } catch (error) {
      console.error("Failed to load polls", error);
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
      const { pollId, optionId, username } = data;

      setPolls((prev) =>
        prev.map((poll) => {
          if (poll.pollId !== pollId) return poll;

          // Update options
          const updatedOptions = poll.options.map((opt) => {
            if (opt.optionId === optionId) {
              const isAnonymous = poll.anonymous;
              // Add voter if not anonymous, increment vote count
              return {
                ...opt,
                votes: (opt.votes || 0) + 1,
                voters: isAnonymous ? [] : [...(opt.voters || []), username],
              };
            }
            return opt;
          });

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
      // Simply call API, socket will handle UI update
      await createPoll({
        question: pollData.question,
        options: pollData.options.map((text) => ({ text })),
        expiry: pollData.settings.expiry,
        anonymous: pollData.settings.anonymous,
        audience: pollData.settings.audience,
      });
      // We don't manually set state here to avoid duplication with socket event
    } catch (error) {
      console.error("Failed to create poll", error);
    }
  };

  const handleVote = async (pollId, selectedOptionIds) => {
    try {
      // Current UI supports single vote mostly, or multi
      // API supports single vote per call for now.
      // If multi-select is strict requirement, we adapt API loop.
      // Assuming single vote for now from PollCard logic usually.

      const optionId = selectedOptionIds[0]; // Take first
      await votePoll(pollId, optionId);

      // Optimistic update could happen here, but waiting for socket is safer for consistency
    } catch (error) {
      console.error("Failed to vote", error);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-boxdark relative">
      {/* Sticky Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-stroke dark:border-strokedark bg-white/90 dark:bg-boxdark/90 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
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
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {polls.length === 0 ? (
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
      </div>

      <CreatePollModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreatePoll}
      />
    </div>
  );
}
