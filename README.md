# KeySpot SDK

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@roadsidelab/keyspot-sdk)](https://www.npmjs.com/package/@roadsidelab/keyspot-sdk)
[![TypeScript](https://img.shields.io/badge/types-TypeScript-3178C6)](https://www.typescriptlang.org/)

**Runtime credential hygiene for autonomous AI agents.**

KeySpot SDK intercepts agent execution at every critical boundary — session end, memory save, tool return — and runs a **Checkpoint -> Scan -> Vault -> Replace -> Continue** cycle. Secrets never persist in agent memory. They're replaced with HMAC-signed vault references.

---

## The Problem

Autonomous AI agents handle secrets — API keys, cloud credentials, crypto private keys, database connection strings — in memory, logs, and tool call outputs. A single leak in a checkpoint file, vector store ingestion, or debug log can compromise your infrastructure. Agents don't know what a secret is. They need a security layer.

## How It Works

```
Agent State -> KeySpot.checkpoint()
  |-- Scan: 40+ patterns (API keys, cloud creds, crypto, PII)
  |-- Vault: store secret, get HMAC-signed reference token
  |-- Taint: tag derived values so they're caught too
  |-- Replace: swap secret for "vault:v1:{id}:{hmac}:{ts}"
  |-- Return: clean state
```

The scanner uses contextual confidence scoring — paths like `config.*` / `secret.*` get a boost, paths like `chat.*` / `memory.*` get a penalty — to minimize false positives.

---

## Quick Start

```bash
npm install @roadsidelab/keyspot-sdk
```

```typescript
import { KeySpot } from '@roadsidelab/keyspot-sdk';

const guard = new KeySpot({ taintEnabled: true });

// Checkpoint: scan and vault any secrets in agent state
const cleanState = await guard.checkpoint({
  user: 'alice',
  config: { apiKey: 'sk-123456789012345678901234567890123456789012345678' }
});
// config.apiKey -> "vault:v1:vault_abc123:abcd1234...:1717500000000"
```

### Production Setup

```typescript
import { KeySpot, AWSSecretsAdapter } from '@roadsidelab/keyspot-sdk';

const guard = KeySpot.createSecure({
  vault: new AWSSecretsAdapter({ region: 'us-east-1' }),
  onSecretFound: async (match) => {
    await sendAlert(match.type, match.path);
  },
});
```

`createSecure()` rejects `InMemoryVaultAdapter`, enables prompt shielding, taint tracking, and telemetry. For dev environments use the base constructor.

One-line auto-detect (works with any framework):

```typescript
import { guardAgent } from '@roadsidelab/keyspot-sdk/agent';

const { agent: guarded } = guardAgent(myAgent);
// guarded behaves identically — secrets are auto-vaulted
```

### Framework Integrations

```typescript
// Anthropic SDK
import { wrapAnthropic } from '@roadsidelab/keyspot-sdk/frameworks';
const guarded = wrapAnthropic(anthropic, guard);

// OpenAI SDK
import { wrapOpenAI } from '@roadsidelab/keyspot-sdk/frameworks';
const guarded = wrapOpenAI(openai, guard);

// LangChain
import { withKeySpot } from '@roadsidelab/keyspot-sdk/frameworks';
const guarded = withKeySpot(chain, guard);
```

Also supports **OpenClaw**, **Hermes**, and generic `guard.wrap(fn, state)`.

---

## Key Features

- **40+ built-in patterns** — Crypto keys, AI provider keys (OpenAI, Anthropic, Gemini), cloud credentials (AWS, GCP, Azure), database connection strings, payment processor keys, PII, and more
- **Taint tracking** — Catches derived secrets (summaries, embeddings, transformed values) that would otherwise evade detection
- **PromptShield** — 18 built-in rules detect jailbreak attempts, system prompt extraction, and policy violations before prompts reach the LLM
- **Pluggable vault adapters** — InMemory (default), AWS Secrets Manager, or custom via `BaseVaultAdapter`
- **Hash-chained audit logs** — Tamper-proof, Ed25519-signed, optional blockchain anchoring
- **Vector store adapters** — Pinecone, Chroma, Qdrant, Weaviate, LanceDB, Milvus — auto-sanitize before upsert
- **CLI** — `keyspot scan ./src` for file scanning, pre-commit hooks, CI integration with JSON output
- **Python SDK** — Full TypeScript parity via `pip install keyspot`
- **x402 micropayments** — Pay-per-checkpoint on-chain for hosted deployments
- **Streaming scan** — 2048-char rolling window catches secrets across chunk boundaries
- **Self-hosted or hosted** — Run your own server or use the hosted SaaS with Stripe subscriptions

---

## What It Detects

| Category | Examples |
|----------|----------|
| Crypto keys | Ethereum/Solana private keys, PEM keys (RSA, EC, Ed25519) |
| AI provider keys | OpenAI, Anthropic, Google/Gemini, HuggingFace, Replicate, Cohere |
| Cloud credentials | AWS access keys, GCP service accounts, Azure connection strings |
| Database URLs | PostgreSQL, MySQL, MongoDB, Redis connection strings |
| Payment processors | Stripe live/test keys |
| Auth tokens | JWT, OAuth refresh tokens, Firebase, GitHub, GitLab PATs |
| Comms & infra | Twilio, SendGrid, Discord, Slack, PagerDuty tokens |
| PII | Credit card numbers, US Social Security Numbers |

---

## Documentation

- [Full developer documentation](DOCUMENTATION.md) — API reference, configuration, vault adapters, threat model
- [Migration guide](MIGRATION.md) — Breaking changes from v2.x
- [Contributing guide](CONTRIBUTING.md) — Development setup, coding standards, test structure
- [API reference](docs/api/index.html) — Generated TypeDoc (`pnpm docs`)
- [Ops runbooks](docs/ops/alert-runbook.md) — Incident response (secret detected, vault down, false positives)
- [Deployment checklist](docs/ops/deployment-checklist.md) — Production pre-flight, shutdown, rollback
- [Monitoring guide](docs/ops/monitoring-guide.md) — Prometheus scrape config, Grafana dashboards, alert rules

---

## License

MIT — free for self-hosting. Hosted tier available via x402 micropayments.
