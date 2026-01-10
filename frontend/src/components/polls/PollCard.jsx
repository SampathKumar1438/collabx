import { useState, useEffect } from "react";
import { Check, Circle, Eye, Clock } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import VotersListModal from "./VotersListModal";

export default function PollCard({ poll, onVote }) {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [showVotersModal, setShowVotersModal] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (poll.expiry) {
      const checkExpiry = () => {
        const now = new Date();
        const expiryDate = new Date(poll.expiry);
        setIsExpired(now > expiryDate);
      };

      checkExpiry();
      const timer = setInterval(checkExpiry, 60000); // Check every minute
      return () => clearInterval(timer);
    }
  }, [poll.expiry]);

  const isMultiple = poll.type === "multiple";
  const isOpen = poll.status === "open" && !isExpired;
  const totalVotes = poll.options.reduce(
    (acc, opt) => acc + (opt.votes || 0),
    0
  );

  const handleSelect = (optionId) => {
    if (hasVoted || !isOpen) return;

    if (isMultiple) {
      setSelectedOptions((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const handleVote = () => {
    if (selectedOptions.length === 0) return;
    setHasVoted(true);
    onVote(poll.pollId, selectedOptions);
  };

  return (
    <motion.div
      layout
      className={`rounded-xl border p-4 transition-all duration-300 ${
        isOpen
          ? "bg-white dark:bg-boxdark border-stroke dark:border-strokedark shadow-sm"
          : "bg-gray-50 dark:bg-meta-4/20 border-stroke/50 dark:border-strokedark/50 opacity-90"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-black dark:text-white leading-tight">
            {poll.question}
          </h3>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-body dark:text-bodydark">
            <span className="font-medium">
              {typeof poll.creator === "string"
                ? poll.creator
                : poll.creator?.username || "Unknown"}
            </span>
            <span>•</span>
            <span
              className={`${
                isOpen ? "text-success" : "text-body dark:text-bodydark"
              } font-medium px-1.5 py-0.5 rounded-full bg-opacity-10 dark:bg-opacity-10 ${
                isOpen ? "bg-success" : "bg-gray-500"
              }`}
            >
              {isOpen ? "Open" : "Closed"}
            </span>
            {poll.anonymous && <span>• Anonymous</span>}
            {isOpen && poll.expiry && (
              <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                <Clock size={12} weight="bold" />
                Ends{" "}
                {new Date(poll.expiry).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            {isExpired && poll.expiry && (
              <span className="text-xs text-danger">Ended</span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {(poll.options || []).map((option) => {
          const isSelected = selectedOptions.includes(
            option.optionId || option.id
          );
          const percentage =
            totalVotes === 0
              ? 0
              : Math.round(((option.votes || 0) / totalVotes) * 100);

          return (
            <div
              key={option.optionId || option.id}
              onClick={() => handleSelect(option.optionId || option.id)}
              className={`relative overflow-hidden rounded-lg border transition-all cursor-pointer ${
                hasVoted || !isOpen
                  ? "border-transparent bg-gray-100 dark:bg-meta-4/30"
                  : isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-stroke dark:border-strokedark hover:border-primary/50 dark:hover:border-primary/50 bg-white dark:bg-boxdark"
              }`}
            >
              {/* Progress Bar Background (Results) */}
              {(hasVoted || !isOpen) && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`absolute top-0 left-0 h-full ${
                    isSelected ? "bg-primary/20" : "bg-gray-200 dark:bg-meta-4"
                  }`}
                />
              )}

              <div className="relative z-10 flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  {!hasVoted && isOpen && (
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-${
                        isMultiple ? "md" : "full"
                      } border ${
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-body/30 dark:border-bodydark/30"
                      }`}
                    >
                      {isSelected &&
                        (isMultiple ? (
                          <Check size={12} weight="bold" />
                        ) : (
                          <Circle
                            size={8}
                            weight="fill"
                            className="text-white"
                          />
                        ))}
                    </div>
                  )}
                  <span
                    className={`text-sm font-medium ${
                      isSelected ? "text-primary" : "text-black dark:text-white"
                    }`}
                  >
                    {option.text}
                  </span>
                </div>

                {(hasVoted || !isOpen) && (
                  <div className="flex items-center gap-3 text-xs font-medium text-body dark:text-bodydark">
                    <span>{percentage}%</span>
                    <span>({option.votes || 0})</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Actions */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-body dark:text-bodydark/70">
            {totalVotes} vote{totalVotes !== 1 && "s"}
            {isMultiple && isOpen && " • Multiple Selection"}
          </span>

          {/* Show Voters Trigger */}
          {!poll.anonymous && totalVotes > 0 && (hasVoted || !isOpen) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowVotersModal(true);
              }}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Eye size={14} />
              View Voters
            </button>
          )}
        </div>

        <AnimatePresence>
          {selectedOptions.length > 0 && !hasVoted && isOpen && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={handleVote}
              className="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg shadow-lg hover:bg-primary/90 transition-colors"
            >
              Vote
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <VotersListModal
        isOpen={showVotersModal}
        onClose={() => setShowVotersModal(false)}
        poll={poll}
      />
    </motion.div>
  );
}
