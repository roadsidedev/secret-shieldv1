import { describe, it, expect, vi } from 'vitest';
import { PatternRegistry, builtInPatterns } from '@roadsidelab/keyspot-sdk';

describe('PatternRegistry', () => {
  it('constructs with initial patterns', () => {
    const registry = new PatternRegistry(builtInPatterns);
    expect(registry.getPatterns().length).toBeGreaterThan(30);
  });

  it('constructs with empty patterns', () => {
    const registry = new PatternRegistry([]);
    expect(registry.getPatterns()).toHaveLength(0);
  });

  it('register adds a new pattern', () => {
    const registry = new PatternRegistry([]);
    const pattern = { name: 'test_key', regex: /test-\w+/g, severity: 'high' as const, description: 'Test' };
    registry.register(pattern);
    expect(registry.getPatterns()).toHaveLength(1);
    expect(registry.getPatterns()[0].name).toBe('test_key');
  });

  it('unregister removes a pattern', () => {
    const registry = new PatternRegistry(builtInPatterns);
    const count = registry.getPatterns().length;
    registry.unregister('openai_api_key');
    expect(registry.getPatterns().length).toBe(count - 1);
  });

  it('unregister on non-existent pattern does nothing', () => {
    const registry = new PatternRegistry(builtInPatterns);
    const count = registry.getPatterns().length;
    registry.unregister('nonexistent_pattern');
    expect(registry.getPatterns().length).toBe(count);
  });

  it('getTrie returns a valid AhoCorasick trie after construction', () => {
    const registry = new PatternRegistry(builtInPatterns);
    const trie = registry.getTrie();
    // Trie matches keyword from severity=critical/high pattern names (underscore → space)
    expect(trie.hasMatch('openai')).toBe(false); // Trie uses keywords from name, not text
    expect(trie).toBeDefined();
  });

  it('loadFromUrl handles network failures gracefully', async () => {
    const registry = new PatternRegistry([]);
    await expect(registry.loadFromUrl('https://nonexistent.example.com/patterns.json')).rejects.toThrow();
  });

  it('startLiveUpdates and stopLiveUpdates lifecycle', async () => {
    const registry = new PatternRegistry(builtInPatterns);
    registry.startLiveUpdates('https://example.com/patterns.json', 60000);
    registry.stopLiveUpdates();
    expect(registry.getPatterns().length).toBeGreaterThan(0);
  });

  it('buildTrie rebuilds after register', () => {
    const registry = new PatternRegistry([]);
    const pattern = { name: 'custom_key', regex: /custom_\w+/g, severity: 'high' as const, description: 'Custom' };
    registry.register(pattern);
    // Trie matches on name keywords (underscore → space, e.g. "custom key")
    expect(registry.getTrie().hasMatch('custom key')).toBe(true);
  });
});
