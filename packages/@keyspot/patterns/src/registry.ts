import { AhoCorasick } from './ahocorasick.js';
import { Pattern, builtInPatterns } from './index.js';

export interface PatternRegistryOptions {
  liveUpdateUrl?: string;
  liveUpdateIntervalMs?: number;
}

export class PatternRegistry {
  private patterns: Pattern[];
  private trie: AhoCorasick;
  private liveUpdateTimer?: ReturnType<typeof setInterval>;

  constructor(initialPatterns?: Pattern[], options?: PatternRegistryOptions) {
    this.patterns = initialPatterns || [...builtInPatterns];
    this.trie = this.buildTrie(this.patterns);

    if (options?.liveUpdateUrl && options?.liveUpdateIntervalMs) {
      this.startLiveUpdates(options.liveUpdateUrl, options.liveUpdateIntervalMs);
    }
  }

  private buildTrie(patterns: Pattern[]): AhoCorasick {
    const keywords = patterns
      .filter(p => p.severity === 'critical' || p.severity === 'high')
      .map(p => p.name.replace(/_/g, ' '));
    return new AhoCorasick(keywords);
  }

  register(pattern: Pattern): void {
    this.patterns.push(pattern);
    this.trie = this.buildTrie(this.patterns);
  }

  unregister(name: string): void {
    this.patterns = this.patterns.filter(p => p.name !== name);
    this.trie = this.buildTrie(this.patterns);
  }

  getPatterns(): Pattern[] {
    return [...this.patterns];
  }

  getTrie(): AhoCorasick {
    return this.trie;
  }

  async loadFromUrl(url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch patterns from ${url}: ${response.statusText}`);
    }
    const remotePatterns: Pattern[] = await response.json();
    for (const pattern of remotePatterns) {
      const existing = this.patterns.findIndex(p => p.name === pattern.name);
      if (existing >= 0) {
        this.patterns[existing] = pattern;
      } else {
        this.patterns.push(pattern);
      }
    }
    this.trie = this.buildTrie(this.patterns);
  }

  private startLiveUpdates(url: string, intervalMs: number): void {
    this.liveUpdateTimer = setInterval(async () => {
      try {
        await this.loadFromUrl(url);
      } catch {
        // Silently fail; will retry on next interval
      }
    }, intervalMs);
  }

  stopLiveUpdates(): void {
    if (this.liveUpdateTimer) {
      clearInterval(this.liveUpdateTimer);
    }
  }
}
