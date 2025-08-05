import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  enableTimestamp: boolean;
  prefix?: string;
}

export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.WARN,
      enableColors: true,
      enableTimestamp: true,
      ...config,
    };
  }

  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  static configure(config: Partial<LoggerConfig>): void {
    if (Logger.instance) {
      Logger.instance.config = { ...Logger.instance.config, ...config };
    }
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    let formattedMessage = '';

    // Add timestamp
    if (this.config.enableTimestamp) {
      const timestamp = new Date().toISOString();
      formattedMessage += this.config.enableColors 
        ? chalk.gray(`[${timestamp}]`) 
        : `[${timestamp}]`;
      formattedMessage += ' ';
    }

    // Add level
    const levelStr = LogLevel[level];
    if (this.config.enableColors) {
      switch (level) {
        case LogLevel.DEBUG:
          formattedMessage += chalk.cyan(`[${levelStr}]`);
          break;
        case LogLevel.INFO:
          formattedMessage += chalk.blue(`[${levelStr}]`);
          break;
        case LogLevel.WARN:
          formattedMessage += chalk.yellow(`[${levelStr}]`);
          break;
        case LogLevel.ERROR:
          formattedMessage += chalk.red(`[${levelStr}]`);
          break;
      }
    } else {
      formattedMessage += `[${levelStr}]`;
    }

    // Add prefix if configured
    if (this.config.prefix) {
      formattedMessage += this.config.enableColors 
        ? chalk.magenta(`[${this.config.prefix}]`) 
        : `[${this.config.prefix}]`;
    }

    formattedMessage += ' ';

    // Add main message
    formattedMessage += message;

    // Add additional arguments
    if (args.length > 0) {
      formattedMessage += ' ' + args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
    }

    return formattedMessage;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage(LogLevel.INFO, message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, ...args));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(LogLevel.ERROR, message, ...args));
    }
  }

  // Convenience methods for common use cases
  log(message: string, ...args: any[]): void {
    this.info(message, ...args);
  }

  // Method to clear console (useful for UI components)
  clear(): void {
    console.clear();
  }

  // Method to create a child logger with a specific prefix
  child(prefix: string): Logger {
    const childLogger = new Logger({
      ...this.config,
      prefix: this.config.prefix ? `${this.config.prefix}:${prefix}` : prefix,
    });
    return childLogger;
  }
}

// Helper function to get log level from environment variable
function getLogLevelFromEnv(): LogLevel {
  const envLogLevel = process.env.LOGLEVEL;
  
  if (envLogLevel !== undefined) {
    const numericLevel = parseInt(envLogLevel, 10);
    
    // Validate the numeric level is within valid range
    if (!isNaN(numericLevel) && numericLevel >= 0 && numericLevel <= 3) {
      return numericLevel as LogLevel;
    }
    
    // Also support string values
    const upperCaseLevel = envLogLevel.toUpperCase();
    switch (upperCaseLevel) {
      case 'DEBUG':
        return LogLevel.DEBUG;
      case 'INFO':
        return LogLevel.INFO;
      case 'WARN':
        return LogLevel.WARN;
      case 'ERROR':
        return LogLevel.ERROR;
      default:
        // Invalid string value, fall through to default logic
        break;
    }
  }
  
  // Default behavior if LOGLEVEL is not set or invalid
  return process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.WARN;
}

// Export a default logger instance
export const logger = Logger.getInstance({
  level: getLogLevelFromEnv(),
  enableColors: true,
  enableTimestamp: true,
  prefix: 'KILOCODE',
});

// Export convenience functions
export const log = logger.log.bind(logger);
export const debug = logger.debug.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);