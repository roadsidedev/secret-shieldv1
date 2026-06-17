import { Scanner, ScannerOptions, Match } from './scanner.js';
import { TaintEngine } from './taint.js';
import { VaultAdapter, InMemoryVaultAdapter, VaultWriteOptions } from '@roadsidelab/keyspot-vault';
import { PromptShield, AuditLogger, PromptShieldRule } from './security.js';
import { KeySpotTracer, Tracer, OtelTracer } from './telemetry.js';
import { VectorStoreAdapter, BaseVectorStoreAdapter } from './adapters.js';

// ── Pruner Strategy ─────────────────────────────────────────────

export enum CheckpointTrigger {
  SCAN = 'SCAN',
  VAULT_WRITE = 'VAULT_WRITE',
  TAINT_REDACT = 'TAINT_REDACT',
  PROMPT_VALIDATION = 'PROMPT_VALIDATION',
  BEFORE_EMBED = 'BEFORE_EMBED',
}

export enum PrunerStrategy {
  /** Replace secret with vault reference, tag ref as tainted */
  VAULT_WITH_TAINT = 'vault_with_taint',
  /** Replace secret with "[REDACTED]" — no vault storage */
  REDACT = 'redact',
  /** Remove the field entirely */
  REMOVE = 'remove',
  /** Replace with a configurable placeholder string */
  REPLACE = 'replace',
}

// ── Config ──────────────────────────────────────────────────────

export interface KeySpotConfig extends ScannerOptions {
  vault?: VaultAdapter;
  workerPool?: { size: number };
  onSecretFound?: (match: Match) => Promise<void>;
  rotationHook?: (match: Match) => Promise<string | null>;
  promptShield?: { enabled: boolean; rules?: PromptShieldRule[] };
  tracer?: Tracer;
  pruneStrategy?: PrunerStrategy;
  placeholder?: string;
  vectorStores?: BaseVectorStoreAdapter[];
  checkpointTriggers?: Set<CheckpointTrigger>;
  onCheckpointTrigger?: (trigger: CheckpointTrigger, context: Record<string, unknown>) => Promise<void>;
  enableOpenTelemetry?: boolean;
  hosted?: {
    enabled: boolean;
    agentWalletAddress?: string;
    facilitatorUrl?: string;
  };
}

const PATH_SEVERITY: Record<string, number> = {
  config: 1.0, secret: 1.0, token: 1.0, key: 1.0,
  password: 1.0, credential: 1.0,
  env: 0.9, github: 0.8, ci: 0.8,
  log: 0.5, debug: 0.5,
  history: 0.4, message: 0.3, chat: 0.3, memory: 0.3,
};

function contextualConfidence(path: string, arbitrumConfidence: number): number {
  const parts = path.toLowerCase().split(/[.\[\]_/-]+/);
  for (const part of parts) {
    const boost = PATH_SEVERITY[part];
    if (boost) return Math.min(1.0, arbitrumConfidence + (boost - 0.5) * 0.3);
  }
  return Math.max(0.5, arbitrumConfidence - 0.1);
}

// ── KeySpot ─────────────────────────────────────────────────────

export class KeySpot {
  private scanner: Scanner;
  private vault: VaultAdapter;
  private taintEngine: TaintEngine;
  private promptShield?: PromptShield;
  private auditLogger: AuditLogger;
  private onSecretFound?: (match: Match) => Promise<void>;
  private rotationHook?: (match: Match) => Promise<string | null>;
  protected tracer: KeySpotTracer;
  private pruneStrategy: PrunerStrategy;
  private placeholder: string;
  private vectorStores: BaseVectorStoreAdapter[];
  private triggers: Set<CheckpointTrigger>;
  private onTrigger?: (trigger: CheckpointTrigger, context: Record<string, unknown>) => Promise<void>;

  constructor(private config: KeySpotConfig = {}) {
    this.taintEngine = new TaintEngine();
    this.scanner = new Scanner(config, this.taintEngine);
    this.vault = config.vault || new InMemoryVaultAdapter();
    this.auditLogger = new AuditLogger();
    this.onSecretFound = config.onSecretFound;
    this.rotationHook = config.rotationHook;

    // Telemetry
    if (config.enableOpenTelemetry) {
      this.tracer = new KeySpotTracer(new OtelTracer('keyspot'));
    } else {
      this.tracer = new KeySpotTracer(config.tracer);
    }

    this.pruneStrategy = config.pruneStrategy ?? PrunerStrategy.VAULT_WITH_TAINT;
    this.placeholder = config.placeholder ?? '[REDACTED]';
    this.vectorStores = config.vectorStores ?? [];
    this.triggers = config.checkpointTriggers ?? new Set(Object.values(CheckpointTrigger));
    this.onTrigger = config.onCheckpointTrigger;

    if (config.promptShield?.enabled) {
      this.promptShield = new PromptShield(config.promptShield.rules);
    }

    // Auto-wrap any provided vector stores
    for (const adapter of this.vectorStores) {
      this.wrapVectorStore(adapter);
    }
  }

  getVault(): VaultAdapter { return this.vault; }
  getTaintEngine(): TaintEngine { return this.taintEngine; }
  getAuditLogger(): AuditLogger { return this.auditLogger; }

  // ── Vector Store Wrapper ──

