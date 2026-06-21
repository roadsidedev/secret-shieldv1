# Migration Guide: v2.x → v0.0.5

> **Note:** The version has been rebased to `0.0.5` to reflect beta status.
> All v2.x published packages (up to v2.0.4) are part of the same codebase.
> This guide covers changes since the last published release (v2.0.3).

## Breaking Changes

### 1. Error Classes Replaced Plain `Error`

**Before:** `throw new Error('402 Payment Required')` — no structured error info.

**After:** `throw new PaymentRequiredError(...)` — has `.code`, `.statusCode`, `.retryable`, `.details`.

```typescript
// Old way (still works but deprecated):
try { await guard.checkpoint(state); } catch (err) { /* string matching */ }

// New way:
try { await guard.checkpoint(state); }
catch (err) {
  if (err instanceof KeySpotError) {
    console.log(err.code);       // "PAYMENT_REQUIRED"
    console.log(err.statusCode); // 402
    console.log(err.retryable);  // false
  }
}
```

**Full error hierarchy:** `KeySpotError` → `VaultError | WorkerError | AuthError | PaymentRequiredError | ScanError | ConfigurationError | ValidationError`

### 2. `AuditLogger.clear()` Disabled in Production

**Before:** `clear()` always works, allowing the audit chain to be wiped silently.

**After:** `clear()` throws `Error` when `NODE_ENV=production`. Use only in tests.

```typescript
// Test code only:
if (process.env.NODE_ENV !== 'production') {
  logger.clear();
}
```

### 3. `setAccessToken()` Expires At Default Changed

**Before:** `setAccessToken(token)` with no `expiresAt` set `expiresAt = Infinity` (never expires).

**After:** Default maximum TTL is 24 hours. Explicitly pass `expiresAt` for shorter tokens.

```typescript
// Old behavior (24h max):
guard.setAccessToken('my-token');

// Short-lived token:
guard.setAccessToken('ephemeral-token', Date.now() + 60_000);
```

### 4. CORS Requires Explicit Origin in Production

**Before:** `CORS_ORIGIN` defaulted to `'*'` (wildcard), which is invalid with `credentials: true`.

**After:** Production requires `CORS_ORIGIN` env var. Without it, cross-origin requests are blocked.

```bash
# Required for production deployments:
export CORS_ORIGIN="https://app.example.com,https://admin.example.com"
```

### 5. `console.*` Replaced by Structured Logger

**Before:** Ad-hoc `console.log`/`console.error` with inconsistent formatting.

**After:** Use `logger.info/warn/error/debug` from `@roadsidelab/keyspot-core/logger`.

```typescript
import { logger } from '@roadsidelab/keyspot-core/logger';

logger.info('Checkpoint completed', { durationMs: 45, status: 'ok' });
logger.error('Vault write failed', { vaultId: 'abc', error: err.message });
```

The logger auto-detects pino and falls back to timestamped console output.

### 6. `console.log` Removed from Core SDK

Server logs are now structured JSON. If you were parsing `[DB]`, `[Redis]`, `[x402]` prefixes, switch to querying the JSON `module` field.

---

## New Features

### Production Factory

```typescript
import { KeySpot, AWSSecretsAdapter } from '@roadsidelab/keyspot-sdk';

const guard = KeySpot.createSecure({
  vault: new AWSSecretsAdapter({ region: 'us-east-1' }),
  onSecretFound: async (match) => {
    await sendAlert(match);
  },
});
```

### Circuit Breaker

```typescript
import { CircuitBreaker } from '@roadsidelab/keyspot-sdk';
import { withCircuitBreaker } from '@roadsidelab/keyspot-vault/circuit-breaker-adapter';

const vault = withCircuitBreaker(new AWSSecretsAdapter({ region }), undefined, {
  threshold: 5,           // Open after 5 failures
  resetTimeoutMs: 30_000,  // Try again after 30s
});
```

### Health Probes

```
GET /livez   → { "status": "ok" }                    (liveness)
GET /readyz  → { "status": "ok", "checks": {...} }    (readiness)
```

### Ops Documentation

```
docs/ops/alert-runbook.md        — Incident response runbooks
docs/ops/deployment-checklist.md — Pre-flight checklist
docs/ops/monitoring-guide.md     — Prometheus/Grafana setup
```

---

## Deprecations

| Feature | Deprecated In | Replacement |
|---------|---------------|-------------|
| `new Error('402 ...')` | 0.0.5 | `new PaymentRequiredError(...)` |
| `console.log` in library code | 0.0.5 | `logger.info(...)` from `@roadsidelab/keyspot-core/logger` |
| `setAccessToken(tok)` w/o expiry | 0.0.5 | `setAccessToken(tok, expiresAt)` (24h max default) |
