# KeySpot Threat Model

**Status:** Authoritative  
**Version:** 1.0  
**Last updated:** 2026-07-18

This document states what KeySpot **does** and **does not** guarantee. Marketing and API docs must not contradict it.

---

## 1. Assets

| Asset | Description |
|-------|-------------|
| Agent state secrets | API keys, cloud credentials, private keys, DB URLs in memory/state |
| Vault master HMAC key | Signs `vault:v1:` reference tokens |
| Vault-stored secret values | Plaintext or encrypted payloads in vault adapters |
| Audit chain | Hash-chained event log (optional Ed25519 signatures) |
| Hosted API credentials | JWT, API keys, Stripe/x402 payment config |

---

## 2. Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
|  UNTRUSTED: LLM output, tool results, user prompts, files   |
└───────────────────────────┬─────────────────────────────────┘
                            │ scan / checkpoint
┌───────────────────────────▼─────────────────────────────────┐
|  KEYSPOT PROCESS (Node or Python)                           |
|  Scanner · Taint · PromptShield · Vault adapter · Audit     |
|  Trust: OS process isolation only                           |
└───────────────────────────┬─────────────────────────────────┘
                            │ network (optional)
┌───────────────────────────▼─────────────────────────────────┐
|  EXTERNAL: AWS SM, Postgres, Redis, Stripe, x402 facilitator│
└─────────────────────────────────────────────────────────────┘
```

**Assumption:** An attacker who can read process memory, attach a debugger, or take a heap/core dump of the KeySpot (or agent) process can recover secrets that have not yet been cleared and any material still resident in the language runtime heap.

---

## 3. What KeySpot Guarantees (when correctly configured)

1. **Detection:** Pattern-based scanning finds many common secret shapes in structured agent state and text.
2. **Replacement:** `checkpoint()` replaces detected secrets in object trees with HMAC-signed vault references (when vault write succeeds).
3. **Fail-closed vault write (TS):** If vault write fails during checkpoint, the operation errors rather than returning state that still contains the secret under a “success” path (see implementation).
4. **Audit intent:** Security-relevant events can be recorded in a hash chain (durable only if a persisted logger is configured).
5. **Explicit wrappers:** Framework integrations use explicit client wrappers — not global `fetch` monkey-patches.

---

## 4. What KeySpot Does Not Guarantee

| Claim | Reality |
|-------|---------|
| “Secrets never exist in memory” | False. Secrets are briefly held as JS/Python strings/buffers during scan and vault write. Language runtimes do not zeroize immutable strings. |
| “Vault = HSM / enclave” | False. Default in-memory vault is a process-local map. AWS adapter stores values in Secrets Manager subject to IAM. |
| “Blockchain anchoring is on-chain” | **False today.** `anchorToArbitrum()` records a **block timestamp snapshot** locally; it does **not** submit a transaction. Treat as wall-clock correlation only until a real anchoring contract ships. |
| “Python = full TS parity” | **False until parity gate.** Python is **experimental** until the shared golden-vector suite and native core path pass. |
| “Framework wrappers sanitize everything” | Wrappers primarily sanitize **model outputs**. Inputs and tool results require explicit checkpointing until dual-side wrapping is complete. |
| “createSecure = production secure” | `createSecure` enables safer defaults (persistent vault required, taint, prompt shield, telemetry). Full **production-secure** posture additionally requires the **native sealed-memory core**, authenticated server surfaces, and ops controls in the deployment checklist. |
| “PromptShield stops all jailbreaks” | Soft regex signal only. Bypassable. Not a sole control. |
| “Remote pattern updates are trusted” | Unsigned remote regex feeds are a supply-chain risk; pin/sign or disable in production. |

---

## 5. Adversary Model

| Persona | Capabilities | Mitigations in scope |
|---------|--------------|----------------------|
| Malicious LLM / tool output | Inject secrets or jailbreak text into state | Scan, taint, prompt shield (limited) |
| Compromised MCP/CLI consumer | Reads tool/CLI output | Must never receive `rawValue` by default |
| Stolen refresh JWT / API key | Calls hosted API | AuthZ, scopes, rotation, short access TTL |
| Misconfigured deploy | Empty Stripe prices, open MCP, InMemory in prod | Fail-closed config, createSecure checks |
| Process memory attacker | Heap dump, debugger | Native sealed buffers (Phase 7); residual risk without |
| Supply-chain attacker | Malicious dependency or pattern URL | Lockfiles, CI audit, signed patterns |

---

## 6. STRIDE Summary (SDK core)

| Threat | Status |
|--------|--------|
| Spoofing vault refs | HMAC under vault `secretKey`; must use constant-time verify |
| Tampering audit log | Hash chain; durable only if persisted |
| Repudiation | Incomplete without persisted signed audit |
| Information disclosure | Primary risk: re-emitting `rawValue`, logs, redaction tails |
| Denial of service | ReDoS patterns, unbounded taint map, unauth MCP |
| Elevation of privilege | Hosted: scopes, tiers, migration ownership |

---

## 7. Secure Configuration Baseline

Minimum for any non-dev deployment:

1. Persistent vault (`AWSSecretsAdapter` or equivalent) — **not** `InMemoryVaultAdapter`
2. `KeySpot.createSecure({ vault })` (or equivalent after native requirement)
3. Never log `Match.rawValue` or full match objects
4. MCP/CLI/HTTP APIs authenticated; no public scan endpoints
5. `NODE_ENV=production`, strong `JWT_SECRET`, Stripe webhook secret if billing enabled
6. Facilitator / pattern update URLs allowlisted
7. Native `@keyspot/native` (or successor) loaded for production-secure claim
8. Python only after parity gate documentation is green

---

## 8. Residual Risk Statement (Phase 7 status)

KeySpot reduces the chance that secrets **persist in agent state, vector stores, and casual logs**. It does **not** make the agent process a secure enclave. Compromise of the host or process remains catastrophic for any secret that entered that process.

**Phase 7 delivered:** The `@keyspot/native` Rust crate provides:
- Constant-time HMAC-SHA256 verify (no JS `===` vulnerability)
- `SecretBuffer` — sealed byte buffer zeroized on drop
- `zeroizeBuffer()` — explicit overwrite for V8 `Buffer`
- Fast-path regex scanning via native `regex` crate

**Without the native addon** (pure-JS fallback):
- JS string immutability means secrets remain in the V8 heap until garbage collected
- Node `crypto.timingSafeEqual` is used for HMAC verify (adequate, but no zeroize guarantee)

**Users who require hardware-backed secrecy** must combine KeySpot with HSM/KMS, short-lived credentials, least-privilege IAM, and enable the native sealed-memory path:
```bash
# Verify native is present in production
node -e "require('@roadsidelab/keyspot-native').isNativeAvailable()" || echo "Native not loaded — see threat model"

---

## 9. Document Control

- Security changes that alter guarantees must update this file in the same PR.
- “Production secure” language in README/marketing requires Phase 7 native gate + this model’s baseline checklist.
