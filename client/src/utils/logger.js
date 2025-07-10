/**
 * Logger utility that only logs in development mode
 * In production, these will be no-ops to avoid any console output
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: isDevelopment ? console.log.bind(console) : () => {},
  warn: isDevelopment ? console.warn.bind(console) : () => {},
  info: isDevelopment ? console.info.bind(console) : () => {},
  debug: isDevelopment ? console.debug.bind(console) : () => {},
  error: console.error.bind(console), // Always keep errors for debugging
  
  // Utility function for conditional logging
  dev: {
    log: (...args) => isDevelopment && console.log(...args),
    warn: (...args) => isDevelopment && console.warn(...args),
    info: (...args) => isDevelopment && console.info(...args),
    debug: (...args) => isDevelopment && console.debug(...args),
  }
};

export default logger; 