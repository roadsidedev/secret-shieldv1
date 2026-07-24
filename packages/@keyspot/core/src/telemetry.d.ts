export interface Span {
    end(): void;
    setAttribute(key: string, value: string | number | boolean): void;
    addEvent(name: string, attributes?: Record<string, unknown>): void;
}
export interface Tracer {
    startSpan(name: string, attributes?: Record<string, unknown>): Span;
}
export declare const noopTracer: Tracer;
/**
 * Console tracer — logs span start/end with duration for debugging.
 */
export declare class ConsoleTracer implements Tracer {
    private name;
    constructor(name?: string);
    startSpan(name: string, attributes?: Record<string, unknown>): Span;
}
/**
 * KeySpotTracer wraps core operations with span timing.
 */
export declare class KeySpotTracer {
    private tracer;
    constructor(tracer?: Tracer);
    setTracer(tracer: Tracer): void;
    traceCheckpoint<T>(state: unknown, fn: () => Promise<T>): Promise<T>;
    traceScan<T>(data: unknown, fn: () => Promise<T>): Promise<T>;
    traceVaultWrite<T>(secret: string, fn: () => Promise<T>): Promise<T>;
}
/**
 * OpenTelemetry-compatible tracer.
 * Wraps native performance API into OTel-style spans.
 * When @opentelemetry/api is available, auto-bridges to it.
 */
export declare class OtelTracer implements Tracer {
    private name;
    private otel;
    constructor(name?: string);
    startSpan(name: string, attributes?: Record<string, unknown>): Span;
}
export declare function setGlobalTracer(tracer: Tracer): void;
export declare function getGlobalTracer(): Tracer;
//# sourceMappingURL=telemetry.d.ts.map