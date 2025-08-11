const winston = require('winston');
const config = require('../config');

const logLevel = config.server.env === 'production' ? 'info' : 'debug';

// Define custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create console transport
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level}]: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
      }`;
    })
  ),
});

// Create file transport for errors
const errorFileTransport = new winston.transports.File({
  filename: 'logs/error.log',
  level: 'error',
  format: logFormat,
  maxsize: 5242880, // 5MB
  maxFiles: 5,
});

// Create file transport for combined logs
const combinedFileTransport = new winston.transports.File({
  filename: 'logs/combined.log',
  format: logFormat,
  maxsize: 5242880, // 5MB
  maxFiles: 5,
});

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  defaultMeta: { service: 'drone-monitoring-backend' },
  transports: [
    consoleTransport,
    errorFileTransport,
    combinedFileTransport
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ],
  exitOnError: false,
});

module.exports = logger;