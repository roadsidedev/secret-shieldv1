# KeySpot SDK

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@roadsidelab/keyspot-sdk)](https://www.npmjs.com/package/@roadsidelab/keyspot-sdk)
[![TypeScript](https://img.shields.io/badge/types-TypeScript-3178C6)](https://www.typescriptlang.org/)

**Runtime credential hygiene for autonomous AI agents.**

KeySpot SDK intercepts agent execution at critical boundaries — session end, memory save, tool return — and runs a **Checkpoint → Scan → Vault → Replace → Continue** cycle. Detected secrets are replaced with HMAC-signed vault references so they are less likely to persist in agent state, vector stores, and logs.

> **Security posture:** See the [Threat Model](docs/security/threat-model.md). KeySpot is **not** a hardware enclave. Pure JS/Python cannot guarantee secret zeroization from process memory. A **production-secure** claim requires the native sealed-memory core, a persistent vault, and the deployment baseline in that document. The **Python SDK is experimental** until the parity gate passes.

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

`createSecure()` requires a vault adapter, rejects `InMemoryVaultAdapter`, and enables prompt shielding, taint tracking, and telemetry. For local dev use the base constructor with `InMemoryVaultAdapter`. See [Threat Model](docs/security/threat-model.md).

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

> **Framework note:** Current wrappers primarily sanitize **model outputs**. Checkpoint tool results and inbound prompts explicitly (or use dual-side wrapping when enabled) so secrets never enter the model context unscanned.

---

## Key Features

- **40+ built-in patterns** — Crypto keys, AI provider keys (OpenAI, Anthropic, Gemini), cloud credentials (AWS, GCP, Azure), database connection strings, payment processor keys, PII, and more
- **Taint tracking** — Catches derived secrets (summaries, embeddings, transformed values) that would otherwise evade detection
- **PromptShield** — Regex heuristics for jailbreaks / prompt extraction (soft signal, not a sole control)
- **Pluggable vault adapters** — InMemory (dev only), AWS Secrets Manager, or custom via `BaseVaultAdapter`
- **Hash-chained audit logs** — Tamper-evident chain; optional Ed25519 signatures; optional **block timestamp snapshot** (not an on-chain write today)
- **Vector store adapters** — Pinecone, Chroma, Qdrant, Weaviate, LanceDB, Milvus — sanitize before upsert
- **CLI** — `keyspot scan ./src` for file scanning, pre-commit hooks, CI integration (JSON output redacts secret values by default)
- **Python SDK** — Experimental port (`pip install keyspot`); not full TS parity until the parity gate
- **x402 micropayments** — Optional pay-per-checkpoint for hosted deployments
- **Streaming scan** — Rolling window catches secrets across chunk boundaries
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

- [Threat model](docs/security/threat-model.md) — Guarantees, non-guarantees, residual risk
- [Full developer documentation](DOCUMENTATION.md) — API reference, configuration, vault adapters
- [Migration guide](MIGRATION.md) — Breaking changes from v2.x
- [Contributing guide](CONTRIBUTING.md) — Development setup, coding standards, test structure
- [API reference](docs/api/index.html) — Generated TypeDoc (`pnpm docs`)
- [Ops runbooks](docs/ops/alert-runbook.md) — Incident response (secret detected, vault down, false positives)
- [Deployment checklist](docs/ops/deployment-checklist.md) — Production pre-flight, shutdown, rollback
- [Monitoring guide](docs/ops/monitoring-guide.md) — Prometheus scrape config, Grafana dashboards, alert rules

---

## License

MIT — free for self-hosting. Hosted tier available via x402 micropayments.
