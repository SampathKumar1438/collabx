import { motion, AnimatePresence } from "framer-motion";
import { X, UserCircle } from "@phosphor-icons/react";

export default function VotersListModal({ isOpen, onClose, poll }) {
  if (!isOpen || !poll) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white dark:bg-boxdark rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]"
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
            {poll.options.map((option) => (
              <div key={option.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-black dark:text-white">
                    {option.text}
                  </h3>
                  <span className="text-xs font-medium text-body dark:text-bodydark bg-gray-100 dark:bg-meta-4 px-2 py-0.5 rounded-full">
                    {option.votes} vote{option.votes !== 1 && "s"}
                  </span>
                </div>

                {option.voters && option.voters.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {option.voters.map((voter, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm text-body dark:text-bodydark pl-2"
                      >
                        <UserCircle size={20} weight="duotone" />
                        <span>{voter}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-body/50 dark:text-bodydark/50 italic pl-2">
                    No votes yet
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
