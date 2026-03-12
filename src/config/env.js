import dotenvFlow from 'dotenv-flow';

dotenvFlow.config();

function toInt(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function validate(required) {
  const missing = required.filter((key) => {
    const val = process.env[key];
    return val === undefined || val === null || val === '';
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

const requiredVars = ['DB_USER', 'DB_PASSWORD', 'DB_CONNECT_STRING'];
validate(requiredVars);

const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || 'development',

  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_CONNECT_STRING: process.env.DB_CONNECT_STRING,

  ORACLE_CLIENT_PATH: process.env.ORACLE_CLIENT_PATH || null,
  ORA_POOL_MIN: toInt(process.env.ORA_POOL_MIN, 2),
  ORA_POOL_MAX: toInt(process.env.ORA_POOL_MAX, 10),

  POLL_INTERVAL_MS: toInt(process.env.POLL_INTERVAL_MS, 60000),
  REPORTS_OUTPUT_DIR: process.env.REPORTS_OUTPUT_DIR || './data/reports',
  MAX_RETRY_ATTEMPTS: toInt(process.env.MAX_RETRY_ATTEMPTS, 2),
  STALE_TIMEOUT_MIN: toInt(process.env.STALE_TIMEOUT_MIN, 30),

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_DIR: process.env.LOG_DIR || './logs',

  ADMIN_EMAIL: process.env.ADMIN_EMAIL || null,
  NOTIFY_ON_FAILURE: toBool(process.env.NOTIFY_ON_FAILURE, true),

  SMTP_HOST: process.env.SMTP_HOST || null,
  SMTP_PORT: toInt(process.env.SMTP_PORT, null),
  SMTP_SECURE: toBool(process.env.SMTP_SECURE, false),
  SMTP_USER: process.env.SMTP_USER || null,
  SMTP_PASS: process.env.SMTP_PASS || null,
  SMTP_FROM: process.env.SMTP_FROM || null,
  SMTP_ALLOW_INSECURE: toBool(process.env.SMTP_ALLOW_INSECURE, false),

  DEFAULT_EMAIL_LANGUAGE: process.env.DEFAULT_EMAIL_LANGUAGE || 'EN',

  isDryRun: !process.env.SMTP_HOST,
});

export { env };
