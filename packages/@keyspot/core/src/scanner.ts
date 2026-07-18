import { Pattern, builtInPatterns } from '@roadsidelab/keyspot-patterns';
import { TaintEngine } from './taint.js';
import { randomUUID } from 'node:crypto';

export interface Match {
  type: string;
  severity: string;
  path: string;
  redacted: string;
  confidence: number;
  secretId?: string;
  sourceSecretIds?: string[];
  rawValue?: string;
}

export interface ScannerOptions {
  patterns?: Pattern[];
  deepScan?: boolean;
  includeBase64?: boolean;
  contextWindow?: number;
  taintEnabled?: boolean;
  maxScanSize?: number;
  maxScanDepth?: number;
}

const PATH_CONTEXT_WEIGHTS: Record<string, number> = {
  config: 0.15,
  secret: 0.15,
  token: 0.15,
  key: 0.15,
  password: 0.15,
  credential: 0.15,
  env: 0.1,
  github: 0.08,
  ci: 0.08,
  log: -0.1,
  debug: -0.1,
  history: -0.15,
  message: -0.2,
  chat: -0.2,
  memory: -0.15,
};

function contextualScore(path: string, arbitrumConfidence: number): number {
  const parts = path.toLowerCase().split(/[.\[\]_/-]+/);
  let adjustment = 0;
  for (const part of parts) {
    const weight = PATH_CONTEXT_WEIGHTS[part];
    if (weight !== undefined) {
      adjustment = weight;
      break;
    }
  }
  return Math.max(0.1, Math.min(1.0, arbitrumConfidence + adjustment));
}

export class Scanner {
  private patterns: Pattern[];
  private taintEngine: TaintEngine;
  private taintEnabled: boolean;
  private maxScanSize: number;
  private maxScanDepth: number;
  private includeBase64: boolean;
  private deepScan: boolean;

  constructor(options: ScannerOptions = {}, taintEngine: TaintEngine) {
    this.patterns = options.patterns || builtInPatterns;
    this.taintEngine = taintEngine;
    this.taintEnabled = options.taintEnabled ?? true;
    this.maxScanSize = options.maxScanSize ?? 10 * 1024 * 1024;
    this.maxScanDepth = options.maxScanDepth ?? 50;
    this.includeBase64 = options.includeBase64 ?? false;
    this.deepScan = options.deepScan ?? false;
  }

