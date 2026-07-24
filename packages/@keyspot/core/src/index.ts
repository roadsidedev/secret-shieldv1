import { Scanner, ScannerOptions, Match } from './scanner.js';
import { TaintEngine } from './taint.js';
import { VaultAdapter, InMemoryVaultAdapter, VaultWriteOptions, withCircuitBreaker } from '@roadsidelab/keyspot-vault';
import type { VaultWorkerConfig } from '@roadsidelab/keyspot-vault';
import { PromptShield, AuditLogger, PromptShieldRule } from './security.js';
import { KeySpotTracer, Tracer, OtelTracer } from './telemetry.js';
import { BaseVectorStoreAdapter } from './adapters.js';
import { PaymentRequiredError, VaultError, ConfigurationError } from './errors.js';

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

/**
 * Configuration for KeySpot hosted (cloud-proxy) mode.
 * In this mode, the SDK checks with a remote facilitator for x402 payment
 * authorization before allowing checkpoints. This is distinct from the
 * self-hosted server mode where payment is enforced at the HTTP layer.
 */
export interface HostedConfig {
  enabled: boolean;
  agentWalletAddress?: string;
  facilitatorUrl?: string;
}

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
  hosted?: HostedConfig;
}

/**
 * Production-ready configuration for {@link KeySpot.createSecure}.
 * Requires a persistent vault adapter — InMemoryVaultAdapter is not permitted.
 */
export interface SecureConfig {
  vault: VaultAdapter;
  enableTelemetry?: boolean;
  onSecretFound?: (match: Match) => Promise<void>;
  /** Optional hook for alerting when checkpoint triggers fire */
  onCheckpointTrigger?: (trigger: CheckpointTrigger, context: Record<string, unknown>) => Promise<void>;
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
  private accessToken?: { token: string; expiresAt: number };
  private hostedConfig: HostedConfig | undefined;

