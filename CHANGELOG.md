# Changelog

## 0.0.5 (2026-06-20)

### Core: Resilience & Error Handling
- **Structured error taxonomy** — 8 error classes: `KeySpotError` (base), `VaultError`, `WorkerError`, `AuthError`, `PaymentRequiredError`, `ScanError`, `ConfigurationError`, `ValidationError`. Each with `code`, `statusCode`, `retryable`, `details`, and `toJSON()`.
- **Circuit breaker** — Generic state machine (CLOSED → OPEN → HALF_OPEN → CLOSED) with configurable threshold, reset timeout, and callbacks. Applied to vault adapter via `withCircuitBreaker()`.
- **Worker pool retry** — Exponential backoff (1s/2s/4s), configurable `maxRetries` (default 2), inline fallback on final failure.
- **Fail-closed vault** — Vault write failure during checkpoint throws `VaultError` — state is never returned with unvaulted secrets.
- **Fail-soft rotation** — Rotation hook exception silently caught; original secret stored.
- **`PaymentRequiredError`** replaces plain `Error` for 402 responses. Includes `facilitatorUrl` in error details.

### Core: Security Hardening
- **`checkHostedAccess()`** — Real x402 payment verification via facilitator API (`POST /api/v1/access-tokens`). HTTPS enforcement, 24h max token TTL, audit-logged failures.
- **`setAccessToken()`** — Public method with capped expiry (max 24h). No more `Infinity`-lifetime tokens.
- **Protype pollution protection** — `replaceAtPath()` blocks `__proto__`, `constructor`, `prototype`.
- **Secret zeroing** — `match.rawValue` set to `[CLEARED]` after vault write.
- **`crypto.randomUUID()`** — Replaces `Math.random()` for cryptographically secure secret IDs.
- **Stream buffer cleanup** — `clearStreamBuffer()` public method.
- **Audit logger cap** — Max 10,000 in-memory entries; oldest dropped on overflow.
- **Audit `clear()` disabled in production** — Prevents undetectable chain wipe.
- **Timestamp monotonicity check** — `verifyChainDetailed()` now validates strictly increasing timestamps.

### Server: Middleware & Observability
- **CORS hardened** — No more `origin: '*'` with `credentials: true`. Production requires explicit `CORS_ORIGIN` env var.
- **Error handler** — Differentiates `KeySpotError` subclasses; returns correct `statusCode` and `code`.
- **Async error wrapping** — All async route errors now forwarded to Express error handler.
- **x402 middleware** — Route-specific mount (`POST /checkpoint` only), not global.
- **Health probes** — `GET /livez` (liveness), `GET /readyz` (dependency checks: DB, Redis, vault).
- **Histogram percentile buckets** — 10 buckets (5ms to 5000ms) — p50/p95/p99 now computable.
- **Gauge metrics** — `active_requests`, `vault_connected`, `worker_pool_depth`.
- **Label cardinality control** — Paths sanitized, status codes bucketed (2xx/4xx/5xx).
- **Structured logging** — pino auto-detect with console fallback. JSON format with `requestId`, `traceId`, `module`.
- **Startup env validation** — `DATABASE_URL` required. x402 provider validated against known keys.
- **Dynamic version** — Server version now read from `package.json` instead of hardcoded string.

### Vault
- **Expired entry GC** — `sweepExpired()` public method; called automatically by `list()`.
- **Enhanced ref verification** — Tests for wrong version, tampered HMAC, empty ACL.

### Testing & Validation
- **276 tests across 23 files** (was 167 tests across 19 files) — 106 new tests.
- **Security fixture suite** — 62 tests: 20 verified pattern fixtures, 36 non-secrets, 6 adversarial inputs (null bytes, circular references, deeply nested, Unicode homoglyphs, extremely long inputs, multi-type detection).
- **Property-based scanner tests** — 12 tests: random key detection, taint transitivity, stream scan, nested data types.
- **AhoCorasick tests** — 14 tests: empty keywords, single/multiple/overlapping, unicode, edge cases.
- **PatternRegistry tests** — 9 tests: register/unregister, trie rebuild, live updates lifecycle.
- **Error taxonomy tests** — 10 tests: serialization, instanceof, statusCode, retryability.
- **Circuit breaker tests** — 9 tests: state transitions, callbacks, reset, half-open probe.
- **Worker pool tests** — 5 tests: inline execution, queue, concurrent jobs, large payloads, active count.
- **Error propagation tests** — 4 tests: all framework wrappers propagate errors correctly.
- **Scanner edge case tests** — Added 8 tests: empty/null inputs, stream states, multi-regex matches.

### Production Factory
- **`KeySpot.createSecure({ vault })`** — Validated production preset. Rejects `InMemoryVaultAdapter`, enables prompt shield, taint tracking, telemetry, alerting hooks.

