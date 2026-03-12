import { createLogger, format, transports } from 'winston';
import { mkdirSync } from 'node:fs';
import { env } from '../../config/env.js';

mkdirSync(env.LOG_DIR, { recursive: true });

const isDev = env.NODE_ENV === 'development';

const consoleFormat = format.combine(
  format.timestamp(),
  isDev ? format.colorize() : format.uncolorize(),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${metaString}`;
  })
);

const fileJsonFormat = format.combine(
  format.timestamp(),
  format.json()
);

const logger = createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: 'email-worker' },
  transports: [
    new transports.Console({
      format: consoleFormat,
    }),
    new transports.File({
      filename: `${env.LOG_DIR}/worker.log`,
      format: fileJsonFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new transports.File({
      filename: `${env.LOG_DIR}/error.log`,
      level: 'error',
      format: fileJsonFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

export default logger;
