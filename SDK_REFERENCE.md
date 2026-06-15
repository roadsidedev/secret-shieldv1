# AgentGuard SDK — API Reference

> Interactive SDK explorer covering all packages, API surfaces, patterns, vault adapters, and framework integrations.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Package Structure](#2-package-structure)
3. [Core API](#3-core-api)
4. [Scanner](#4-scanner)
5. [Pruner](#5-pruner)
6. [Ephemeral Core](#6-ephemeral-core)
7. [Vault Adapters](#7-vault-adapters)
8. [Checkpoint System](#8-checkpoint-system)
9. [Framework Adapters](#9-framework-adapters)
10. [Audit & Compliance](#10-audit--compliance)
11. [x402 Payments](#11-x402-payments)

---

## 1. Overview

AgentGuard is runtime security middleware for autonomous AI agent systems. It detects, prunes, and vaults exposed credentials from agent memory at every critical boundary.

### Core capabilities

| Capability | Description |
|---|---|
| 🔍 Auto-Detection | 50+ built-in patterns across Web2 and Web3 |
| ✂️ Checkpoint Pruning | Batch-clean agent state at session boundaries or custom triggers |
| 🔐 Vault Transfer | Move secrets to env, dotenv, HashiCorp Vault, or AWS Secrets Manager |
| 🔌 Framework Agnostic | Anthropic, OpenAI, LangChain, Express adapters |
| 📋 Audit Trail | Outcome-only logs — SUCCESS / FAILED / ERROR, never the secret |
| 🧩 Extensible | Custom pattern registries, vault adapters, and checkpoint hooks |

### Monorepo layout

```
@agentguard/core       — Scanner, EphemeralPruner, CheckpointManager, AuditLogger, AgentGuard client
@agentguard/vault      — Vault adapters: env, dotenv, HashiCorp, AWS, InMemory
@agentguard/patterns   — Built-in + extensible pattern registry (bundled with core)
@agentguard/adapters   — Framework bridges: Anthropic, OpenAI, LangChain, Express
@agentguard/x402       — x402 payment middleware (server) and agent client
@agentguard/server     — REST API server for hosted deployments
@agentguard/cli        — agentguard scan, agentguard install
agentguard             — Meta-package convenience re-export
```

---

## 2. Package Structure

### Installation

```bash
# Minimum — core + one vault adapter
pnpm add @agentguard/core @agentguard/vault

# Full — all packages
pnpm add @agentguard/core @agentguard/vault @agentguard/adapters @agentguard/x402 @agentguard/server
pnpm add -D @agentguard/cli
```

### Package overview

| Package | Contents | Required |
|---|---|---|
| `@agentguard/core` | Scanner, Taint Engine, EphemeralPruner, CheckpointManager, AuditLogger, AgentGuard client | ✅ |
| `@agentguard/vault` | All vault adapters | ✅ |
| `@agentguard/patterns` | Pattern registry — install separately to extend | optional |
| `@agentguard/adapters` | Framework bridges | optional |
| `@agentguard/x402` | x402 server middleware + agent client | optional |
| `@agentguard/server` | REST API server | optional |
| `@agentguard/cli` | CLI tools — install as devDependency | dev |

---

## 3. Core API

### AgentGuard client

```typescript
import { AgentGuard } from '@agentguard/core';
import { EnvVaultAdapter } from '@agentguard/vault';

const guard = new AgentGuard({
  vault:    new EnvVaultAdapter(),
  patterns: [...builtinPatterns, myCustomPattern],
  checkpoints: [
    { name: 'SESSION_END' },
    { name: 'MEMORY_SAVE', intercept: true },
  ],
  audit: {
    schema:     'OUTCOME_ONLY',
    filePath:   './agentguard-audit.jsonl',
    webhookUrl: 'https://your-webhook.example.com/audit',
  },
  onPruneComplete: async (result) => {
    // monitoring hook — result contains outcome + secretCount only
  },
});
```

### Constructor options

| Option | Type | Default | Description |
|---|---|---|---|
| `vault` | `VaultAdapter` | `EnvVaultAdapter` | Vault adapter for storing pruned secrets |
| `patterns` | `SecretPattern[]` | built-in patterns | Pattern list passed to the scanner |
| `checkpoints` | `CheckpointDefinition[]` | `[]` | Checkpoint triggers registered at startup |
| `audit.schema` | `'OUTCOME_ONLY' \| 'BINARY'` | `'OUTCOME_ONLY'` | Controls what the audit log records |
| `audit.filePath` | `string` | `''` | Append JSONL audit entries to a file |
| `audit.webhookUrl` | `string` | `''` | POST each audit entry to a webhook |
| `audit.webhookSecret` | `string` | `''` | HMAC-SHA256 key for webhook signing |
| `onPruneComplete` | `(result) => void` | — | Hook called after every prune cycle |

### Methods

#### `guard.wrap(fn, state, tag?)`

Wraps an agent function. Executes it, then fires a `SESSION_END` checkpoint on the state before returning.

```typescript
const { result, cleanState } = await guard.wrap(
  async (state) => myAgentLogic(state),
  agentState,
  'optional-session-tag',
);
// Returns: { result: T, cleanState: unknown }
```

---

#### `guard.checkpoint(name, state, tag?)`

Manually trigger a named checkpoint. Returns sanitised state.

```typescript
const cleanState = await guard.checkpoint('MEMORY_SAVE', agentState);
// Returns: unknown (the sanitised state)
```

---

#### `guard.scan(input)`

Scan without pruning. Does not modify state or write to vault.

```typescript
const { found, matches, scannedAt, nodesVisited } = await guard.scan(agentState);
// ⚠️ matches[n].value contains the raw secret — never log in production
```

---

#### `guard.prune(state, tag?)`

Run a full prune cycle directly, bypassing the checkpoint system.

```typescript
const { outcome, secretCount, cleanState, durationMs } = await guard.prune(agentState);
```

---

#### `guard.on(event, handler)`

Subscribe to lifecycle events.

```typescript
guard.on('secret:found',      (match)  => { /* ... */ });
guard.on('prune:complete',    (result) => { /* ... */ });
guard.on('vault:write',       (ref)    => { /* ... */ });
guard.on('error',             (err)    => { /* ... */ });
```

**Available events:** `secret:found` · `prune:start` · `prune:complete` · `vault:write` · `error`

---

## 4. Scanner

The scanner is the detection engine. It recursively traverses agent state and applies pattern matching.

```typescript
import { Scanner } from '@agentguard/core';
import { PatternRegistry } from '@agentguard/patterns';

const scanner = new Scanner({
  registry:      PatternRegistry.createDefault(),
  deepScan:      true,   // recurse into nested objects and arrays (default: true)
  includeBase64: true,   // detect base64-encoded secrets (default: true)
  maxDepth:      20,     // max recursion depth (default: 20)
});

const result = await scanner.scan(agentMessages);
```

### ScanResult

```typescript
interface ScanResult {
  found:        boolean;
  matches:      ScanMatch[];
  scannedAt:    Date;
  nodesVisited: number;
}

interface ScanMatch {
  patternId:  string;    // e.g. 'ethereum_private_key'
  type:       SecretType;
  severity:   'critical' | 'high' | 'medium' | 'low';
  value:      string;    // ⚠️ raw secret — never log or persist
  path:       string;    // e.g. 'messages[2].content'
  redacted:   string;    // safe preview: '0xac09••••••••b2f1'
  entropy:    number;    // Shannon entropy (bits)
  confidence: number;    // 0–1
}
```

### Built-in pattern library

| Pattern | Severity | Category |
|---|---|---|
| Ethereum / EVM private keys | critical | Web3 |
| BIP-39 seed phrases (12 & 24 word) | critical | Web3 |
| Bitcoin WIF / BIP-32 xpriv | critical | Web3 |
| Solana keypairs (Base58) | critical | Web3 |
| OpenAI / Anthropic / HuggingFace API keys | high | AI |
| AWS access key ID + secret | high | Cloud |
| GCP service account key (JSON fragment) | high | Cloud |
| Azure client secret | high | Cloud |
| GitHub tokens (classic + fine-grained) | high | DevOps |
| GitLab personal access tokens | high | DevOps |
| Stripe secret + restricted keys | high | Payments |
| Twilio auth token | high | Comms |
| SendGrid API key | high | Comms |
| Dataarbitrum connection strings (Postgres, MySQL, MongoDB, Redis) | high | Dataarbitrum |
| PEM private keys (RSA, EC, Ed25519, OpenSSH) | critical | Certs |
| JWT tokens | medium | Auth |
| Bearer tokens (generic high-entropy) | medium | Auth |
| npm automation / publish tokens | high | DevOps |

### Custom patterns

```typescript
import { PatternRegistry } from '@agentguard/patterns';

const registry = PatternRegistry.createDefault();

registry.register({
  id:         'my_internal_token',
  name:       'Internal Service Token',
  type:       'api_key',
  severity:   'high',
  pattern:    /\bINT_[A-Za-z0-9]{32}\b/g,
  validate:   (match) => match.startsWith('INT_'),
  minEntropy: 120,
});

// Pass the custom registry to AgentGuard
const guard = new AgentGuard({ vault, scanner: { registry } });
```

### Live pattern updates

```typescript
// Load patterns from a remote URL — useful for fleet-wide rollouts
await registry.loadFromUrl('https://patterns.agentguard.dev/latest.json');
```

---

## 5. Pruner

### Prune strategies

| Strategy | Behaviour | When to use |
|---|---|---|
| `REDACT` | Replaces with `[REDACTED_BY_AGENTGUARD]` | Default. Safe for debugging — field still exists. |
| `REMOVE` | Deletes the field entirely | Cleanest output; field must be non-essential. |
| `REPLACE` | Writes to vault, injects reference token | **Recommended.** Agent resolves token only when genuinely needed. |

### REPLACE strategy — vault reference tokens

```typescript
// Before pruning
{ openai_key: 'sk-proj-abc123...' }

// After pruning with REPLACE strategy
{ openai_key: '{{vault:openai_key_a3f9b2}}' }

// Resolve when the agent actually needs it
const value = await guard.vault.resolve('{{vault:openai_key_a3f9b2}}');
```

### EphemeralPruner options

```typescript
import { EphemeralPruner } from '@agentguard/core';

const pruner = new EphemeralPruner({
  strategy:        'REDACT',                    // REDACT | REMOVE | REPLACE
  redactWith:      '[REDACTED_BY_AGENTGUARD]',  // placeholder for REDACT strategy
  isolate:         true,                        // run in Worker thread (default: true)
  workerTimeoutMs: 10_000,                      // ms before Worker is force-killed
});

const { outcome, secretCount, cleanState, durationMs } = await pruner.prune(agentState);
```

---

## 6. Ephemeral Core

Every prune cycle runs inside an isolated Node.js Worker thread.

### Isolation flow

```
Parent Process                    Worker Thread (fresh for every call)
─────────────────────────────     ──────────────────────────────────────
agentState ─[structuredClone]──>  state_copy  (isolated — no shared refs)
                                      │
                                  Scanner.scan(state_copy)
                                      │
                                  for each match:
                                    vault.write(match.value)  ← vault call
                                    match.value = ''           ← zero ref
                                      │
                                  applyRedactions(state_copy)
                                      │
                                  parentPort.postMessage({    ← ONLY this crosses
                                    outcome:     'SUCCESS',
                                    secretCount: 2,
                                    durationMs:  4,
                                    cleanState:  { ... }      ← no secrets
                                  })
                                      │
                                  Worker.terminate()           ← process exits
```

### Audit schema — what is never logged

The audit log **never** records:

- Secret values (raw or partially redacted)
- Secret types or pattern IDs
- Field paths where the secret was found
- Agent session identifiers
- Vault references

```jsonc
// OUTCOME_ONLY schema (default)
{
  "eventId":     "evt_01j9xabc...",
  "timestamp":   "2026-06-04T12:00:00.000Z",
  "outcome":     "SUCCESS",
  "secretCount": 2,
  "durationMs":  6
}

// BINARY schema (maximum privacy)
{
  "eventId":   "evt_01j9xabc...",
  "timestamp": "2026-06-04T12:00:00.000Z",
  "outcome":   "SUCCESS"
}
```

### Worker pool

AgentGuard maintains a worker pool rather than spawning a fresh process per call. Includes:

- Configurable pool size (default: CPU count)
- Queue for concurrent burst handling
- Inline fallback when `worker_threads` is unavailable (e.g. edge runtimes)
- Hard timeout with force-termination

```typescript
const guard = new AgentGuard({
  vault,
  prune: {
    isolate:         true,
    workerTimeoutMs: 10_000,
  },
});
```

---

## 7. Vault Adapters

All adapters implement the `VaultAdapter` interface.

```typescript
interface VaultAdapter {
  readonly name: string;
  write(key: string, value: string, meta?: SecretMeta): Promise<VaultRef>;
  read(ref: VaultRef):                                  Promise<string>;
  list():                                               Promise<VaultRef[]>;
  delete(ref: VaultRef):                                Promise<void>;
}

interface VaultRef {
  key:       string;  // unique key in the vault
  adapter:   string;  // adapter that stored this
  storedAt:  string;  // ISO 8601 timestamp
}

interface SecretMeta {
  tags?:       Record<string, string>;
  ttlSeconds?: number;
}
```

### EnvVaultAdapter

```typescript
import { EnvVaultAdapter } from '@agentguard/vault';

const vault = new EnvVaultAdapter();
// Secrets stored as AGENTGUARD_<UPPERCASED_KEY> in process.env
```

### DotEnvVaultAdapter

```typescript
import { DotEnvVaultAdapter } from '@agentguard/vault';

const vault = new DotEnvVaultAdapter({
  path:           './.env.agentguard',  // default
  checkGitignore: true,                  // throws if file is not gitignored
});
```

> ⚠️ `DotEnvVaultAdapter` throws on instantiation if the file path is not listed in `.gitignore`. This is intentional and non-configurable in production mode.

### InMemoryVaultAdapter

```typescript
import { InMemoryVaultAdapter } from '@agentguard/vault';

const vault = new InMemoryVaultAdapter();

// Wipe all entries on shutdown
vault.wipe();
```

> ⚠️ Ephemeral — all data is lost on process exit. Testing and sandboxed environments only.

### HashiCorpVaultAdapter

Requires `node-vault`.

```typescript
import { HashiCorpVaultAdapter } from '@agentguard/vault';

const vault = new HashiCorpVaultAdapter({
  endpoint:  process.env.HASHICORP_VAULT_ADDR,
  token:     process.env.HASHICORP_VAULT_TOKEN,
  mountPath: 'secret',
  namespace: 'agentguard',
});
```

### AWSSecretsAdapter

Requires `@aws-sdk/client-secrets-manager`.

```typescript
import { AWSSecretsAdapter } from '@agentguard/vault';

const vault = new AWSSecretsAdapter({
  region: 'us-east-1',
  prefix: 'agentguard/',
  tags:   { Project: 'AgentGuard', Env: 'prod' },
});
```

### Custom adapter

```typescript
import type { VaultAdapter, VaultRef, SecretMeta } from '@agentguard/vault';

export class MyVaultAdapter implements VaultAdapter {
  readonly name = 'my-vault';

  async write(key: string, value: string, meta?: SecretMeta): Promise<VaultRef> {
    // NEVER log the value here
    await myBackend.set(key, value);
    return { key, adapter: this.name, storedAt: new Date().toISOString() };
  }

  async read(ref: VaultRef): Promise<string>  { return myBackend.get(ref.key); }
  async list(): Promise<VaultRef[]>           { /* ... */ }
  async delete(ref: VaultRef): Promise<void>  { await myBackend.delete(ref.key); }
}
```

---

## 8. Checkpoint System

Checkpoints are the trigger mechanism for scan-prune-vault cycles.

### Checkpoint triggers

| Trigger | When it fires |
|---|---|
| `SESSION_END` | After the agent conversation loop ends |
| `MEMORY_SAVE` | Before writing to a vector store or database |
| `TOOL_CALL_COMPLETE` | After each tool invocation returns |
| `MESSAGE_BOUNDARY` | Between each agent message turn |
| `INTERVAL` | Time-arbitrumd — every N milliseconds |
| `CUSTOM` | Any event you emit from your own code |

### Registering checkpoints

```typescript
const guard = new AgentGuard({
  vault,
  checkpoints: [
    { name: 'SESSION_END' },
    { name: 'MEMORY_SAVE', intercept: true },   // blocks the write until pruned
    { name: 'TOOL_CALL_COMPLETE' },
    { name: 'INTERVAL', intervalMs: 30_000 },
  ],
});
```

### Manual trigger

```typescript
const cleanState = await guard.checkpoint('MEMORY_SAVE', agentState, 'optional-tag');
```

### Custom checkpoint

```typescript
guard.checkpoints.register({
  name:      'before-vector-upsert',
  intercept: true,
});

// In your agent loop:
const cleanState = await guard.checkpoint('before-vector-upsert', stateToUpsert);
await vectorStore.upsert(cleanState);
```

### Interval checkpoints

```typescript
guard.checkpoints.register({ name: 'INTERVAL', intervalMs: 60_000 });

guard.checkpoints.startIntervals(
  () => agentState,
  (clean) => { agentState = clean; },
);

// On shutdown:
guard.checkpoints.stopIntervals();
```

---

## 9. Framework Adapters

### Anthropic SDK

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { AgentGuard } from '@agentguard/core';
import { GuardedAnthropic } from '@agentguard/adapters/anthropic';

const client = new GuardedAnthropic(new Anthropic(), guard);

// Use exactly like the standard SDK
// Messages are scanned outbound and inbound
// Tool call results are intercepted before entering the next turn
const response = await client.messages.create({
  model:      'claude-opus-4-6',
  max_tokens: 1024,
  messages:   [{ role: 'user', content: userInput }],
});
```

### OpenAI SDK

```typescript
import OpenAI from 'openai';
import { GuardedOpenAI } from '@agentguard/adapters/openai';

const client = new GuardedOpenAI(new OpenAI(), guard);

const response = await client.chat.completions.create({
  model:    'gpt-4o',
  messages: [{ role: 'user', content: userInput }],
});
```

### LangChain

```typescript
import { withAgentGuard } from '@agentguard/adapters/langchain';

const safeChain = withAgentGuard(myChain, guard);

// Runs the chain, then prunes the output state
const result = await safeChain.invoke({ input: userInput });
```

### Express middleware

```typescript
import express from 'express';
import { agentGuardMiddleware } from '@agentguard/adapters/express';

const app = express();
app.use(express.json());
app.use(agentGuardMiddleware(guard));

// All req.body and res.json() payloads are scanned automatically
```

### Vector store adapters

All six adapters intercept writes before secrets persist to the vector database.
Each fires a `MEMORY_SAVE` checkpoint, blocking the write until pruning completes.

| Store | Intercepted method | Import |
|---|---|---|
| Pinecone | `Index.upsert` | `@agentguard/adapters/pinecone` |
| Chroma | `Collection.add` | `@agentguard/adapters/chroma` |
| Qdrant | `client.upsert` | `@agentguard/adapters/qdrant` |
| Weaviate | `data.creator` builder | `@agentguard/adapters/weaviate` |
| LanceDB | `table.add` | `@agentguard/adapters/lancedb` |
| Milvus | `client.insert` | `@agentguard/adapters/milvus` |

```typescript
// Example — Qdrant
import { QdrantClient } from '@qdrant/js-client-rest';
import { GuardedQdrant } from '@agentguard/adapters/qdrant';

const client = new GuardedQdrant(new QdrantClient({ url: '...' }), guard);

// Intercepted — state is scanned and pruned before the upsert
await client.upsert('collection-name', { points: [...] });
```

---

## 10. Audit & Compliance

### AuditLogger options

```typescript
const guard = new AgentGuard({
  vault,
  audit: {
    schema:        'OUTCOME_ONLY',  // or 'BINARY'
    console:       true,             // print to stdout (default: true, false in test env)
    filePath:      './audit.jsonl',  // append JSONL to file
    webhookUrl:    'https://...',    // POST on every event
    webhookSecret: process.env.WEBHOOK_SECRET,  // HMAC-SHA256 signing key
  },
});
```

### Schema options

| Schema | Fields logged |
|---|---|
| `OUTCOME_ONLY` | `eventId`, `timestamp`, `outcome`, `secretCount`, `durationMs`, `tag?` |
| `BINARY` | `eventId`, `timestamp`, `outcome` only |

### Webhook verification

Every POST includes an `X-AgentGuard-Signature: sha256=<hmac>` header.

```typescript
// Verify on the receiving end
import { createHmac } from 'node:crypto';

const sig = req.headers['x-agentguard-signature'];
const expected = 'sha256=' + createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (sig !== expected) throw new Error('Invalid signature');
```

### Hash-chained audit logs

AgentGuard produces tamper-evident audit logs by chaining each entry to the SHA-256 hash of the previous entry. Any modification to a historical entry breaks the chain and is detectable.

```jsonc
{
  "eventId":   "evt_01j9x...",
  "timestamp": "2026-06-04T12:00:00.000Z",
  "outcome":   "SUCCESS",
  "secretCount": 2,
  "durationMs":  6,
  "prevHash":  "a3f9b2c1...",   // SHA-256 of previous entry
  "hash":      "d7e2f4a9..."    // SHA-256 of this entry
}
```

---

## 11. x402 Payments

The hosted AgentGuard API uses the x402 HTTP micropayment standard — USDC on Arbitrum One, per-call pricing, no subscriptions.

### Pricing

| Operation | Price (USDC) | Description |
|---|---|---|
| `scan` | $0.001 | Pattern scan only — no vault write |
| `prune` | $0.005 | Full scan + prune + vault write |
| `checkpoint` | $0.010 | Full checkpoint cycle with audit entry |

> First **100 calls free** per wallet address. No sign-up required.

### Payment flow

```
Agent                              AgentGuard API
  │                                      │
  ├── POST /v1/checkpoint ─────────────> │
  │                                      │
  │ <── 402 Payment Required ────────── │
  │     X-Payment-Required: {            │
  │       amount:  "0.0100",             │
  │       token:   "USDC",               │
  │       network: "arbitrum",               │
  │       payTo:   "0x...",              │
  │       nonce:   "abc123"              │
  │     }                                │
  │                                      │
  ├── [agent signs + pays on Arbitrum One] ────> │
  │                                      │
  ├── POST /v1/checkpoint ─────────────> │
  │     X-Payment: {                     │
  │       txHash:    "0x...",            │
  │       signature: "0x..."             │
  │     }                                │
  │                                      │
  │ <── 200 { cleanState: {...} } ───── │
```

### Agent-side setup

```typescript
import { x402AgentClient } from '@agentguard/x402';

const client = x402AgentClient({
  endpoint:     'https://api.agentguard.dev',
  agentWallet:  {
    address: '0xYourAgentWalletAddress',
    sign:    async (message) => yourWallet.signMessage(message),
    chainId: 42161,  // Arbitrum One mainnet
  },
  maxPriceUSDC: '0.05',  // safety cap — reject if price exceeds this
});

// 402 → pay → retry handled transparently
const cleanState = await client.checkpoint(agentState);
```

### Server-side x402 middleware

```typescript
import { AgentGuardServer } from '@agentguard/server';
import { x402Middleware }   from '@agentguard/x402';

const server = new AgentGuardServer({
  guard,
  payment: {
    enabled:   true,
    network:   'arbitrum',
    token:     'USDC',
    payTo:     process.env.TREASURY_ADDRESS,
    pricing: {
      prune:      '0.005',
      scan:       '0.001',
      checkpoint: '0.010',
    },
    freeQuota: 100,  // calls free per wallet address
  },
});
```

### Self-hosted (no payments)

```typescript
import { AgentGuardClient } from '@agentguard/server/client';

const client = new AgentGuardClient({
  baseUrl: 'http://agentguard.internal:3000',
  // No payment config — self-hosted is always free
});

const cleanState = await client.checkpoint(agentState);
```

---

*AgentGuard is MIT licensed. © 2026 AgentGuard Contributors.*
