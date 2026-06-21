export interface Span {
  end(): void;
  setAttribute(key: string, value: string | number | boolean): void;
  addEvent(name: string, attributes?: Record<string, unknown>): void;
}

export interface Tracer {
  startSpan(name: string, attributes?: Record<string, unknown>): Span;
}

/**
 * Default no-op tracer — does nothing, zero overhead.
 */
class NoopSpan implements Span {
  end(): void {}
  setAttribute(_key: string, _value: string | number | boolean): void {}
  addEvent(_name: string, _attributes?: Record<string, unknown>): void {}
}

const noopSpan = new NoopSpan();

export const noopTracer: Tracer = {
  startSpan: () => noopSpan,
};

/**
 * Console tracer — logs span start/end with duration for debugging.
 */
export class ConsoleTracer implements Tracer {
  constructor(private name: string = 'keyspot') {}

  startSpan(name: string, attributes?: Record<string, unknown>): Span {
    const id = `${this.name}.${name}`;
    const start = performance.now();
    console.log(`[TRACE] ${id} start`, attributes ?? '');

    return {
      end: () => {
        const duration = performance.now() - start;
        console.log(`[TRACE] ${id} end ${duration.toFixed(2)}ms`);
      },
      setAttribute: () => {},
      addEvent: () => {},
    };
  }
}

/**
 * KeySpotTracer wraps core operations with span timing.
 */
export class KeySpotTracer {
  private tracer: Tracer;

  constructor(tracer?: Tracer) {
    this.tracer = tracer ?? noopTracer;
  }

  setTracer(tracer: Tracer): void {
    this.tracer = tracer;
  }

  traceCheckpoint<T>(state: unknown, fn: () => Promise<T>): Promise<T> {
    const span = this.tracer.startSpan('checkpoint', {
      stateType: typeof state,
    });
    return fn().finally(() => span.end());
  }

  traceScan<T>(data: unknown, fn: () => Promise<T>): Promise<T> {
    const span = this.tracer.startSpan('scan', {
      dataType: typeof data,
    });
    return fn().finally(() => span.end());
  }

  traceVaultWrite<T>(secret: string, fn: () => Promise<T>): Promise<T> {
    const span = this.tracer.startSpan('vault.write', {
      secretLength: secret.length,
    });
    return fn().finally(() => span.end());
  }
}

/**
 * OpenTelemetry-compatible tracer.
 * Wraps native performance API into OTel-style spans.
 * When @opentelemetry/api is available, auto-bridges to it.
 */
export class OtelTracer implements Tracer {
  private otel: any = null;

  constructor(private name: string = 'keyspot') {
    import('@opentelemetry/api').then(mod => { this.otel = mod; }).catch(() => {});
  }

  startSpan(name: string, attributes?: Record<string, unknown>): Span {
    const fullName = `${this.name}.${name}`;
    const start = performance.now();

    // If real OTel is loaded, use it
    if (this.otel) {
      const tracer = this.otel.trace.getTracer(this.name);
      const span = tracer.startSpan(name, { attributes });
      return {
        end: () => span.end(),
        setAttribute: (k, v) => span.setAttribute(k, v),
        addEvent: (n, a) => span.addEvent(n, a),
      };
    }

    // Fallback: performance-arbitrumd span
    return {
      end: () => {
        const duration = performance.now() - start;
        if (duration > 5) {
          console.log(`[OTEL] ${fullName} ${duration.toFixed(2)}ms`, attributes ?? '');
        }
      },
      setAttribute: () => {},
      addEvent: () => {},
    };
  }
}

// ── Global tracer reference ──

let globalTracer: Tracer = noopTracer;

export function setGlobalTracer(tracer: Tracer): void {
  globalTracer = tracer;
}

export function getGlobalTracer(): Tracer {
  return globalTracer;
}

