# Operational Runbooks

## Runbook 1: Secret Detected

**Trigger:** `keyspot_secrets_found_total` rate exceeds threshold (default 10/min)
**Severity:** P1 (critical) for high/critical secrets; P3 for low-severity matches

### Triage (0–2 min)
1. Identify the secret type and path from the alert labels: `type`, `path`
2. Check if this is a known false positive — review `guard.getAuditLogger().getEntries()` for pattern context
3. Determine the source: AI agent output, config file, log dump, or user input

### Containment (2–5 min)
1. If the secret is a **live credential**: rotate it immediately
   - AWS: `aws secretsmanager rotate-secret --secret-id <id>`
   - GitHub: revoke token in GitHub Settings → Developer settings
   - Stripe: roll key in Stripe Dashboard → Developers → API keys
2. If the secret is in an AI agent's memory/state: clear the agent's context
3. If the secret was exposed in logs: redact the log output and investigate who accessed it

### Investigation (5–10 min)
1. Check `guard.getAuditLogger().getEntries()` for the sequence of events leading to exposure
2. Identify the code path that introduced the secret: was it a prompt injection, a tool output, or a configuration leak?
3. For prompt injection cases: add a `PromptShield` rule to block the pattern

### Resolution
1. Verify rotation: confirm that the old credential no longer works
2. Update secret detection patterns if the secret was of a previously unknown format
3. Document in the incident log: secret type, source, rotation status, and recommended prevention

---

## Runbook 2: Vault Down

**Trigger:** `keyspot_vault_writes_total` rate drops to 0 for 5+ minutes, or `VAULT_WRITE_FAILED` errors spike
**Severity:** P1 (system impairment — secrets cannot be vaulted)

### Triage (0–2 min)
1. Check the vault backend status:
   - **InMemoryVaultAdapter**: data lost on process restart; switch to persistent adapter
   - **AWSSecretsAdapter**: check AWS health dashboard, IAM permissions
   - **Azure Key Vault**: check Azure status, access policy
2. Check the circuit breaker state: `guard.getVault()` — if OPEN, all writes are fast-failing

### Containment (2–5 min)
1. If the circuit breaker is OPEN: wait for the reset timeout (default 30s) or manually reset
2. If the vault backend is unreachable:
   - Fall back to `PrunerStrategy.REDACT` to avoid throwing errors (requires config change)
   - OR: pause checkpoint processing until vault is restored
3. If using AWS: verify the IAM role has `secretsmanager:PutSecretValue` and `secretsmanager:CreateSecret`

### Recovery
1. Restore vault connection: check network ACLs, VPC endpoints, and authentication
2. Verify vault writes succeed: `await guard.getVault().write('test-connection')`
3. The circuit breaker will auto-recover: HALF_OPEN → CLOSED on first successful write
4. Resume normal checkpoint operations

### Post-Mortem
- Was it a transient network issue? Add retry logic or multi-region vault.
- Was it an IAM permission change? Add IAM change monitoring.
- Was it a circuit breaker nuisance trip? Adjust `threshold` or reset timeout.

---

## Runbook 3: High False Positive Rate

**Trigger:** Alert rate exceeds `maxFalsePositivesPerMinute` (default 5/min)
**Severity:** P3 (configuration issue — degrading trust in alerts)

### Triage
1. Identify the pattern(s) producing false positives: check alert labels for `type`
2. Review the matched strings: `guard.scan(suspectedInput)` to reproduce
3. Determine if it's a regex over-match (pattern too broad) or a benign value that looks like a secret

### Resolution Options

#### Option A: Adjust Pattern Severity
If the pattern is valid but low-risk:
```typescript
const registry = new PatternRegistry(builtInPatterns);
registry.unregister('overly_broad_pattern');
registry.register({ name: 'custom_pattern', regex: /tighter-regex/g, severity: 'low' });
```

#### Option B: Add Exclusion
If the false positive comes from a known benign source:
```typescript
// In your application layer, filter matches before handling
const matches = await guard.scan(input);
const filtered = matches.filter(m => !isKnownBenign(m.rawValue));
```

#### Option C: Tune the Pattern
If the regex is too broad, create a custom pattern with a stricter regex:
```typescript
const customBuiltIn = builtInPatterns.map(p =>
  p.name === 'overly_broad' ? { ...p, regex: /tighter-regex/g } : p
);
```

### Long-Term Fix
1. Add the false positive input to the test suite: `tests/patterns-edge.test.ts`
2. Ensure CI catches the regression
3. If the issue is with built-in patterns, submit a PR upstream

---

## Alert Threshold Reference

| Alert | Metric | Threshold | Severity |
|-------|--------|-----------|----------|
| Secrets Found | `rate(keyspot_secrets_found_total[1m])` | > 10 | P1 if critical, P3 otherwise |
| Vault Writes Dropped | `rate(keyspot_vault_writes_total[5m])` | == 0 | P1 |
| Checkpoint Errors | `rate(keyspot_checkpoint_total{status="error"}[1m])` | > 1 | P2 |
| High Latency | `histogram_quantile(0.99, keyspot_http_request_duration_ms_bucket)` | > 1000ms | P2 |
| Circuit Breaker Open | `keyspot_vault_connected` | == 0 | P1 |
| Worker Pool Depth | `keyspot_worker_pool_depth` | > 50 | P3 |
