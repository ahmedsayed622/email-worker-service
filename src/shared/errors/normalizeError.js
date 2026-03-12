import { AppError } from './AppError.js';

function isOracleRetryable(errorNum) {
  const retryable = new Set([3113, 3114, 3135, 12170, 12541, 12543, 25408]);
  return retryable.has(Number(errorNum));
}

function normalizeError(err, context = '') {
  if (err instanceof AppError) return err;

  const message = err?.message || 'Unknown error';
  const lowerMessage = message.toLowerCase();
  const details = {
    context,
    errorNum: err?.errorNum ?? null,
    originalMessage: message,
    stackSnippet: err?.stack ? String(err.stack).split('\n').slice(0, 3).join('\n') : undefined,
  };

  const safeMessage = message.length > 4000 ? message.slice(0, 4000) : message;

  // ORA detection
  const oraMatch = message.match(/ORA-\d{5}/);
  if (oraMatch || err?.errorNum) {
    const oraCode = oraMatch ? oraMatch[0] : `ORA-${String(err.errorNum).padStart(5, '0')}`;
    const retryable = isOracleRetryable(err?.errorNum);
    return new AppError({
      code: oraCode,
      message: safeMessage,
      retryable,
      cause: err,
      details,
    });
  }

  if (lowerMessage.includes('pool') || lowerMessage.includes('connection')) {
    return new AppError({
      code: 'DB_POOL_DOWN',
      message: safeMessage,
      retryable: true,
      cause: err,
      details,
    });
  }

  if (err?.code === 'ENOENT') {
    return new AppError({
      code: 'SQL_FILE_MISSING',
      message: safeMessage,
      retryable: false,
      cause: err,
      details,
    });
  }

  if (err?.responseCode || err?.command === 'CONN' || context === 'email') {
    return new AppError({
      code: 'EMAIL_SEND_FAILED',
      message: safeMessage,
      retryable: true,
      cause: err,
      details,
    });
  }

  if (context === 'export') {
    return new AppError({
      code: 'EXPORT_FAILED',
      message: safeMessage,
      retryable: false,
      cause: err,
      details,
    });
  }

  return new AppError({
    code: 'UNEXPECTED',
    message: safeMessage,
    retryable: false,
    cause: err,
    details,
  });
}

export { normalizeError };