  wrapVectorStore<T>(adapter: BaseVectorStoreAdapter, store?: T): T {
    if (store) return adapter.wrap(store);
    return adapter.wrap({} as T);
  }

  // ── Scan ──

  async scan(data: any): Promise<Match[]> {
    return this.tracer.traceScan(data, () => this.scanner.scan(data));
  }

  async stream(tokens: string, context: string = ''): Promise<Match[]> {
    return this.tracer.traceScan(tokens, () => this.scanner.scanStream(tokens, context));
  }

  // ── Checkpoint ──

  async checkpoint(state: any): Promise<any> {
    return this.tracer.traceCheckpoint(state, () => this._checkpoint(state));
  }

  private async _checkpoint(state: any): Promise<any> {
    if (this.config.hosted?.enabled) {
      const hasAccess = await this.checkHostedAccess();
      if (!hasAccess) {
        throw new Error('402 Payment Required: Hosted KeySpot requires x402 payment.');
      }
    }

    await this.emitTrigger(CheckpointTrigger.SCAN, { stateType: typeof state });
    this.auditLogger.log({ type: 'checkpoint_start', stateSummary: typeof state });
    const matches = await this.scan(state);
    const cleanState = JSON.parse(JSON.stringify(state));

    for (const match of matches) {
      // Fire custom checkpoint trigger for vector stores
      if (this.vectorStores.length > 0) {
        this.auditLogger.log({ type: 'checkpoint_trigger', trigger: 'VECTOR_WRITE', matchesFound: matches.length });
      }

      if (this.onSecretFound) await this.onSecretFound(match);

      if (match.rawValue) {
        await this.handleRawMatch(match, cleanState);
      } else if (match.type === 'tainted_content') {
        this.replaceAtPath(cleanState, match.path, '[REDACTED TAINTED CONTENT]');
        this.auditLogger.log({ type: 'taint_redacted', path: match.path });
      }
    }

    this.auditLogger.log({ type: 'checkpoint_end', matchesFound: matches.length });
    return cleanState;
  }

  private async handleRawMatch(match: Match, cleanState: any): Promise<void> {
    switch (this.pruneStrategy) {
      case PrunerStrategy.REDACT:
        this.replaceAtPath(cleanState, match.path, match.redacted);
        this.auditLogger.log({ type: 'secret_redacted', secretId: match.secretId, path: match.path });
        return;

      case PrunerStrategy.REMOVE:
        this.replaceAtPath(cleanState, match.path, undefined);
        this.auditLogger.log({ type: 'secret_removed', secretId: match.secretId, path: match.path });
        return;

      case PrunerStrategy.REPLACE:
        this.replaceAtPath(cleanState, match.path, this.placeholder);
        this.auditLogger.log({ type: 'secret_replaced', secretId: match.secretId, path: match.path });
        return;

      case PrunerStrategy.VAULT_WITH_TAINT:
      default: {
        const vaultOptions: VaultWriteOptions = {
          tags: { type: match.type, path: match.path }
        };

        let secretToStore = match.rawValue;
        if (this.rotationHook) {
          const rotated = await this.rotationHook(match);
          if (rotated) {
            secretToStore = rotated;
            vaultOptions.tags = { ...vaultOptions.tags, rotated: 'true' };
          }
        }

        await this.emitTrigger(CheckpointTrigger.VAULT_WRITE, { secretId: match.secretId, path: match.path });
        const vaultId = await this.vault.write(secretToStore!, vaultOptions);
        const vaultRef = this.vault.generateRef(vaultId, secretToStore!);

        // Tag both the vault ref and the secret for taint propagation
        if (match.secretId) {
          this.taintEngine.tag(vaultRef, match.secretId, 'vault_ref');
          this.taintEngine.tag(secretToStore, match.secretId, 'vault');
        }

        this.replaceAtPath(cleanState, match.path, vaultRef);
        this.auditLogger.log({ type: 'secret_vaulted', secretId: match.secretId, vaultId, path: match.path });
      }
    }
  }

  // ── Prompt Validation ──

  async validatePrompt(prompt: string): Promise<{ blocked: boolean; findings: string[] }> {
    if (!this.promptShield) return { blocked: false, findings: [] };
    const result = await this.promptShield.analyze(prompt);
    this.auditLogger.log({ type: 'prompt_validation', promptSummary: prompt.substring(0, 50), ...result });
    return result;
  }

  // ── Utilities ──

  private replaceAtPath(obj: any, path: string, value: any) {
    if (!path) return;
    const parts = path.split(/[.\[\]]+/).filter(Boolean);
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i] as string;
      current = current[key];
    }
    const lastKey = parts[parts.length - 1] as string;
    current[lastKey] = value;
  }

  async wrap<T>(fn: (...args: any[]) => Promise<T>, state: any): Promise<T> {
    const result = await fn(state);
    return this.checkpoint(result);
  }

  private async emitTrigger(trigger: CheckpointTrigger, context: Record<string, unknown>): Promise<void> {
    if (this.triggers.has(trigger) && this.onTrigger) {
      await this.onTrigger(trigger, context);
    }
  }

  private async checkHostedAccess(): Promise<boolean> {
    console.log(`[Hosted] Checking access for ${this.config.hosted?.agentWalletAddress}`);
    return true;
  }
}
