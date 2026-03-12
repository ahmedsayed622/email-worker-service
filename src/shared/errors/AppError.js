class AppError extends Error {
  constructor({ code, message, retryable = false, cause = null, details = null }) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.retryable = retryable;
    this.cause = cause;
    this.details = details;
  }
}

export { AppError };
