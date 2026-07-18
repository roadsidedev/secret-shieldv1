import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryVaultAdapter } from '@roadsidelab/keyspot-sdk';

describe('Vault (InMemoryVaultAdapter)', () => {
  let vault: InMemoryVaultAdapter;

  beforeEach(() => {
    vault = new InMemoryVaultAdapter();
  });

  it('writes and reads a secret', async () => {
    const id = await vault.write('sk-secret-key');
    const value = await vault.read(id);
    expect(value).toBe('sk-secret-key');
  });

  it('returns null for non-existent secret', async () => {
    const value = await vault.read('non-existent');
    expect(value).toBeNull();
  });

  it('deletes a secret', async () => {
    const id = await vault.write('secret');
    await vault.delete(id);
    const value = await vault.read(id);
    expect(value).toBeNull();
  });

  it('lists all stored secrets', async () => {
    await vault.write('secret1');
    await vault.write('secret2');
    const list = await vault.list();
    expect(list).toHaveLength(2);
  });

  it('enforces TTL expiry', async () => {
    const id = await vault.write('ephemeral', { ttl: -1000 });
    const value = await vault.read(id);
    expect(value).toBeNull();
  });

  it('enforces ACLs', async () => {
    const id = await vault.write('restricted', { visibleTo: ['agent:treasury'] });
    const value = await vault.read(id, 'agent:not-allowed');
    expect(value).toBeNull();
  });

  it('allows access for authorized agents', async () => {
    const id = await vault.write('restricted', { visibleTo: ['agent:treasury'] });
    const value = await vault.read(id, 'agent:treasury');
    expect(value).toBe('restricted');
  });

  it('generates HMAC-signed vault references', () => {
    const ref = vault.generateRef('vault_abc', 'secret-value', 3600000);
    expect(ref).toMatch(/^vault:v1:.+:[a-f0-9]+:\d+$/);
  });

  it('verifies valid vault references', () => {
    const ref = vault.generateRef('vault_abc', 'secret-value');
    expect(vault.verifyRef(ref)).toBe(true);
  });

  it('rejects expired vault references', () => {
    const ref = vault.generateRef('vault_abc', 'secret-value', -1000);
    expect(vault.verifyRef(ref)).toBe(false);
  });

  it('rejects tampered vault references', () => {
    const ref = vault.generateRef('vault_abc', 'secret-value');
    const tampered = ref.replace('vault:v1:', 'vault:v1:bad:');
    expect(vault.verifyRef(tampered)).toBe(false);
  });

  it('rejects malformed reference strings', () => {
    expect(vault.verifyRef('not-a-ref')).toBe(false);
    expect(vault.verifyRef('vault:v1:onlytwo')).toBe(false);
  });

  it('rejects references with wrong version', () => {
    const ref = vault.generateRef('test', 'value');
    const wrongVersion = ref.replace('vault:v1:', 'vault:v2:');
    expect(vault.verifyRef(wrongVersion)).toBe(false);
  });

  it('rejects references with tampered HMAC', () => {
    const ref = vault.generateRef('test', 'value');
    const parts = ref.split(':');
    const tamperedHmac = 'a'.repeat(64);
    const tamperedRef = `${parts[0]}:${parts[1]}:${parts[2]}:${tamperedHmac}:${parts[4]}`;
    expect(vault.verifyRef(tamperedRef)).toBe(false);
  });

  it('denies access when visibleTo is set but agentId is omitted (fail-closed)', async () => {
    const id = await vault.write('restricted', { visibleTo: ['agent:allowed'] });
    const value = await vault.read(id);
    expect(value).toBeNull();
  });

  it('ACL with empty visibleTo blocks all agents', async () => {
    const id = await vault.write('isolated', { visibleTo: [] });
    const value = await vault.read(id, 'agent:anyone');
    expect(value).toBeNull();
  });

  it('toWorkerConfig never includes secretKey', () => {
    const cfg = vault.toWorkerConfig();
    expect(cfg).not.toHaveProperty('secretKey');
    expect((cfg as { secretKey?: string }).secretKey).toBeUndefined();
  });
});
