# Production Deployment Checklist

## Pre-Flight

### Environment Variables
- [ ] `JWT_SECRET` — set to a cryptographically random 256-bit value
- [ ] `DATABASE_URL` — PostgreSQL connection string with SSL
- [ ] `CORS_ORIGIN` — comma-separated list of allowed origins (never `*` with credentials)
- [ ] `NODE_ENV=production`
- [ ] `LOG_LEVEL` — set to `info` in production (use `debug` only for troubleshooting)
- [ ] `REDIS_URL` — optional, enables rate limiting and caching
- [ ] If x402 enabled: `ENABLE_X402=true`, `PAY_TO_ADDRESS`, `X402_FACILITATOR_URL`
- [ ] If Stripe enabled: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

### Database
- [ ] Run `pnpm --filter @roadsidelab/keyspot-server db:migrate`
- [ ] Verify migrations applied: `pnpm --filter @roadsidelab/keyspot-server db:status`
- [ ] Database user has only the permissions required (no DDL in production)

### Network
- [ ] TLS termination configured at reverse proxy (nginx, Caddy, Cloudflare)
- [ ] Rate limiting configured at reverse proxy (optional, app has built-in limits)
- [ ] Firewall allows only: 443 (HTTPS), optionally 9090 (metrics, internal)
- [ ] Egress allowlist for vault/KMS, Stripe, and `X402_FACILITATOR_URL` hosts only
- [ ] Pattern registry remote updates disabled or pinned/signed

### Secrets & vault
- [ ] Persistent vault adapter (not `InMemoryVaultAdapter`)
- [ ] Vault HMAC / encryption keys from secrets manager — not committed
- [ ] Secret rotation procedure documented (API keys, JWT_SECRET, vault key)
- [ ] Incident response: vault key compromise playbook (revoke, rotate, re-issue refs)
- [ ] Native sealed-memory package installed and built (`@keyspot/native`) for production-secure deployments
- [ ] Verify native loaded: `node -e "require('@roadsidelab/keyspot-native').isNativeAvailable() && process.exit(0) || process.exit(1)"`

### Memory / host hardening (residual risk)
- [ ] Disable or encrypt swap on secret-handling hosts where feasible
- [ ] Restrict heap dump / diagnostic endpoints in production
- [ ] No debug tooling attached to production agent processes

### Monitoring
- [ ] Prometheus scrape target configured for `/metrics` endpoint
- [ ] API key created for Prometheus authentication (or network-restricted access)
- [ ] Grafana dashboard imported (see `monitoring-guide.md`)
- [ ] Alert rules configured in Prometheus/Alertmanager
- [ ] Alerts for auth failures, rate-limit hits, vault errors, MCP abuse

### Auth surfaces
- [ ] `/mcp/*` requires authentication
- [ ] Refresh tokens cannot be used as access tokens
- [ ] Stripe webhook secret set and non-empty when Stripe enabled
- [ ] CORS / billing success URLs restricted to known app origins

---

## Startup Verification

1. **Health check**: `curl https://your-host/health` → `{"status":"ok","mode":"self-hosted"}`
2. **Readiness check**: `curl https://your-host/readyz` → `{"status":"ok","checks":{...}}`
3. **Scan a known secret**: `curl -X POST https://your-host/checkpoint -H 'Content-Type: application/json' -d '{"state":{"key":"sk-test123"}}'`
4. **Verify vaulting**: The response should contain a vault reference, not the raw key
5. **Check authentication**: `curl -I https://your-host/metrics` → 401 (requires auth)

---

## Shutdown Procedure

1. Drain connections: remove the instance from the load balancer
2. Allow in-flight requests to complete (up to 30s)
3. Send `SIGTERM` — KeySpot handles graceful shutdown (disconnects DB, Redis)
4. Verify process exited cleanly in logs
5. If running in Kubernetes, the `preStop` hook handles this automatically

---

## Rollback Procedure

### Database Rollback
1. Identify the migration to roll back: `SELECT * FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;`
2. Run `npx prisma migrate resolve --rolled-back "<migration-name>"`
3. If the rollback involves data loss, restore from backup first

### Application Rollback
1. Deploy the previous Docker image tag (CI publishes tags on every merge)
2. Verify connectivity: run the startup verification steps
3. If the previous DB migration is incompatible, restore DB from backup first

### Backup Restoration
1. Stop the KeySpot server
2. Restore PostgreSQL: `pg_restore -d keyspot_prod /backup/keyspot_$(date -I).dump`
3. Restart KeySpot server
4. Verify: run startup checks