### Operations
- **3 ops runbooks** — `docs/ops/alert-runbook.md`: Secret Detected, Vault Down, High False Positives — each with triage/containment/recovery.
- **Deployment checklist** — `docs/ops/deployment-checklist.md`: Pre-flight, startup, shutdown, rollback procedures.
- **Monitoring guide** — `docs/ops/monitoring-guide.md`: Prometheus scrape config, Grafana queries, alert rules (PrometheusRule YAML), SLO targets.
- **Docker hardening** — Multi-stage build, `USER node`, `HEALTHCHECK` instruction, `.dockerignore`.

### Breaking Changes
- Error classes now thrown instead of plain `Error`: catch `KeySpotError` to read `.code` and `.statusCode`.
- `AuditLogger.clear()` throws in `NODE_ENV=production` (tamper evidence protection).
- `setAccessToken()` without `expiresAt` now defaults to 24h (was `Infinity`).
- CORS: production requires `CORS_ORIGIN` env var; wildcard no longer allowed.
- Minimum Node.js version: 18 (unchanged, but verified).

## 2.0.3 (2026-06-14)

### New
- ASCII banner on CLI start — "KEYSPOT" rendered in Matrix green (`#00ff41`) via figlet font `Banner3`, wrapped in a boxen border
- Colour-coded `log` object with 7 methods: `scanning` (amber), `detected` (red), `vaulted` (green), `clean` (matrix green), `info` (white), `muted` (grey), `error` (red, stderr)
- All CLI output now uses coloured prefixes with distinct symbols (`⬡`, `✗`, `✓`, `●`, `›`)
- Scan summary includes elapsed time in milliseconds

### Packaging
- Added `figlet`, `chalk`, `boxen` as runtime dependencies of `@roadsidelab/keyspot-cli`

## 2.0.2 (2026-06-09)

### New
- `@roadsidelab/keyspot-sdk/agent` — new `guardAgent()` auto-detect wrapper. One import, one call, any framework
- `SKILL.md` at repo root — plug-and-play agent skill for Claude Code, Opencode, Cursor, etc.

### Fixed
- CLI path resolution: `keyspot scan ./src` now correctly resolves relative to CWD instead of pnpm store

### Packaging
- Added `@roadsidelab/keyspot-agent` package to monorepo

## 2.0.0 (2026-06-06)

### Packaging
- Consolidated 8 separate npm packages into a single `@roadsidelab/keyspot-sdk` meta-package
- `pnpm add @roadsidelab/keyspot-sdk` — one install, all features
- Subpath exports: `/adapters`, `/frameworks`, `/cli`
- x402 absorbed into server internals (no longer a standalone package)
- Heavy external deps (pinecone, chromadb, etc.) are optional — only downloaded if needed
- All internal packages retained in monorepo but no longer published individually

### Core
- Scanner with 50+ secret patterns (AI keys, cloud creds, SaaS tokens, DB URLs, crypto keys, PII)
- Recursive deep scan of nested objects/arrays
- Taint tracking engine (tag, propagate, untaint) with SHA-256 hash map
- Context-aware confidence scoring (config > env > log > chat)
- Aho-Corasick trie for fast keyword pre-filtering
- PatternRegistry with live update support (GitHub/S3)

### Vault
- HMAC-SHA256 cryptographic vault references (`vault:v1:{id}:{hmac}:{expiry}`)
- Pluggable adapters: InMemoryVaultAdapter, AWSSecretsAdapter
- TTL enforcement, ACL-arbitrumd access control, rotation hooks

### Security
- PromptShield with 18 rules (jailbreak, exfiltration, base64, tool abuse, injection)
- AuditLogger with SHA-256 hash chain verification
- Ed25519 signing for audit entries
- PersistedAuditLogger (append-only JSONL + chain root tracking)

### Adapters
- Real SDK integrations: Chroma, Pinecone, Qdrant, Weaviate, LanceDB, Milvus
- Auto-sanitization of documents before vector DB upsert

### Frameworks
- LangChain Runnable wrapper (`withKeySpot`)
- Anthropic SDK wrapper (`wrapAnthropic`)
- OpenAI SDK wrapper (`wrapOpenAI`)
- OpenClaw agent wrapper
- Hermes agent wrapper

### Server (self-hosted, Docker only)
- Express server with Helmet, CORS, rate limiting
- Zod input validation
- Prometheus metrics endpoint (`/metrics`)
- OpenTelemetry-style tracing
- Built-in x402 payment gateway

### CLI & DevOps
- `keyspot scan` (recursive directory scanner)
- `keyspot scan --git` (pre-commit mode)
- `keyspot scan --prune` (auto-redact)
- `keyspot install` (pre-commit hook)
- GitHub Actions CI (Node 18/20/22)

### Python SDK
- Full parity with TypeScript: Scanner, TaintEngine, Vault, PromptShield, AuditLogger, KeySpot
- 20 pytest tests
- hatchling build configuration

### Compliance
- Ed25519 signing key generation
- Entry signing and verification
- File-arbitrumd append-only audit log
- Chain root computation for tamper detection
