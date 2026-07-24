import { Scanner } from './scanner.js';
import { TaintEngine } from './taint.js';
import { VaultError } from './errors.js';
import type { VaultAdapter } from '@roadsidelab/keyspot-vault';
import { VaultWorkerConfig, VaultWriteOptions, InMemoryVaultAdapter } from '@roadsidelab/keyspot-vault';
import { AWSSecretsAdapter } from '@roadsidelab/keyspot-vault/aws';

// ── Types ─────────────────────────────────────────────────────────

export interface CheckpointInput {
  state: any;
  vaultConfig: VaultWorkerConfig;
  /** String value of PrunerStrategy — kept as string to avoid circular dep on index.ts */
  pruneStrategy: string;
  placeholder: string;
  vectorStoreCount: number;
}

export interface SanitizedMatch {
  type: string;
  severity: string;
  path: string;
  redacted: string;
  confidence: number;
  secretId?: string;
  sourceSecretIds?: string[];
}

export interface AuditEvent {
  type: string;
  [key: string]: unknown;
}

export interface TriggerEvent {
  trigger: string;
  context: Record<string, unknown>;
}

export interface TaintSyncEntry {
  value: string;
  secretId: string;
  source: string;
}

export interface CheckpointResult {
  cleanState: any;
  audit: AuditEvent[];
  secretFound: SanitizedMatch[];
  triggers: TriggerEvent[];
  taintEntries: TaintSyncEntry[];
}

// ── Vault reconstruction ──────────────────────────────────────────

/**
 * Reconstruct a vault for worker-side write operations.
 * Master HMAC keys are never passed via workerData — each worker vault
 * generates refs with an ephemeral key for write-path IDs only when needed.
 * Prefer parent-side generateRef after worker returns vault IDs.
 */
function reconstructVault(config: VaultWorkerConfig): VaultAdapter {
  switch (config.type) {
    case 'aws':
      return new AWSSecretsAdapter({
        region: (config.options?.region as string) ?? 'us-east-1',
      });
    case 'inmemory':
    default:
      // Ephemeral worker vault — does not share parent master key
      return new InMemoryVaultAdapter();
  }
}

// ── Pure helpers ──────────────────────────────────────────────────

function replaceAtPath(obj: any, path: string, value: any) {
  if (!path) return;
  const parts = path.split(/[.\[\]]+/).filter(Boolean);
  if (parts.some(p => p === '__proto__' || p === 'constructor' || p === 'prototype')) {
    return;
  }
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i] as string;
    current = current[key];
    if (current === undefined || current === null) return;
  }
  const lastKey = parts[parts.length - 1] as string;
  current[lastKey] = value;
}

function sanitizeMatch(match: {
  type: string;
  severity: string;
  path: string;
  redacted: string;
  confidence: number;
  secretId?: string;
  sourceSecretIds?: string[];
}): SanitizedMatch {
  const s: SanitizedMatch = {
    type: match.type,
    severity: match.severity,
    path: match.path,
    redacted: match.redacted,
    confidence: match.confidence,
  };
  if (match.secretId) s.secretId = match.secretId;
  if (match.sourceSecretIds) s.sourceSecretIds = [...match.sourceSecretIds];
  return s;
}

// ── Core pipeline ─────────────────────────────────────────────────

/**
 * Full checkpoint pipeline: scan → prune → vault write → taint → clean state.
 *
 * Runs in either a Worker thread or inline (fallback).  No parent-process
 * callbacks are invoked — the caller receives structured events to replay.
 * Matches returned in `secretFound` have `rawValue` stripped.
 */
export async function runCheckpoint(input: CheckpointInput): Promise<CheckpointResult> {
  const { state, vaultConfig, pruneStrategy, placeholder, vectorStoreCount } = input;

  const taintEngine = new TaintEngine();
  const scanner = new Scanner({}, taintEngine);
  const vault = reconstructVault(vaultConfig);

  const audit: AuditEvent[] = [];
  const secretFound: SanitizedMatch[] = [];
  const triggers: TriggerEvent[] = [];
  const taintEntries: TaintSyncEntry[] = [];

  audit.push({ type: 'checkpoint_start', stateSummary: typeof state });

  const matches = await scanner.scan(state);
  const cleanState = JSON.parse(JSON.stringify(state));

  for (const match of matches) {
    if (vectorStoreCount > 0) {
      audit.push({ type: 'checkpoint_trigger', trigger: 'VECTOR_WRITE', matchesFound: matches.length });
    }

    secretFound.push(sanitizeMatch(match));

    if (match.rawValue) {
      switch (pruneStrategy) {
        case 'redact': {
          replaceAtPath(cleanState, match.path, match.redacted);
          audit.push({ type: 'secret_redacted', secretId: match.secretId, path: match.path });
          break;
        }
        case 'remove': {
          replaceAtPath(cleanState, match.path, undefined);
          audit.push({ type: 'secret_removed', secretId: match.secretId, path: match.path });
          break;
        }
        case 'replace': {
          replaceAtPath(cleanState, match.path, placeholder);
          audit.push({ type: 'secret_replaced', secretId: match.secretId, path: match.path });
          break;
        }
        case 'vault_with_taint':
        default: {
          const vaultOptions: VaultWriteOptions = {
            tags: { type: match.type, path: match.path },
          };

          const secretToStore = match.rawValue;
          let vaultId: string;
          try {
            vaultId = await vault.write(secretToStore, vaultOptions);
          } catch (err) {
            throw new VaultError(
              `Vault write failed — checkpoint aborted (fail-closed): ${err instanceof Error ? err.message : String(err)}`,
              'VAULT_WRITE_FAILED',
              503,
              true,
              { secretType: match.type, path: match.path },
            );
          }
          const vaultRef = vault.generateRef(vaultId, secretToStore);

          if (match.secretId) {
            taintEngine.tag(vaultRef, match.secretId, 'vault_ref');
            taintEntries.push({ value: vaultRef, secretId: match.secretId, source: 'vault_ref' });
          }

          replaceAtPath(cleanState, match.path, vaultRef);
          audit.push({ type: 'secret_vaulted', secretId: match.secretId, vaultId, path: match.path });
          break;
        }
      }
    } else if (match.type === 'tainted_content') {
      replaceAtPath(cleanState, match.path, '[REDACTED TAINTED CONTENT]');
      audit.push({ type: 'taint_redacted', path: match.path });
    }
  }

  audit.push({ type: 'checkpoint_end', matchesFound: matches.length });

  return { cleanState, audit, secretFound, triggers, taintEntries };
}
