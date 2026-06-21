import { describe, it, expect } from 'vitest';
import { AuditLogger } from '@roadsidelab/keyspot-sdk';

describe('AuditLogger', () => {
  it('logs events and returns an entry with hash', () => {
    const logger = new AuditLogger();
    const entry = logger.log({ type: 'test', data: 'hello' });
    expect(entry.hash).toBeDefined();
    expect(entry.hash).toHaveLength(64);
    expect(entry.prevHash).toBe('0'.repeat(64));
    expect(entry.event.type).toBe('test');
  });

  it('produces a verifiable hash chain', () => {
    const logger = new AuditLogger();
    logger.log({ type: 'event1' });
    logger.log({ type: 'event2' });
    logger.log({ type: 'event3' });
    const entries = logger.getEntries();
    expect(logger.verifyChain(entries)).toBe(true);
  });

  it('detects tampered logs', () => {
    const logger = new AuditLogger();
    logger.log({ type: 'event1' });
    logger.log({ type: 'event2' });
    logger.log({ type: 'event3' });
    const entries = logger.getEntries();
    const tampered = entries.map((e, i) => 
      i === 1 ? { ...e, event: { ...e.event, type: 'tampered' } } : e
    );
    expect(logger.verifyChain(tampered)).toBe(false);
  });

  it('verifyChainDetailed returns errors for tampered chain', () => {
    const logger = new AuditLogger();
    logger.log({ type: 'event1' });
    logger.log({ type: 'event2' });
    const entries = logger.getEntries();
    const tampered = entries.map((e, i) => 
      i === 1 ? { ...e, event: { ...e.event, type: 'tampered' } } : e
    );
    const result = logger.verifyChainDetailed(tampered);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('verifyChainDetailed returns valid for clean chain', () => {
    const logger = new AuditLogger();
    logger.log({ type: 'a' });
    logger.log({ type: 'b' });
    const result = logger.verifyChainDetailed(logger.getEntries());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('verifyChainDetailed detects prevHash mismatch', () => {
    const logger = new AuditLogger();
    logger.log({ type: 'first' });
    logger.log({ type: 'second' });
    const entries = logger.getEntries();
    const broken = [
      entries[0]!,
      { ...entries[1]!, prevHash: '0'.repeat(64) },
    ];
    const result = logger.verifyChainDetailed(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('prevHash'))).toBe(true);
  });

  it('getLastHash returns the hash of the latest entry', () => {
    const logger = new AuditLogger();
    const entry = logger.log({ type: 'first' });
    expect(logger.getLastHash()).toBe(entry.hash);
    logger.log({ type: 'second' });
    expect(logger.getLastHash()).not.toBe(entry.hash);
  });

  it('clear resets the logger state', () => {
    const logger = new AuditLogger();
    logger.log({ type: 'event1' });
    expect(logger.getEntries()).toHaveLength(1);
    logger.clear();
    expect(logger.getEntries()).toHaveLength(0);
    expect(logger.getLastHash()).toBe('0'.repeat(64));
  });
});
