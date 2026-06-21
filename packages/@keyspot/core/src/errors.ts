export class KeySpotError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly retryable: boolean;
  readonly details: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    retryable: boolean = false,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.details = details;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      retryable: this.retryable,
      details: this.details,
    };
  }
}

export class VaultError extends KeySpotError {
  constructor(
    message: string,
    code: string = 'VAULT_OPERATION_FAILED',
    statusCode: number = 500,
    retryable: boolean = true,
    details: Record<string, unknown> = {},
  ) {
    super(message, code, statusCode, retryable, details);
  }
}

export class WorkerError extends KeySpotError {
  constructor(
    message: string,
    code: string = 'WORKER_FAILED',
    statusCode: number = 500,
    retryable: boolean = true,
    details: Record<string, unknown> = {},
  ) {
    super(message, code, statusCode, retryable, details);
  }
}

export class AuthError extends KeySpotError {
  constructor(
    message: string,
    code: string = 'AUTH_FAILED',
    statusCode: number = 401,
    details: Record<string, unknown> = {},
  ) {
    super(message, code, statusCode, false, details);
  }
}

export class PaymentRequiredError extends KeySpotError {
  constructor(
    message: string,
    code: string = 'PAYMENT_REQUIRED',
    statusCode: number = 402,
    details: Record<string, unknown> = {},
  ) {
    super(message, code, statusCode, false, details);
  }
}

export class ScanError extends KeySpotError {
  constructor(
    message: string,
    code: string = 'SCAN_FAILED',
    statusCode: number = 400,
    details: Record<string, unknown> = {},
  ) {
    super(message, code, statusCode, false, details);
  }
}

export class ConfigurationError extends KeySpotError {
  constructor(
    message: string,
    code: string = 'INVALID_CONFIG',
    details: Record<string, unknown> = {},
  ) {
    super(message, code, 500, false, details);
  }
}

export class ValidationError extends KeySpotError {
  constructor(
    message: string,
    code: string = 'VALIDATION_FAILED',
    statusCode: number = 400,
    details: Record<string, unknown> = {},
  ) {
    super(message, code, statusCode, false, details);
  }
}

export function isKeySpotError(err: unknown): err is KeySpotError {
  return err instanceof KeySpotError;
}

export function toStatusCode(err: unknown): number {
  if (err instanceof KeySpotError) return err.statusCode;
  if (err instanceof SyntaxError) return 400;
  return 500;
}
