/**
 * Professional Logging System for VizionMenu API
 * Structured logging with different levels and contexts
 */

const fs = require('fs');
const path = require('path');

/**
 * Log levels in order of priority
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

/**
 * Professional Logger Class
 */
class Logger {
  constructor(options = {}) {
    this.level = LOG_LEVELS[options.level?.toUpperCase()] ?? LOG_LEVELS.INFO;
    this.service = options.service || 'VizionMenu-API';
    this.environment = process.env.NODE_ENV || 'development';
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile === true;
    this.logDir = options.logDir || path.join(process.cwd(), 'logs');

    // Create logs directory if file logging is enabled
    if (this.enableFile) {
      this.ensureLogDirectory();
    }
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Format log entry with structured data
   */
  formatLogEntry(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      service: this.service,
      environment: this.environment,
      message,
      ...meta
    };

    // Add request context if available
    if (meta.req) {
      logEntry.request = {
        id: meta.req.id || this.generateRequestId(),
        method: meta.req.method,
        url: meta.req.originalUrl || meta.req.url,
        userAgent: meta.req.get('User-Agent'),
        ip: meta.req.ip || meta.req.connection.remoteAddress,
        userId: meta.req.currentUserId,
        chainId: meta.req.userChainId
      };
      delete logEntry.req; // Remove original req object
    }

    // Add error details if it's an error log
    if (level === 'error' && meta.error) {
      logEntry.errorDetails = {
        name: meta.error.name,
        message: meta.error.message,
        stack: meta.error.stack,
        code: meta.error.code,
        statusCode: meta.error.statusCode
      };
      delete logEntry.error; // Remove original error object from meta
    }

    return logEntry;
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Write log entry
   */
  writeLog(level, message, meta = {}) {
    if (LOG_LEVELS[level.toUpperCase()] > this.level) {
      return; // Skip if log level is below threshold
    }

    const logEntry = this.formatLogEntry(level, message, meta);

    // Console output
    if (this.enableConsole) {
      this.writeToConsole(level, logEntry);
    }

    // File output
    if (this.enableFile) {
      this.writeToFile(level, logEntry);
    }
  }

  /**
   * Write to console with colors
   */
  writeToConsole(level, logEntry) {
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[37m'  // White
    };
    const reset = '\x1b[0m';

    const color = colors[level.toLowerCase()] || colors.info;
    const timestamp = logEntry.timestamp;
    const levelStr = `[${level.toUpperCase()}]`.padEnd(7);

    console.log(`${color}${timestamp} ${levelStr}${reset} ${logEntry.message}`);

    // Print additional context for errors
    if (level === 'error' && logEntry.error) {
      console.log(`${color}Stack:${reset}`, logEntry.error.stack);
    }

    // Print request context in development
    if (this.environment === 'development' && logEntry.request) {
      console.log(`${color}Request:${reset}`, `${logEntry.request.method} ${logEntry.request.url}`);
    }
  }

  /**
   * Write to file
   */
  writeToFile(level, logEntry) {
    const logFileName = `${level}-${new Date().toISOString().split('T')[0]}.log`;
    const logFilePath = path.join(this.logDir, logFileName);
    const logLine = JSON.stringify(logEntry) + '\n';

    fs.appendFileSync(logFilePath, logLine);
  }

  /**
   * Log error with full context
   */
  error(message, meta = {}) {
    this.writeLog('error', message, meta);
  }

  /**
   * Log warning
   */
  warn(message, meta = {}) {
    this.writeLog('warn', message, meta);
  }

  /**
   * Log info
   */
  info(message, meta = {}) {
    this.writeLog('info', message, meta);
  }

  /**
   * Log debug (only in development)
   */
  debug(message, meta = {}) {
    this.writeLog('debug', message, meta);
  }

  /**
   * Log API request start
   */
  logRequest(req, res, next) {
    try {
      const startTime = Date.now();
      req.startTime = startTime;
      req.id = this.generateRequestId();

      this.info('Request started', {
        req,
        meta: {
          requestId: req.id,
          startTime
        }
      });

      // Log response when finished (only if res exists)
      if (res && typeof res.on === 'function') {
        res.on('finish', () => {
          const duration = Date.now() - startTime;
          const level = res.statusCode >= 400 ? 'warn' : 'info';

          this.writeLog(level, 'Request completed', {
            req,
            meta: {
              requestId: req.id,
              statusCode: res.statusCode,
              duration: `${duration}ms`,
              contentLength: res.get && res.get('content-length') || 0
            }
          });
        });
      }

      if (next) next();
    } catch (error) {
      console.error('Logger.logRequest error:', error);
      if (next) next();
    }
  }

  /**
   * Log analytics operation
   */
  logAnalytics(operation, chainId, params, result, duration) {
    this.info(`Analytics: ${operation}`, {
      meta: {
        operation,
        chainId,
        params,
        resultSize: Array.isArray(result) ? result.length : 1,
        duration: `${duration}ms`,
        performance: duration > 1000 ? 'slow' : 'normal'
      }
    });
  }

  /**
   * Log database operation
   */
  logDatabase(operation, table, params, duration) {
    this.debug(`Database: ${operation} on ${table}`, {
      meta: {
        operation,
        table,
        params,
        duration: `${duration}ms`,
        performance: duration > 500 ? 'slow' : 'normal'
      }
    });
  }
}

// Create singleton logger instance
const logger = new Logger({
  level: process.env.LOG_LEVEL || 'info',
  enableFile: process.env.ENABLE_FILE_LOGGING === 'true',
  service: 'VizionMenu-Analytics-API'
});

module.exports = { Logger, logger };