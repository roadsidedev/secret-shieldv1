# Monitoring Guide

## Prometheus Scrape Configuration

The `/metrics` endpoint requires authentication. Configure Prometheus with either a static API key or use network-level access control.

```yaml
scrape_configs:
  - job_name: 'keyspot'
    scheme: https
    static_configs:
      - targets: ['keyspot.example.com:443']
    authorization:
      credentials: 'ks_<your-metrics-api-key>'
    metrics_path: /metrics
    scrape_interval: 15s
    scrape_timeout: 10s
```

If using network-level access control instead:

```yaml
scrape_configs:
  - job_name: 'keyspot'
    scheme: https
    static_configs:
      - targets: ['10.0.1.50:3000']
    metrics_path: /metrics
    scrape_interval: 15s
```

---

## Key Metrics Reference

### Counters

| Metric | Labels | What it measures |
|--------|--------|------------------|
| `keyspot_checkpoint_total` | `status` | Total checkpoint calls by status |
| `keyspot_scan_total` | `status` | Total scan calls by status |
| `keyspot_secrets_found_total` | `type` | Secrets detected, labeled by secret type |
| `keyspot_vault_writes_total` | — | Total vault write operations |
| `keyspot_prompt_validation_total` | `blocked` | Prompt validation calls |

### Histograms

| Metric | Buckets | What it measures |
|--------|---------|------------------|
| `keyspot_checkpoint_duration_ms` | 5,10,25,50,100,250,500,1000,2500,5000 | Checkpoint latency (ms) |
| `keyspot_http_request_duration_ms` | 5,10,25,50,100,250,500,1000,2500,5000 | HTTP request latency (ms) |

### Gauges

| Metric | What it measures |
|--------|------------------|
| `keyspot_active_requests` | Currently in-flight checkpoint/scans |
| `keyspot_vault_connected` | 1=connected, 0=disconnected/circuit-open |
| `keyspot_worker_pool_depth` | Number of queued worker jobs |

---

## Grafana Dashboard

Create a new Grafana dashboard with the following panels:

### Panel 1: Checkpoint Rate
```promql
rate(keyspot_checkpoint_total[1m])
```
Type: Stat, Unit: ops/s

### Panel 2: Secrets Found by Type
```promql
sum by (type) (rate(keyspot_secrets_found_total[5m]))
```
Type: Bar gauge

### Panel 3: Checkpoint Latency (P50/P95/P99)
```promql
histogram_quantile(0.50, rate(keyspot_checkpoint_duration_ms_bucket[5m]))
histogram_quantile(0.95, rate(keyspot_checkpoint_duration_ms_bucket[5m]))
histogram_quantile(0.99, rate(keyspot_checkpoint_duration_ms_bucket[5m]))
```
Type: Time series

### Panel 4: Vault Health
```promql
keyspot_vault_connected
```
Type: Stat, thresholds: 1=green, 0=red

### Panel 5: Error Rate
```promql
rate(keyspot_checkpoint_total{status="error"}[5m]) / rate(keyspot_checkpoint_total[5m])
```
Type: Time series, unit: ratio (0-1)

### Panel 6: Worker Pool Depth
```promql
keyspot_worker_pool_depth
```
Type: Stat

---

## Prometheus Alert Rules

Save as `keyspot-alerts.yml`:

```yaml
groups:
  - name: keyspot
    rules:
      - alert: SecretsDetected
        expr: rate(keyspot_secrets_found_total[1m]) > 10
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "High rate of secrets detected"
          description: "{{ $value }} secrets/min detected in the last minute"

      - alert: VaultDisconnected
        expr: keyspot_vault_connected == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Vault backend disconnected"
          description: "Vault writes are failing. Circuit breaker may be open."

      - alert: HighCheckpointLatency
        expr: histogram_quantile(0.99, rate(keyspot_checkpoint_duration_ms_bucket[5m])) > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High checkpoint latency (P99 > 1s)"

      - alert: CheckpointErrors
        expr: rate(keyspot_checkpoint_total{status="error"}[5m]) > 1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Checkpoint errors detected"
          description: "{{ $value }} errors/min in the last 5 minutes"

      - alert: WorkerPoolBacklog
        expr: keyspot_worker_pool_depth > 50
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Worker pool queue depth > 50"
```

---

## Service Level Objectives

| Indicator | Target | Measurement |
|-----------|--------|-------------|
| Checkpoint success rate | ≥ 99.5% | `rate(checkpoint_total{status="ok"}) / rate(checkpoint_total)` |
| Checkpoint latency (P99) | ≤ 1000ms | `histogram_quantile(0.99, checkpoint_duration_ms_bucket)` |
| Vault availability | ≥ 99.9% | `avg_over_time(vault_connected[30d])` |
| Secret detection latency | ≤ 500ms | `histogram_quantile(0.95, checkpoint_duration_ms_bucket)` |
