# Changelog

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
- TTL enforcement, ACL-based access control, rotation hooks

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
- File-based append-only audit log
- Chain root computation for tamper detection
