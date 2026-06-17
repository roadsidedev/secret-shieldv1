import { Pattern, builtInPatterns } from '@roadsidelab/keyspot-patterns';
import { TaintEngine } from './taint.js';

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

  constructor(options: ScannerOptions = {}, taintEngine: TaintEngine) {
    this.patterns = options.patterns || builtInPatterns;
    this.taintEngine = taintEngine;
    this.taintEnabled = options.taintEnabled ?? true;
  }

  /**
   * Performs a deep scan of the provided data structure.
   */
  async scan(data: any, path: string = ''): Promise<Match[]> {
    const matches: Match[] = [];

    if (typeof data === 'string') {
      let hasDirectMatch = false;

      // Full regex scan (only runs if trie suggested a match)
      for (const pattern of this.patterns) {
        let match;
        while ((match = pattern.regex.exec(data)) !== null) {
          const rawValue = match[0];
          const secretId = `sec_${Math.random().toString(36).substring(7)}`;
          
          matches.push({
            type: pattern.name,
            severity: pattern.severity,
            path,
            redacted: this.redact(rawValue),
            confidence: contextualScore(path, 0.99),
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

      // Check for taints only if no direct pattern matched (avoids double-processing)
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
      for (let i = 0; i < data.length; i++) {
        matches.push(...(await this.scan(data[i], `${path}[${i}]`)));
      }
    } else if (typeof data === 'object' && data !== null) {
      for (const key in data) {
        matches.push(...(await this.scan(data[key], path ? `${path}.${key}` : key)));
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

  /** Reset the streaming buffer for a new stream. */
  resetStream(): void {
    this.streamBuffer = '';
  }

  private redact(secret: string): string {
    if (secret.length <= 8) return '********';
    return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
  }
}
