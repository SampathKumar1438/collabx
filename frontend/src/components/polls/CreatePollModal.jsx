import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Trash,
  Calendar,
  Users,
  EyeSlash,
  UserCircle,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { usersAPI } from "../../services/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function CreatePollModal({ isOpen, onClose, onCreate }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [settings, setSettings] = useState({
    anonymous: false,
    multipleChoice: false,
    expiry: null,
    audience: [], // Array of user IDs
  });
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showAudienceSelect, setShowAudienceSelect] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = availableUsers.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (showAudienceSelect && availableUsers.length === 0) {
      const fetchUsers = async () => {
        try {
          const res = await usersAPI.getAll(100);
          // Check for nested data structure from backend response wrapper
          const users = res.data?.data || res.data || [];
          setAvailableUsers(users);
        } catch (err) {
          console.error("Failed to fetch users", err);
        }
      };
      fetchUsers();
    }
  }, [showAudienceSelect]);

  const modalRef = useRef(null);

  // Focus trap and close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    const validOptions = options.filter((opt) => opt.trim() !== "");
    if (validOptions.length < 2) return;

    onCreate({
      question,
      options: validOptions,
      settings,
    });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setQuestion("");
    setOptions(["", ""]);
    setSettings({
      anonymous: false,
      multipleChoice: false,
      expiry: null,
      audience: [],
    });
    setShowAudienceSelect(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-0">
        <motion.div
          ref={modalRef}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-white dark:bg-boxdark rounded-t-2xl md:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-stroke dark:border-strokedark">
            <h2 className="text-lg font-bold text-black dark:text-white">
              Create Poll
            </h2>
            <button
              onClick={onClose}
              className="text-body dark:text-bodydark hover:text-black dark:hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Form Content */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-4 space-y-6"
          >
            {/* Question */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black dark:text-white">
                Question
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask something..."
                className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-4 py-3 text-black dark:text-white dark:border-strokedark focus:border-primary focus-visible:outline-none dark:focus:border-primary resize-none h-24"
                autoFocus
              />
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-black dark:text-white">
                Options
              </label>
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 rounded-lg border-[1.5px] border-stroke bg-transparent px-4 py-2.5 text-black dark:text-white dark:border-strokedark focus:border-primary focus-visible:outline-none dark:focus:border-primary"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                    >
                      <Trash size={20} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddOption}
                className="flex items-center gap-2 text-primary font-medium text-sm px-2 py-1 hover:bg-primary/5 rounded-lg transition-colors"
              >
                <Plus size={16} />
                Add Option
              </button>
            </div>

            {/* Settings */}
            <div className="space-y-4 pt-4 border-t border-stroke dark:border-strokedark">
              <label className="text-sm font-medium text-black dark:text-white">
                Settings
              </label>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-meta-4 rounded-lg">
                    <EyeSlash
                      size={20}
                      className="text-body dark:text-bodydark"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black dark:text-white">
                      Anonymous Voting
                    </p>
                    <p className="text-xs text-body dark:text-bodydark">
                      Hide user names in results
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.anonymous}
                    onChange={(e) =>
                      setSettings({ ...settings, anonymous: e.target.checked })
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-meta-4 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-meta-4 rounded-lg">
                    <Users size={20} className="text-body dark:text-bodydark" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black dark:text-white">
                      Multiple Choice
                    </p>
                    <p className="text-xs text-body dark:text-bodydark">
                      Allow voting for multiple options
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.multipleChoice}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        multipleChoice: e.target.checked,
                      })
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-meta-4 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Expiry Date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-meta-4 rounded-lg">
                    <Calendar
                      size={20}
                      className="text-body dark:text-bodydark"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black dark:text-white">
                      Poll End Time (Optional)
                    </p>
                    <p className="text-xs text-body dark:text-bodydark">
                      Select when to auto-close
                    </p>
                  </div>
                </div>
                <DatePicker
                  selected={settings.expiry ? new Date(settings.expiry) : null}
                  onChange={(date) =>
                    setSettings({ ...settings, expiry: date.toISOString() })
                  }
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MM/dd/yyyy h:mm aa"
                  minDate={new Date()}
                  placeholderText="Select date & time"
                  className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-4 py-2 text-black dark:text-white dark:border-strokedark focus:border-[#F9A825] focus-visible:outline-none dark:focus:border-[#F9A825] text-sm cursor-pointer"
                  wrapperClassName="w-full"
                  calendarClassName="!font-sans shadow-lg rounded-lg overflow-hidden"
                />
              </div>

              {/* Audience Selection */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-meta-4 rounded-lg">
                      <UserCircle
                        size={20}
                        className="text-body dark:text-bodydark"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black dark:text-white">
                        Specific Audience
                      </p>
                      <p className="text-xs text-body dark:text-bodydark">
                        Limit to specific users (Default: Everyone)
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={showAudienceSelect}
                      onChange={(e) => {
                        setShowAudienceSelect(e.target.checked);
                        if (!e.target.checked) {
                          setSettings({ ...settings, audience: [] });
                        }
                      }}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-meta-4 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                  </label>
                </div>

                {showAudienceSelect && (
                  <div className="rounded-lg border border-stroke dark:border-strokedark p-3 space-y-2 bg-gray-50 dark:bg-meta-4/20">
                    {/* Search Input */}
                    <div className="relative mb-2">
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-xs rounded-md border border-stroke dark:border-strokedark bg-white dark:bg-boxdark py-1.5 pl-8 pr-3 focus:border-primary focus:outline-none"
                      />
                      <MagnifyingGlass
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-body dark:text-bodydark"
                      />
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <label
                            key={user.userId}
                            className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-meta-4 p-1.5 rounded"
                          >
                            <input
                              type="checkbox"
                              className="form-checkbox text-primary rounded"
                              checked={settings.audience.includes(user.userId)}
                              onChange={(e) => {
                                const newAudience = e.target.checked
                                  ? [...settings.audience, user.userId]
                                  : settings.audience.filter(
                                      (id) => id !== user.userId
                                    );
                                setSettings({
                                  ...settings,
                                  audience: newAudience,
                                });
                              }}
                            />
                            <span className="text-sm text-black dark:text-white">
                              {user.username}
                            </span>
                          </label>
                        ))
                      ) : (
                        <p className="text-xs text-body dark:text-bodydark text-center py-2">
                          {availableUsers.length === 0
                            ? "Loading users..."
                            : "No users found"}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="p-4 border-t border-stroke dark:border-strokedark flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-stroke dark:border-strokedark text-black dark:text-white hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                !question.trim() || options.filter((o) => o.trim()).length < 2
              }
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Poll
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
