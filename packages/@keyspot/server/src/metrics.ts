import { Request, Response, NextFunction } from 'express';

export interface Counter {
  inc(labels?: Record<string, string>): void;
}

export interface Histogram {
  observe(value: number, labels?: Record<string, string>): void;
}

export interface Gauge {
  set(value: number, labels?: Record<string, string>): void;
  inc(labels?: Record<string, string>): void;
  dec(labels?: Record<string, string>): void;
}

const HISTOGRAM_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

/** Sanitize a path for use as a metric label value — cap cardinality. */
function sanitizePath(p: string): string {
  // Replace dynamic segments (IDs, UUIDs) with a placeholder
  return p
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
    .replace(/\/\d+/g, '/:id');
}

/** Bucket HTTP status codes into ranges. */
function bucketStatus(code: number): string {
  if (code >= 500) return '5xx';
  if (code >= 400) return '4xx';
  if (code >= 300) return '3xx';
  if (code >= 200) return '2xx';
  return '1xx';
}

export class MetricsRegistry {
  private counters = new Map<string, { help: string; labels: string[]; values: Map<string, number> }>();
  private histograms = new Map<string, { help: string; labels: string[]; values: Map<string, number[]> }>();
  private gauges = new Map<string, { help: string; labels: string[]; values: Map<string, number> }>();

  counter(name: string, help: string, labels: string[] = []): Counter {
    if (!this.counters.has(name)) {
      this.counters.set(name, { help, labels, values: new Map() });
    }
    const entry = this.counters.get(name)!;
    return {
      inc: (l?: Record<string, string>) => {
        const key = l ? serializeLabels(l) : '_total';
        entry.values.set(key, (entry.values.get(key) ?? 0) + 1);
      },
    };
  }

  histogram(name: string, help: string, labels: string[] = []): Histogram {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, { help, labels, values: new Map() });
    }
    const entry = this.histograms.get(name)!;
    return {
      observe: (value: number, l?: Record<string, string>) => {
        const key = l ? serializeLabels(l) : '_total';
        const arr = entry.values.get(key) ?? [];
        arr.push(value);
        entry.values.set(key, arr);
      },
    };
  }

  gauge(name: string, help: string, labels: string[] = []): Gauge {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, { help, labels, values: new Map() });
    }
    const entry = this.gauges.get(name)!;
    return {
      set: (value: number, l?: Record<string, string>) => {
        const key = l ? serializeLabels(l) : '_total';
        entry.values.set(key, value);
      },
      inc: (l?: Record<string, string>) => {
        const key = l ? serializeLabels(l) : '_total';
        entry.values.set(key, (entry.values.get(key) ?? 0) + 1);
      },
      dec: (l?: Record<string, string>) => {
        const key = l ? serializeLabels(l) : '_total';
        entry.values.set(key, (entry.values.get(key) ?? 1) - 1);
      },
    };
  }

  export(): string {
    const lines: string[] = [];
    for (const [name, c] of this.counters) {
      lines.push(`# HELP ${name} ${c.help}`);
      lines.push(`# TYPE ${name} counter`);
      for (const [key, value] of c.values) {
        const labelStr = key === '_total' ? '' : `{${key}}`;
        lines.push(`${name}${labelStr} ${value}`);
      }
    }
    for (const [name, h] of this.histograms) {
      lines.push(`# HELP ${name} ${h.help}`);
      lines.push(`# TYPE ${name} histogram`);
      for (const [key, values] of h.values) {
        const labelStr = key === '_total' ? '' : `{${key}}`;
        values.sort((a, b) => a - b);
        const count = values.length;
        const sum = values.reduce((a, b) => a + b, 0);
        lines.push(`${name}_count${labelStr} ${count}`);
        lines.push(`${name}_sum${labelStr} ${sum.toFixed(2)}`);
        for (const le of HISTOGRAM_BUCKETS) {
          const bucketCount = values.filter(v => v <= le).length;
          lines.push(`${name}_bucket${labelStr}{le="${le}"} ${bucketCount}`);
        }
        lines.push(`${name}_bucket${labelStr}{le="+Inf"} ${count}`);
      }
    }
    for (const [name, g] of this.gauges) {
      lines.push(`# HELP ${name} ${g.help}`);
      lines.push(`# TYPE ${name} gauge`);
      for (const [key, value] of g.values) {
        const labelStr = key === '_total' ? '' : `{${key}}`;
        lines.push(`${name}${labelStr} ${value}`);
      }
    }
    return lines.join('\n');
  }
}

// Global registry
const registry = new MetricsRegistry();

function serializeLabels(labels: Record<string, string>): string {
  return Object.entries(labels)
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
}

// Pre-define key metrics
export const metrics = {
  checkpointTotal: registry.counter('keyspot_checkpoint_total', 'Total checkpoint calls', ['status']),
  checkpointDuration: registry.histogram('keyspot_checkpoint_duration_ms', 'Checkpoint duration in ms'),
  scanTotal: registry.counter('keyspot_scan_total', 'Total scan calls', ['status']),
  secretsFound: registry.counter('keyspot_secrets_found_total', 'Secrets detected', ['type']),
  vaultWrites: registry.counter('keyspot_vault_writes_total', 'Vault write operations'),
  promptValidationTotal: registry.counter('keyspot_prompt_validation_total', 'Prompt validation calls', ['blocked']),
  httpRequestDuration: registry.histogram('keyspot_http_request_duration_ms', 'HTTP request duration', ['method', 'path', 'status']),
  // Gauges
  activeRequests: registry.gauge('keyspot_active_requests', 'Currently in-flight checkpoint/scan operations'),
  vaultConnected: registry.gauge('keyspot_vault_connected', 'Vault backend connectivity (1=connected, 0=disconnected)'),
  workerPoolDepth: registry.gauge('keyspot_worker_pool_depth', 'Number of queued worker pool jobs'),
};

/** Middleware: record HTTP request duration with sanitized labels. */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  metrics.activeRequests.inc();
  res.on('finish', () => {
    metrics.activeRequests.dec();
    metrics.httpRequestDuration.observe(Date.now() - start, {
      method: req.method,
      path: sanitizePath(req.route?.path || req.path),
      status: bucketStatus(res.statusCode),
    });
  });
  next();
}

/** Handler: export Prometheus-format metrics. */
export function metricsHandler(_req: Request, res: Response): void {
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(registry.export());
}