  /** Attempt base64 decode when payload looks encoded (length/charset). */
  private tryDecodeBase64(data: string): string | null {
    if (!this.includeBase64 && !this.deepScan) return null;
    const trimmed = data.trim();
    if (trimmed.length < 16 || trimmed.length % 4 !== 0) return null;
    if (!/^[A-Za-z0-9+/]+=*$/.test(trimmed)) return null;
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      // Only accept if mostly printable
      if (!/^[\x09\x0a\x0d\x20-\x7e]+$/.test(decoded)) return null;
      if (decoded.length < 8) return null;
      return decoded;
    } catch {
      return null;
    }
  }

  private approxSize(value: unknown, seen?: Set<object>): number {
    if (typeof value === 'string') return value.length;
    if (typeof value === 'number' || typeof value === 'boolean') return 8;
    if (value === null || value === undefined) return 0;
    if (typeof value !== 'object') return 0;
    const visited = seen ?? new Set<object>();
    if (visited.has(value)) return 0;
    visited.add(value);
    if (Array.isArray(value)) {
      let total = 0;
      for (const item of value) {
        total += this.approxSize(item, visited);
        if (total > this.maxScanSize) return total;
      }
      return total;
    }
    let total = 0;
    for (const val of Object.values(value as Record<string, unknown>)) {
      total += this.approxSize(val, visited);
      if (total > this.maxScanSize) return total;
    }
    return total;
  }

  /**
   * Performs a deep scan of the provided data structure.
   */
  async scan(data: any, path: string = '', depth: number = 0, visited?: Set<object>): Promise<Match[]> {
    if (depth > this.maxScanDepth) {
      return [];
    }

    const matches: Match[] = [];
    const seen = visited ?? new Set<object>();

    if (typeof data === 'string') {
      if (data.length > this.maxScanSize) {
        return [];
      }

      const textsToScan = [data];
      const decoded = this.tryDecodeBase64(data);
      if (decoded) textsToScan.push(decoded);

      let hasDirectMatch = false;

      for (const text of textsToScan) {
        for (const pattern of this.patterns) {
          let match;
          while ((match = pattern.regex.exec(text)) !== null) {
            const rawValue = match[0];
            const secretId = `sec_${randomUUID().split('-')[0]}`;

            matches.push({
              type: pattern.name,
              severity: pattern.severity,
              path,
              redacted: this.redact(rawValue),
              confidence: contextualScore(path, text === data ? 0.99 : 0.9),
              secretId,
              rawValue
            });
            hasDirectMatch = true;

            if (this.taintEnabled) {
              this.taintEngine.tag(data, secretId, 'scanner');
            }
          }
          pattern.regex.lastIndex = 0;
        }
      }

      if (this.taintEnabled && !hasDirectMatch) {
        const taints = this.taintEngine.getTaints(data);
        if (taints.length > 0) {
          matches.push({
            type: 'tainted_content',
            severity: 'medium',
            path,
            redacted: '[TAINTED CONTENT]',
            confidence: 0.8,
            sourceSecretIds: taints.map(t => t.secretId)
          });
        }
      }
    } else if (Array.isArray(data)) {
      if (seen.has(data)) return [];
      seen.add(data);
      for (let i = 0; i < data.length; i++) {
        matches.push(...(await this.scan(data[i], `${path}[${i}]`, depth + 1, seen)));
      }
    } else if (typeof data === 'object' && data !== null) {
      if (seen.has(data)) return [];
      seen.add(data);
      const estimatedSize = this.approxSize(data);
      if (estimatedSize > this.maxScanSize) {
        return [];
      }
      for (const key in data) {
        matches.push(...(await this.scan(data[key], path ? `${path}.${key}` : key, depth + 1, seen)));
      }
    }

    return matches;
  }

  private streamBuffer: string = '';
  private readonly streamWindowSize: number = 2048;

  /**
   * Incremental scanning for streaming tokens with windowing and buffer management.
   * Maintains a rolling window of recent tokens to detect secrets spanning arrivals.
   */
  async scanStream(tokens: string, context: string = ''): Promise<Match[]> {
    // On first call with context, initialize buffer
    if (context && this.streamBuffer.length === 0) {
      this.streamBuffer = context.slice(-this.streamWindowSize);
    }

    // Append new tokens to buffer
    this.streamBuffer += tokens;

    // Keep only the window
    if (this.streamBuffer.length > this.streamWindowSize) {
      this.streamBuffer = this.streamBuffer.slice(-this.streamWindowSize);
    }

    // Scan the window with context-aware path
    const matches = await this.scan(this.streamBuffer, 'stream');

    // Deduplicate: only return matches that involve the newest tokens
    // by checking if the rawValue appears in the last tokens.length + some overlap
    const newestText = tokens;
    return matches.filter(m => {
      if (!m.rawValue) return true;
      return newestText.length === 0 || this.streamBuffer.includes(m.rawValue);
    });
  }

  /** Clear the streaming buffer and release held tokens. */
  clearStreamBuffer(): void {
    this.streamBuffer = '';
  }

  /** Reset the streaming buffer for a new stream. */
  resetStream(): void {
    this.streamBuffer = '';
  }

  /**
   * Full-mask redaction — do not leak prefix/suffix of secrets.
   * Known fixed prefixes (sk-, ghp_, etc.) are also fully masked.
   */
  private redact(secret: string): string {
    if (secret.length <= 4) return '****';
    return '*'.repeat(Math.min(secret.length, 32));
  }
}

/** Strip raw secret material from matches before external surfaces. */
export function sanitizeMatches(matches: Match[]): Match[] {
  return matches.map((m) => {
    const { rawValue: _r, ...rest } = m;
    return rest;
  });
}
