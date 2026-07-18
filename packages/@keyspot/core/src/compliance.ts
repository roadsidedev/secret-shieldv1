import { createHash, generateKeyPairSync, sign as cryptoSign, verify as cryptoVerify } from 'crypto';
import { appendFileSync, readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AuditEntry, AuditLogger } from './security.js';

// ── Ed25519 Signing ─────────────────────────────────────────────

export interface SigningKeyPair {
  publicKey: string;
  privateKey: string;
}

export function generateSigningKeyPair(): SigningKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });
  return {
    publicKey: Buffer.from(publicKey).toString('hex'),
    privateKey: Buffer.from(privateKey).toString('hex'),
  };
}

export function signEntry(entry: AuditEntry, privateKeyHex: string): string {
  const sig = cryptoSign(
    null!,
    Buffer.from(JSON.stringify(entry)),
    { key: Buffer.from(privateKeyHex, 'hex'), format: 'der', type: 'pkcs8' },
  );
  return Buffer.from(sig).toString('hex');
}

export function verifyEntrySignature(
  entry: AuditEntry,
  signatureHex: string,
  publicKeyHex: string,
): boolean {
  try {
    return cryptoVerify(
      null!,
      Buffer.from(JSON.stringify(entry)),
      { key: Buffer.from(publicKeyHex, 'hex'), format: 'der', type: 'spki' },
      Buffer.from(signatureHex, 'hex'),
    );
  } catch {
    return false;
  }
}

// ── Signed Audit Entry ──────────────────────────────────────────

export interface SignedAuditEntry {
  entry: AuditEntry;
  signature: string;
  publicKey: string;
  chainRootHash?: string;
}

// ── File-Persisted Audit Logger ────────────────────────────────

export interface PersistedAuditLoggerOptions {
  logDir: string;
  signingKeyPair: SigningKeyPair;
  flushInterval?: number;
}

export class PersistedAuditLogger extends AuditLogger {
  private logPath: string;
  private keyPair: SigningKeyPair;
  private buffer: SignedAuditEntry[] = [];
  private flushThreshold: number;
  private chainRoot: string = '0'.repeat(64);

  constructor(options: PersistedAuditLoggerOptions) {
    super();
    this.keyPair = options.signingKeyPair;
    this.flushThreshold = options.flushInterval ?? 1;

    if (!existsSync(options.logDir)) {
      mkdirSync(options.logDir, { recursive: true });
    }
    this.logPath = join(options.logDir, `audit-${Date.now()}.jsonl`);
    this.loadChainRoot(options.logDir);
  }

  private loadChainRoot(logDir: string): void {
    try {
      const files = readdirSync(logDir).filter(f => f.startsWith('audit-'));
      if (files.length === 0) return;
      const lastFile = files.sort().reverse()[0];
      if (!lastFile) return;
      const lines = readFileSync(join(logDir, lastFile), 'utf-8')
        .split('\n')
        .filter(Boolean);
      if (lines.length === 0) return;
      const lastEntry: SignedAuditEntry = JSON.parse(lines[lines.length - 1]!);
      if (lastEntry.chainRootHash) {
        this.chainRoot = lastEntry.chainRootHash;
      }
    } catch {
      // No existing log files
    }
  }

  logSigned(event: Record<string, unknown>): SignedAuditEntry {
    const entry = super.log(event);
    const signature = signEntry(entry, this.keyPair.privateKey);

    this.chainRoot = createHash('sha256')
      .update(this.chainRoot + entry.hash)
      .digest('hex');

    const signed: SignedAuditEntry = {
      entry,
      signature,
      publicKey: this.keyPair.publicKey,
      chainRootHash: this.chainRoot,
    };

    this.buffer.push(signed);

    if (this.buffer.length >= this.flushThreshold) {
      this.flush();
    }

    return signed;
  }

  private flush(): void {
    for (const signed of this.buffer) {
      appendFileSync(this.logPath, JSON.stringify(signed) + '\n', 'utf-8');
    }
    this.buffer = [];
  }

  verifyAgainstFile(filePath?: string): { valid: boolean; entries: number; errors: string[] } {
    const path = filePath || this.logPath;
    const errors: string[] = [];
    let entries = 0;
    let valid = true;
    let expectedChainRoot = '0'.repeat(64);

    try {
      const lines = readFileSync(path, 'utf-8').split('\n').filter(Boolean);
      const allEntries: Array<{ signed: SignedAuditEntry; entry: AuditEntry }> = [];

      for (const line of lines) {
        let signed: SignedAuditEntry;
        try {
          signed = JSON.parse(line);
        } catch {
          errors.push(`Invalid JSON at entry ${entries}`);
          valid = false;
          continue;
        }
        allEntries.push({ signed, entry: signed.entry });
        entries++;
      }

      // Verify the full hash chain at once
      const chainEntries = allEntries.map(e => e.entry);
      if (!this.verifyChain(chainEntries)) {
        errors.push('Hash chain broken');
        valid = false;
      }

      // Verify chain roots and signatures
      for (let i = 0; i < allEntries.length; i++) {
        const { signed } = allEntries[i]!;
        const computedRoot = createHash('sha256')
          .update(expectedChainRoot + signed.entry.hash)
          .digest('hex');
        if (signed.chainRootHash !== computedRoot) {
          errors.push(`Chain root mismatch at entry ${i}`);
          valid = false;
        }
        expectedChainRoot = signed.chainRootHash!;

        if (!verifyEntrySignature(signed.entry, signed.signature, signed.publicKey)) {
          errors.push(`Signature invalid at entry ${i}`);
          valid = false;
        }
      }
    } catch (err) {
      return { valid: false, entries, errors: [`Failed to read file: ${err}`] };
    }

    return { valid, entries, errors };
  }

  getChainRoot(): string {
    return this.chainRoot;
  }

  /**
   * Record a wall-clock correlation of the chain root against the latest
   * Arbitrum One block. This does **not** submit an on-chain transaction
   * and must not be described as blockchain anchoring.
   *
   * @deprecated Prefer {@link snapshotArbitrumBlock}. Kept as alias for compatibility.
   */
  async anchorToArbitrum(rpcUrl?: string): Promise<{ snapshotHash: string; blockNumber: bigint } | null> {
    return this.snapshotArbitrumBlock(rpcUrl);
  }

  /**
   * Snapshot the latest Arbitrum block number/timestamp alongside the local
   * chain root. No on-chain write is performed.
   */
  async snapshotArbitrumBlock(rpcUrl?: string): Promise<{ snapshotHash: string; blockNumber: bigint } | null> {
    try {
      const { createPublicClient, http } = await import('viem');
      const { arbitrum } = await import('viem/chains');
      const client = createPublicClient({
        chain: arbitrum,
        transport: http(rpcUrl || 'https://arb1.arbitrum.io/rpc'),
      });

      const block = await client.getBlock({ blockTag: 'latest' });

      const snapshotEntry = this.logSigned({
        type: 'block_timestamp_snapshot',
        network: 'arbitrum',
        chainRoot: this.chainRoot,
        blockNumber: Number(block.number),
        blockTimestamp: Number(block.timestamp),
      });

      console.log(
        `[Snapshot] Chain root ${this.chainRoot.slice(0, 16)}... correlated to Arbitrum block ${block.number} (not an on-chain anchor)`,
      );
      return {
        snapshotHash: snapshotEntry.entry.hash,
        blockNumber: block.number as bigint,
      };
    } catch (err) {
      console.error('[Snapshot] Failed to read Arbitrum block:', err);
      return null;
    }
  }

  close(): void {
    this.flush();
  }
}
