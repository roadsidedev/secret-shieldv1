import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Scanner } from './scanner.js';
import { TaintEngine } from './taint.js';
import { WorkerError, ConfigurationError } from './errors.js';
import { CircuitBreaker, type CircuitBreakerOptions } from './circuit-breaker.js';
import { runCheckpoint, type CheckpointInput } from './checkpoint-core.js';

export interface WorkerJob {
  type: 'scan' | 'prune' | 'checkpoint';
  data: any;
}

export interface WorkerPoolOptions {
  size?: number;
  jobTimeoutMs?: number;
  useIsolatedVM?: boolean;
  maxRetries?: number;
  maxQueueSize?: number;
  circuitBreaker?: CircuitBreakerOptions;
}

const BACKOFF_BASE_MS = 1000;

// ── Isolated VM Sandbox ────────────────────────────────────────

let ivm: any = null;
try {
  ivm = await import('isolated-vm');
} catch {
  // isolated-vm not available; fallback to worker_threads
}

export class IsolatedSandbox {
  private isolate: any;
  private context: any;

  constructor(private _memoryLimitMB: number = 64, private timeoutMs: number = 10000) {
    if (!ivm) {
      throw new ConfigurationError(
        'isolated-vm is required for IsolatedSandbox. Install isolated-vm or disable useIsolatedVM.',
        'ISOLATED_VM_UNAVAILABLE',
      );
    }
    this.isolate = new ivm.Isolate({ memoryLimit: this._memoryLimitMB });
    this.context = this.isolate.createContextSync();
  }

  /**
   * Run fixed scan patterns against data inside the isolate.
   * Does not accept arbitrary caller-supplied code (no new Function / eval of untrusted source).
   */
  async runScan(data: unknown): Promise<unknown[]> {
    const jail = this.context.global;
    const dataCopy = new ivm.ExternalCopy(data);
    jail.setSync('input', dataCopy.copyInto());
    const code = `
      (function() {
        const matches = [];
        const input = typeof globalThis.input === 'string' ? globalThis.input : JSON.stringify(globalThis.input);
        const patterns = [/sk-[a-zA-Z0-9]{48}/g, /\\bAKIA[0-9A-Z]{16}\\b/g, /\\b(?:0x)?[a-fA-F0-9]{64}\\b/g];
        for (const re of patterns) {
          let m;
          while ((m = re.exec(input)) !== null) {
            matches.push({ type: 'sandbox_match', redacted: '****', index: m.index });
          }
        }
        return matches;
      })()
    `;
    return this.context.evalSync(code, { timeout: this.timeoutMs, copy: true });
  }

  dispose(): void {
    if (this.isolate) {
      this.isolate.dispose();
      this.isolate = null;
    }
  }
}

// ── Worker Pool ─────────────────────────────────────────────────

export class WorkerPool {
  private queue: { job: WorkerJob; resolve: (val: any) => void; reject: (err: any) => void }[] = [];
  private activeCount = 0;
  private useInlineFallback: boolean;
  private circuitBreaker: CircuitBreaker;

  readonly maxRetries: number;
  readonly maxQueueSize: number;

  constructor(
    private size: number = 4,
    private jobTimeoutMs: number = 30000,
    private useIsolatedVM: boolean = false,
    options?: WorkerPoolOptions,
  ) {
    this.useInlineFallback = !this.workerScriptExists() && !useIsolatedVM;
    this.maxRetries = options?.maxRetries ?? 2;
    this.maxQueueSize = options?.maxQueueSize ?? 100;
    this.circuitBreaker = new CircuitBreaker({
      threshold: 5,
      resetTimeoutMs: 30_000,
      ...options?.circuitBreaker,
    });
  }

  private workerScriptExists(): boolean {
    try {
      const p = fileURLToPath(new URL('./worker-script.js', import.meta.url));
      return existsSync(p);
    } catch {
      return false;
    }
  }

  async run(job: WorkerJob): Promise<any> {
    if (this.queue.length >= this.maxQueueSize) {
      throw new WorkerError(
        `Worker pool queue full (${this.maxQueueSize}), rejecting job`,
        'WORKER_EXHAUSTED',
      );
    }

    return this.runWithRetry(job, 0);
  }

