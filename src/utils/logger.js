/**
 * Lightweight logger with levels for production-safe logging
 */

// Logger levels
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

// Current log level - can be controlled by environment or localStorage
let currentLevel = LogLevel.WARN; // Default to WARN for production

// Check if we're in development mode
const isDev = () => {
  // Check various development indicators
  return (
    typeof window !== 'undefined' && (
      window.location?.hostname === 'localhost' ||
      window.location?.hostname === '127.0.0.1' ||
      window.location?.protocol === 'file:' ||
      localStorage.getItem('debug') === 'true'
    )
  );
};

// In development, default to DEBUG level
if (isDev()) {
  currentLevel = LogLevel.DEBUG;
}

// Allow runtime level control
if (typeof localStorage !== 'undefined') {
  const savedLevel = localStorage.getItem('logLevel');
  if (savedLevel !== null) {
    currentLevel = parseInt(savedLevel, 10) || currentLevel;
  }
}

/**
 * Logger implementation
 */
class Logger {
  constructor(name = 'App') {
    this.name = name;
  }

  debug(...args) {
    if (currentLevel <= LogLevel.DEBUG) {
      console.log(`[${this.name}] DEBUG:`, ...args);
    }
  }

  info(...args) {
    if (currentLevel <= LogLevel.INFO) {
      console.log(`[${this.name}] INFO:`, ...args);
    }
  }

  warn(...args) {
    if (currentLevel <= LogLevel.WARN) {
      console.warn(`[${this.name}] WARN:`, ...args);
    }
  }

  error(...args) {
    if (currentLevel <= LogLevel.ERROR) {
      console.error(`[${this.name}] ERROR:`, ...args);
    }
  }

  // Utility methods
  static setLevel(level) {
    currentLevel = level;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('logLevel', level.toString());
    }
  }

  static getLevel() {
    return currentLevel;
  }

  static enableDebug() {
    Logger.setLevel(LogLevel.DEBUG);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('debug', 'true');
    }
  }

  static disableDebug() {
    Logger.setLevel(LogLevel.WARN);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('debug');
    }
  }
}

// Export default logger instance
export const logger = new Logger('QuoteApp');

// Export Logger class and levels for advanced usage
export { Logger, LogLevel };

// For browser console debugging
if (typeof window !== 'undefined') {
  window.Logger = Logger;
  window.LogLevel = LogLevel;
}