  constructor(config: KeySpotConfig = {}) {
    this.taintEngine = new TaintEngine();
    this.scanner = new Scanner(config, this.taintEngine);
    const rawVault = config.vault || new InMemoryVaultAdapter();
    this.vault = withCircuitBreaker(rawVault);
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
    this.hostedConfig = config.hosted;

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

  /**
   * Create a KeySpot instance with production-hardened defaults.
   *
   * Compared to the base constructor, this preset:
   *  - Requires a persistent VaultAdapter (InMemoryVaultAdapter is rejected)
   *  - Enables prompt injection shielding
   *  - Enables taint tracking
   *  - Enables OpenTelemetry tracing (noop fallback if SDK not configured)
   *  - Wires onSecretFound and onCheckpointTrigger for external alerting
   *
   * @example
   * ```ts
   * const guard = KeySpot.createSecure({
   *   vault: new AWSSecretsAdapter({ region: 'us-east-1' }),
   *   onSecretFound: async (match) => {
   *     await alertService.send({ type: match.type, path: match.path });
   *   },
   * });
   * ```
   */
  static createSecure(config: SecureConfig): KeySpot {
    // In production, require native bindings for sealed memory + constant-time HMAC
    if (process.env.NODE_ENV === 'production') {
      try {
        // Dynamic import: may not be installed on every platform
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const kv = require('@roadsidelab/keyspot-native');
        if (!kv.isNativeAvailable()) {
          console.warn(
            '[KeySpot] Production mode recommended native addon (@keyspot/native) not available. ' +
            'Install and rebuild for your platform. JS fallback has residual memory exposure. ' +
            'See docs/security/threat-model.md.',
          );
        }
      } catch {
        console.warn(
          '[KeySpot] Production mode recommended native addon (@keyspot/native) not available. ' +
          'Install and rebuild for your platform. JS fallback has residual memory exposure. ' +
          'See docs/security/threat-model.md.',
        );
      }
    }
    if (!config.vault) {
      throw new ConfigurationError(
        'KeySpot.createSecure() requires a persistent VaultAdapter. ' +
        'Use InMemoryVaultAdapter only for development via the base constructor.',
        'SECURE_CONFIG_INVALID',
      );
    }
    const isMemory =
      config.vault instanceof InMemoryVaultAdapter ||
      (typeof config.vault.isInMemory === 'function' && config.vault.isInMemory());
    if (isMemory) {
      throw new ConfigurationError(
        'KeySpot.createSecure() rejects InMemoryVaultAdapter. ' +
        'Use a persistent adapter (e.g. AWSSecretsAdapter) or the base constructor for local dev.',
        'SECURE_CONFIG_INVALID',
      );
    }
    const onSecretFound = config.onSecretFound
      ? async (match: Match) => {
          const { rawValue: _r, ...safe } = match;
          await config.onSecretFound!(safe as Match);
        }
      : undefined;
    return new KeySpot({
      vault: config.vault,
      taintEnabled: true,
      promptShield: { enabled: true },
      enableOpenTelemetry: config.enableTelemetry ?? true,
      onSecretFound,
      onCheckpointTrigger: config.onCheckpointTrigger,
    });
  }

  // ── Vector Store Wrapper ──

  wrapVectorStore<T>(adapter: BaseVectorStoreAdapter, store?: T): T {
    if (store) return adapter.wrap(store);
    return adapter.wrap({} as T);
  }

  // ── Scan ──

  async scan(data: any): Promise<Match[]> {
    return this.tracer.traceScan(data, () => this.scanner.scan(data));
  }

  /** Scan and return matches with rawValue stripped (safe for logs/MCP/CLI). */
  async scanSafe(data: any): Promise<Match[]> {
    const matches = await this.scan(data);
    return matches.map(({ rawValue: _r, ...rest }) => rest);
  }

  async stream(tokens: string, context: string = ''): Promise<Match[]> {
    return this.tracer.traceScan(tokens, () => this.scanner.scanStream(tokens, context));
  }

  async streamSafe(tokens: string, context: string = ''): Promise<Match[]> {
    const matches = await this.stream(tokens, context);
    return matches.map(({ rawValue: _r, ...rest }) => rest);
  }

  // ── Checkpoint ──

  async checkpoint(state: any): Promise<any> {
    return this.tracer.traceCheckpoint(state, () => this._checkpoint(state));
  }

  private async _checkpoint(state: any): Promise<any> {
    if (this.hostedConfig?.enabled) {
      const hasAccess = await this.checkHostedAccess();
      if (!hasAccess) {
        throw new PaymentRequiredError(
          'Hosted KeySpot requires x402 payment. Use setAccessToken() or configure a facilitatorUrl.',
          'PAYMENT_REQUIRED',
          402,
          { facilitatorUrl: this.hostedConfig.facilitatorUrl ?? null },
        );
      }
    }

    await this.emitTrigger(CheckpointTrigger.SCAN, { stateType: typeof state });
    this.auditLogger.log({ type: 'checkpoint_start', stateSummary: typeof state });

    // Root string: wrap so path-based replace works, then unwrap
    const isRootString = typeof state === 'string';
    const scanTarget = isRootString ? { __root: state } : state;
    const matches = await this.scan(scanTarget);
    if (isRootString) {
      for (const m of matches) {
        if (m.path === '__root' || m.path === '') m.path = '__root';
      }
    }

    const cleanState = isRootString
      ? { __root: state }
      : JSON.parse(JSON.stringify(state));

    for (const match of matches) {
      if (this.vectorStores.length > 0) {
        this.auditLogger.log({ type: 'checkpoint_trigger', trigger: 'VECTOR_WRITE', matchesFound: matches.length });
      }

      if (this.onSecretFound) {
        const { rawValue: _r, ...safe } = match;
        await this.onSecretFound(safe as Match);
      }

      if (match.rawValue) {
        await this.handleRawMatch(match, cleanState);
      } else if (match.type === 'tainted_content') {
        this.replaceAtPath(cleanState, match.path, '[REDACTED TAINTED CONTENT]');
        this.auditLogger.log({ type: 'taint_redacted', path: match.path });
      }
    }

    this.auditLogger.log({ type: 'checkpoint_end', matchesFound: matches.length });
    return isRootString ? cleanState.__root : cleanState;
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
          try {
            const rotated = await this.rotationHook(match);
            if (rotated) {
              secretToStore = rotated;
              vaultOptions.tags = { ...vaultOptions.tags, rotated: 'true' };
            }
          } catch {
            // Fail-soft: rotation hook failure → continue with original secret
          }
        }

        await this.emitTrigger(CheckpointTrigger.VAULT_WRITE, { secretId: match.secretId, path: match.path });
        let vaultId: string;
        try {
          vaultId = await this.vault.write(secretToStore!, vaultOptions);
        } catch (err) {
          throw new VaultError(
            `Vault write failed — checkpoint aborted (fail-closed): ${err instanceof Error ? err.message : String(err)}`,
            'VAULT_WRITE_FAILED',
            503,
            true,
            { secretType: match.type, path: match.path },
          );
        }
        const vaultRef = this.vault.generateRef(vaultId, secretToStore!);

        // Tag both the vault ref and the secret for taint propagation
        if (match.secretId) {
          this.taintEngine.tag(vaultRef, match.secretId, 'vault_ref');
          this.taintEngine.tag(secretToStore, match.secretId, 'vault');
        }

        this.replaceAtPath(cleanState, match.path, vaultRef);
        this.auditLogger.log({ type: 'secret_vaulted', secretId: match.secretId, vaultId, path: match.path });

        // Zero rawValue to reduce window of secret exposure in memory
        match.rawValue = '[CLEARED]';
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
    if (path === undefined || path === null) return;
    if (path === '') {
      // Cannot replace root object in-place; caller handles root strings
      return;
    }
    const parts = path.split(/[.\[\]]+/).filter(Boolean);
    // Block prototype pollution
    if (parts.some(p => p === '__proto__' || p === 'constructor' || p === 'prototype')) {
      return;
    }
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

  // Maximum TTL for access tokens (24 hours). Tokens with longer
  // expiry are clamped to this value to prevent Infinity-lifetime tokens.
  private static readonly MAX_TOKEN_TTL = 86_400_000;

  setAccessToken(token: string, expiresAt?: number): void {
    const now = Date.now();
    const ttl = expiresAt ? Math.min(expiresAt - now, KeySpot.MAX_TOKEN_TTL) : KeySpot.MAX_TOKEN_TTL;
    this.accessToken = { token, expiresAt: now + ttl };
  }

  private async checkHostedAccess(): Promise<boolean> {
    const hosted = this.hostedConfig;
    if (!hosted?.enabled) return true;

    if (this.accessToken && Date.now() < this.accessToken.expiresAt) {
      return true;
    }
    this.accessToken = undefined;

    if (hosted.facilitatorUrl) {
      if (!hosted.facilitatorUrl.startsWith('https://') && process.env.NODE_ENV !== 'development') {
        this.auditLogger.log({ type: 'hosted_access_warning', message: 'Facilitator URL must use HTTPS' });
        return false;
      }
      try {
        const result = await this.obtainFacilitatorToken(hosted.facilitatorUrl, hosted.agentWalletAddress);
        if (result) {
          this.setAccessToken(result.token, result.expiresAt);
          return true;
        }
      } catch {
        // Facilitator unreachable — fall through to denial
        this.auditLogger.log({ type: 'hosted_access_warning', message: 'Facilitator unreachable' });
      }
    }

    return false;
  }

  private async obtainFacilitatorToken(
    facilitatorUrl: string,
    walletAddress?: string,
  ): Promise<{ token: string; expiresAt: number } | null> {
    const body: Record<string, string> = {};
    if (walletAddress) body.walletAddress = walletAddress;

    const response = await fetch(`${facilitatorUrl.replace(/\/$/, '')}/api/v1/access-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { token: string; expiresInMs?: number };
    if (!data?.token) return null;

    return {
      token: data.token,
      expiresAt: Date.now() + (data.expiresInMs ?? 60_000),
    };
  }
}
