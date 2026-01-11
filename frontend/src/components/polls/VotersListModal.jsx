import { motion, AnimatePresence } from "framer-motion";
import { X, UserCircle } from "@phosphor-icons/react";
import { createPortal } from "react-dom";

export default function VotersListModal({ isOpen, onClose, poll }) {
  if (!isOpen || !poll) return null;

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-0"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-white dark:bg-boxdark rounded-t-2xl md:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-stroke dark:border-strokedark">
            <div>
              <h2 className="text-lg font-bold text-black dark:text-white">
                Poll Results
              </h2>
              <p className="text-xs text-body dark:text-bodydark truncate max-w-xs">
                {poll.question}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-body dark:text-bodydark hover:text-black dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-meta-4"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {poll.options.map((option, index) => {
              const totalVotes = poll.options.reduce(
                (acc, opt) => acc + (opt.votes || 0),
                0
              );
              const percentage =
                totalVotes === 0
                  ? 0
                  : Math.round(((option.votes || 0) / totalVotes) * 100);

              return (
                <div
                  key={option.optionId || option.id || index}
                  className="space-y-2"
                >
                  <div className="relative overflow-hidden rounded-lg bg-gray-50 dark:bg-meta-4/30 border border-stroke dark:border-strokedark p-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className="absolute top-0 left-0 h-full bg-primary/10 dark:bg-primary/20"
                      transition={{ duration: 0.5 }}
                    />
                    <div className="relative z-10 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                        {option.text}
                        {percentage > 0 && (
                          <span className="text-xs font-normal text-body dark:text-bodydark">
                            • {percentage}%
                          </span>
                        )}
                      </h3>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {option.votes}
                      </span>
                    </div>
                  </div>

                  {/* Voters List */}
                  {!poll.anonymous &&
                    option.voters &&
                    option.voters.length > 0 && (
                      <div className="flex flex-col gap-2 pl-2">
                        {option.voters.map((voter, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm text-body dark:text-bodydark"
                          >
                            <UserCircle
                              size={20}
                              weight="duotone"
                              className="text-primary"
                            />
                            <span>{voter}</span>
                          </div>
                        ))}
                      </div>
                    )}

                  {!poll.anonymous &&
                    (!option.voters || option.voters.length === 0) &&
                    option.votes > 0 && (
                      <div className="pl-2">
                        <span className="text-xs italic text-body/50">
                          Voters hidden or unknown
                        </span>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