  private async runWithRetry(job: WorkerJob, attempt: number): Promise<any> {
    try {
      return await this.circuitBreaker.call(() => this.executeJob(job));
    } catch (err) {
      const isRetryable = err instanceof WorkerError && err.retryable;

      if (isRetryable && attempt < this.maxRetries) {
        const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.runWithRetry(job, attempt + 1);
      }

      // On final failure, try inline fallback if not already inline
      if (!this.useInlineFallback && !this.useIsolatedVM && attempt >= this.maxRetries) {
        try {
          return await this.runInline(job);
        } catch {
          throw new WorkerError(
            `Worker job failed after ${attempt + 1} attempts, inline fallback also failed`,
            'WORKER_FAILED',
            500,
            false,
          );
        }
      }

      throw err;
    }
  }

  private async executeJob(job: WorkerJob): Promise<any> {
    if (this.useIsolatedVM) {
      return this.runIsolated(job);
    }
    if (this.useInlineFallback) {
      return this.runInline(job);
    }
    if (this.activeCount < this.size) {
      return this.spawnAndRun(job);
    }
    return new Promise((resolve, reject) => {
      this.queue.push({ job, resolve, reject });
    });
  }

  private async runIsolated(job: WorkerJob): Promise<any> {
    this.activeCount++;
    const sandbox = new IsolatedSandbox(64, this.jobTimeoutMs);
    try {
      const result = await sandbox.runScan(job.data);
      this.activeCount--;
      this.processQueue();
      sandbox.dispose();
      return result;
    } catch (err) {
      this.activeCount--;
      this.processQueue();
      sandbox.dispose();
      throw new WorkerError(
        `Isolated VM execution failed: ${err instanceof Error ? err.message : String(err)}`,
        'ISOLATED_VM_FAILURE',
      );
    }
  }

  private stripRaw(matches: any): any {
    if (!Array.isArray(matches)) return matches;
    return matches.map((m: any) => {
      if (m && typeof m === 'object') {
        const { rawValue: _r, ...rest } = m;
        return rest;
      }
      return m;
    });
  }

  private async runInline(job: WorkerJob): Promise<any> {
    this.activeCount++;
    try {
      const taintEngine = new TaintEngine();
      const scanner = new Scanner({}, taintEngine);
      let result;
      if (job.type === 'scan') {
        result = this.stripRaw(await scanner.scan(job.data));
      } else if (job.type === 'checkpoint') {
        result = await runCheckpoint(job.data as CheckpointInput);
      }
      this.activeCount--;
      this.processQueue();
      return result;
    } catch (err) {
      this.activeCount--;
      this.processQueue();
      throw err;
    }
  }

  private spawnAndRun(job: WorkerJob): Promise<any> {
    this.activeCount++;
    let worker: Worker | null = null;
    let terminated = false;

    return new Promise((resolve, reject) => {
      worker = new Worker(new URL('./worker-script.js', import.meta.url), {
        workerData: job,
      });

      const timeout = setTimeout(() => {
        if (terminated) return;
        terminated = true;
        worker?.terminate();
        this.activeCount--;
        this.processQueue();
        reject(new WorkerError('Worker job timed out', 'WORKER_TIMEOUT'));
      }, this.jobTimeoutMs);

      worker.on('message', (result) => {
        if (terminated) return;
        terminated = true;
        clearTimeout(timeout);
        this.activeCount--;
        this.processQueue();
        resolve(result);
        worker?.terminate();
      });

      worker.on('error', (err) => {
        if (terminated) return;
        terminated = true;
        clearTimeout(timeout);
        this.activeCount--;
        this.processQueue();
        reject(new WorkerError(
          `Worker error: ${err.message}`,
          'WORKER_CRASHED',
        ));
      });

      worker.on('exit', (code) => {
        if (terminated) return;
        terminated = true;
        clearTimeout(timeout);
        if (code !== 0) {
          this.activeCount--;
          this.processQueue();
          reject(new WorkerError(
            `Worker exited with code ${code}`,
            'WORKER_CRASHED',
          ));
        }
      });
    });
  }

  private processQueue() {
    if (this.queue.length > 0 && this.activeCount < this.size) {
      const { job, resolve, reject } = this.queue.shift()!;
      this.spawnAndRun(job).then(resolve).catch(reject);
    }
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }
}

if (!isMainThread && parentPort) {
  const { type, data } = workerData as WorkerJob;
  const taintEngine = new TaintEngine();
  const scanner = new Scanner({}, taintEngine);

  if (type === 'scan') {
    scanner.scan(data).then(matches => {
      const safe = matches.map(({ rawValue: _r, ...rest }) => rest);
      parentPort?.postMessage(safe);
    });
  } else if (type === 'checkpoint') {
    runCheckpoint(data as CheckpointInput).then(result => {
      parentPort?.postMessage(result);
    });
  }
}
