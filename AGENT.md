# KeySpot SDK — Agent Development Guidelines

## Core Philosophy

Three principles govern every line of code written for KeySpot:

1. **Clean Code** — code is clean if it can be read and enhanced by someone other than its author
2. **Test-Driven Development** — no production code without a failing test first
3. **First-Principles Understanding** — build from scratch before reaching for a library; understand the abstraction before depending on it

---

## 1. Clean Code (Uncle Bob)

### Naming
- Use intention-revealing names: `elapsedTimeInDays` not `d`, `cachedSecrets` not `data`
- Class names are nouns (`SecretScanner`, `VaultStore`), method names are verbs (`scanState`, `vaultCredential`)
- Avoid disinformation: not `secretList` if it's a `Map`
- Make meaningful distinctions: not `SecretInfo` vs `SecretData`

### Functions
- **Small**: shorter than you think — aim for under 20 lines
- **One thing**: a function does exactly one thing, with no side effects
- **One level of abstraction**: don't mix scanning logic with low-level I/O details
- **Few arguments**: 0 ideal, 1-2 okay, 3+ needs strong justification
- **Descriptive names**: `isApiKey` not `check`

### Comments
- Don't comment bad code — rewrite it
- Explain yourself in code, not in comments
- If a comment describes *what* the code does, the code is not clean
- The only good comments are legal notices, TODOs with a ticket, or clarifications of non-obvious external library behavior

### Error Handling
- Use exceptions (or `Result` types), not return codes
- Don't return null / undefined — it forces every caller to check
- Don't pass null / undefined

### Formatting
- **Newspaper metaphor**: high-level concepts at the top, details at the bottom
- Variables declared near their usage
- Vertical density: related code lives close together

---

## 2. Test-Driven Development

### The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over.

### RED-GREEN-REFACTOR

1. **RED** — Write a minimal failing test for one behavior. Clear name, tests real code (not mocks).
2. **Verify RED** — Watch it fail. Confirm the failure message is expected and the reason is "feature missing", not a typo.
3. **GREEN** — Write the simplest possible code to pass the test. No extra features, no over-engineering.
4. **Verify GREEN** — Confirm the test passes and all other tests stay green.
5. **REFACTOR** — Clean up: remove duplication, improve names, extract helpers. Keep tests green. No new behavior.

### Testing Anti-Patterns (MANDATORY)

- **Never test mock behavior** — you're verifying the mock works, not that your code works
- **Never add test-only methods to production classes** — put them in test utilities
- **Never mock without understanding the dependency** — run the test against real code first, then mock minimally
- **Never use incomplete mocks** — mirror the real API structure completely
- **Tests are not optional follow-up** — they are part of implementation. Can't claim "done" without tests

### Key Rules

| Principle | Rule |
|-----------|-------|
| Test behavior, not implementation | Tests should still pass after refactoring |
| One behavior per test | If "and" is in the test name, split it |
| Mocks are tools to isolate | Not things to test |
| If test setup is complex | The design is too coupled — use dependency injection |
| Tests must be FAST | If a test is slow, question what it tests |

### Error Edge Cases

- **Heuristic**: if you can name an edge case scenario, write a test for it
- **Network failures**: every call to an external API should have a test for timeout, 4xx, 5xx
- **State transitions**: every possible state machine transition should have a test
- **Empty / null / boundary**: empty arrays, zero values, boundary conditions

---

## 3. First-Principles Development (Karpathy)

### Build From Scratch, Then Use the Library

Before adding any npm package or library, ask:
- Can I write this in 50 lines of vanilla code?
- Do I understand what the library does under the hood?
- Is the library complexity justified by the problem?

Rule of thumb: if a utility is <50 lines and only used in one module, write it. If it's complex (crypto, serialization, protocol interaction), reach for a battle-tested library.

### Start Simple

Always start with the simplest possible version:
1. Hardcode the data flow first, then generalize
2. Overfit a single secret pattern before building the scanner abstraction
3. Get one checkpoint lifecycle working end-to-end before building the multi-provider vault

### "English is the New Programming Language"

- Test names and function names should read like clear English sentences
- `scanForApiKeys(state, patterns)` needs no comment — it says what it does
- If you can't describe the function's purpose in one plain-English sentence, the function is doing too much

### Data Over Magic

- When something is wrong, log the data, inspect the shapes, read the error message carefully
- Data bugs are more common than logic bugs — verify your inputs before debugging your code
- A type error (wrong field name, wrong secret format) is almost always the root cause

---

## 4. Project-Specific Conventions

### Monorepo Structure

```
packages/
  @keyspot/
    core/         Core scanning engine, pattern definitions, confidence scoring
    vault/        Secret storage backends (memory, file, cloud)
    server/       API server for remote checkpoint coordination
    cli/          Command-line interface for local scanning
    adapters/     Framework adapters (LangChain, Vercel AI SDK, etc.)
    frameworks/   High-level abstraction layer for agent runtime integration
    patterns/     Community-contributed secret detection patterns
  keyspot-sdk/    Public-facing unified SDK package (re-exports from @keyspot/*)
  keyspot-agent/  Standalone agent runtime integration binary
python/           Python SDK (mirrors core functionality for Python agents)
keyspot-sdk/
  apps/           Example applications and integration demos
  packages/       Additional utility packages
  python/         Python-specific extensions
```

### TypeScript Style

- Strict mode. No `any` without explicit justification and a comment
- Every external API response gets a Zod schema — parse, don't trust
- `Result<T, E>` pattern for fallible operations instead of try/catch at every call site
- Pattern definitions are plain objects, not classes — data over abstraction

### Data Flow

```
Agent State → KeySpot.checkpoint()
  ├── Scan: 40+ regex patterns + contextual confidence scoring
  ├── Vault: store secret → HMAC-signed reference token
  ├── Taint: tag derived values for cascading detection
  └── Replace: swap secret for vault reference
         ↓
    Clean State (safe for memory, logs, tool returns)
```

Data flows in one direction. The scanner never writes to external storage. The vault never inspects values. Each layer has one responsibility.

### Vault Abstraction

- Every vault backend implements the same `VaultStore` interface
- Storage backends: `MemoryVault` (testing), `FileVault` (local dev), `CloudVault` (production)
- Reference tokens are opaque strings — no encoding business logic into the reference format
- Transaction states: `idle | vaulting | vaulted | failed`

### What NOT to Do

- Don't add abstractions before there are at least 3 concrete implementations
- Don't write a "utils" function that's only used once — inline it
- Don't mock entire services — mock at the vault boundary
- Don't leave TODOs without a ticket reference
- Don't commit commented-out code
- Don't make a test pass without watching it fail first
- Don't scan for secrets without a confidence threshold — every match needs a cost
