export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  threshold?: number;
  resetTimeoutMs?: number;
  halfOpenMaxRequests?: number;
  onOpen?: (reason: string, stats: CircuitStats) => void;
  onClose?: (durationMs: number) => void;
  onHalfOpen?: (attempt: number) => void;
}

export interface CircuitStats {
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  openedAt: number | null;
  state: CircuitState;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private openedAt: number | null = null;
  private halfOpenAttempts = 0;

  readonly threshold: number;
  readonly resetTimeoutMs: number;
  readonly halfOpenMaxRequests: number;
  readonly onOpen?: (reason: string, stats: CircuitStats) => void;
  readonly onClose?: (durationMs: number) => void;
  readonly onHalfOpen?: (attempt: number) => void;

  constructor(options: CircuitBreakerOptions = {}) {
    this.threshold = options.threshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
    this.halfOpenMaxRequests = options.halfOpenMaxRequests ?? 1;
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.onHalfOpen = options.onHalfOpen;
  }

  getState(): CircuitState {
    if (this.state === CircuitState.OPEN && this.openedAt !== null) {
      if (Date.now() - this.openedAt >= this.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenAttempts = 0;
        this.onHalfOpen?.(0);
      }
    }
    return this.state;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === CircuitState.OPEN) {
      throw this.buildError('Circuit breaker is OPEN');
    }

    if (currentState === CircuitState.HALF_OPEN) {
      if (this.halfOpenAttempts >= this.halfOpenMaxRequests) {
        throw this.buildError('Circuit breaker is HALF_OPEN, max probe attempts reached');
      }
      this.halfOpenAttempts++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      const duration = this.openedAt !== null ? Date.now() - this.openedAt : 0;
      this.reset();
      this.onClose?.(duration);
    } else {
      this.successCount++;
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  private onFailure(reason: string): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.openedAt = Date.now();
      this.halfOpenAttempts = 0;
      this.onOpen?.(reason, this.getStats());
      return;
    }

    if (this.failureCount >= this.threshold && this.state === CircuitState.CLOSED) {
      this.state = CircuitState.OPEN;
      this.openedAt = Date.now();
      this.onOpen?.(reason, this.getStats());
    }
  }

  private buildError(message: string): Error {
    return new Error(`${message} (failures=${this.failureCount}, state=${this.state})`);
  }

  getStats(): CircuitStats {
    return {
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      openedAt: this.openedAt,
      state: this.state,
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.openedAt = null;
    this.halfOpenAttempts = 0;
  }
}
