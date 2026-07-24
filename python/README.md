# KeySpot Python SDK

**Status: experimental** — not full TypeScript parity. Do not use in production until the [parity gate](../docs/security/threat-model.md) and shared golden-vector suite pass.

Python port of the KeySpot runtime security layer for AI agents.

## Installation

```bash
pip install keyspot
```

## Quick Start

```python
import asyncio
from keyspot import KeySpot

async def main():
    guard = KeySpot(taint_enabled=True)

    # Scan and vault secrets
    clean = await guard.checkpoint({
        "message": "hello",
        "key": "sk-123456789012345678901234567890123456789012345678"
    })
    print(clean["key"])  # vault:v1:...

asyncio.run(main())
```

## Features

| Module | Description | Status |
|---|---|---|
| `Scanner` | Secret patterns, recursive scan | Partial vs TS |
| `TaintEngine` | Tag, propagate, untaint | Partial |
| `Vault` | InMemoryVaultAdapter, HMAC refs, TTL, ACLs | Hardening required |
| `PromptShield` | Regex heuristics | Subset of TS |
| `AuditLogger` | SHA-256 hash chain | Partial |
| `KeySpot` | checkpoint, scan, validate_prompt | Experimental |

## Testing

```bash
cd python
pip install pytest pytest-asyncio
pytest
```

## API

### KeySpot(config)
- `vault`: optional vault adapter
- `taint_enabled`: enable taint tracking (default: True)
- `prompt_shield_enabled`: enable PromptShield
- `on_secret_found`: async callback

### Methods
- `checkpoint(state)` — scan state and vault secrets
- `scan(data)` — scan without vaulting
- `validate_prompt(prompt)` — check for prompt injection

See the [TypeScript SDK](https://github.com/roadsidedev/secret-shieldv1) for full documentation.
