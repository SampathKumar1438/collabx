import config from '../config';

/**
 * Frontend Logger Utility
 * Only logs to console in development environment
 * Prevents debug information leakage in production
 */

const logger = {
  info: (...args) => {
    if (config.APP.IS_DEV) {
      console.log('[INFO]', ...args);
    }
  },

  warn: (...args) => {
    if (config.APP.IS_DEV) {
      console.warn('[WARN]', ...args);
    }
  },

  error: (...args) => {
    // Errors are useful to see even in production console sometimes, 
    // but strict production apps might send this to Sentry/LogRocket
    console.error('[ERROR]', ...args);
  },

  debug: (...args) => {
    if (config.APP.IS_DEV) {
      console.debug('[DEBUG]', ...args);
    }
  },

  // Measure performance
  time: (label) => {
    if (config.APP.IS_DEV) {
      console.time(label);
    }
  },

  timeEnd: (label) => {
    if (config.APP.IS_DEV) {
      console.timeEnd(label);
    }
  },
};

export default logger;
