---
name: effect-service-contracts
description: Scaffolds Effect V4 Context.Service interfaces and contract tests (mock layer + user-flow workflows) without implementations or live Layers in src. Use when the user wants to scaffold Effect services for an app, define service seams, lock down interfaces before layers, or add contract tests with @effect/vitest and Bun.
---

# Effect V4 Service Interfaces + Contract Testing

Define **interfaces only** — then prove main **user flows** compose at the type level with heavily mocked services. Implementations and live Layers come later.

## Prerequisites

- **Effect V4** (`effect` beta), **Bun**, **Vitest**, **`@effect/vitest`**
- **`reference_repositories/effect-smol`** submodule (or equivalent) for patterns — read `.patterns/effect.md` and `.patterns/testing.md` before writing code
- For seam discovery and depth vocabulary, read [improve-codebase-architecture](../improve-codebase-architecture/SKILL.md) first when the app shape is unclear

## Scope

| Do | Don't |
| --- | --- |
| `Context.Service` interface per file under `src/services/` | Live adapters under `src/internal/` or `*-live.ts` |
| Shared domain types under `src/domain/` | `Layer.effect` / production wiring in `src/` |
| Contract workflows chaining services (future commands) | Real behaviour in mocks — stubs only |
| Mock `Layer.mergeAll` + `Layer.succeed` in **test** only | Thin wrappers around `Effect.provide`, `Layer.build`, etc. |
| `@effect/vitest` **`layer()`** to provide the mock layer | `Effect.provide(layer)` inside test files (`strictEffectProvide`) |

**The interface is the test surface.** Contract tests validate that user flows chain without the typechecker complaining — not that logic is correct.

## Process

### 1. Map seams

Explore the app (existing code, reference repos, user flows). For each external concern (I/O, prompts, parsing, third-party APIs), apply the **deletion test** from improve-codebase-architecture: would deleting a pass-through module scatter complexity?

### 2. Define interfaces

- **One service per file** — `src/services/MyService.ts`
- Class syntax: `extends Context.Service<...>()("unique/tag") {}`
- Export `MyServiceService = MyService["Service"]` when useful
- Tagged errors via `Schema.TaggedErrorClass` where the interface fails
- Domain types live in `src/domain/`, not on the service file unless tiny and private

See [REFERENCE.md](REFERENCE.md) for templates.

### 3. Contract test layout

```
test/
├── contract/
│   ├── fixtures.ts      # stub domain values
│   ├── mock-layer.ts    # Layer.mergeAll of Layer.succeed stubs
│   └── workflows.ts     # user-flow effects (Effect.fnUntraced)
└── <app>-contracts.test.ts
```

- **Mock layer**: only services that appear in user-flow workflows — omit internal seams (parsers, slug generators, etc.) until a Layer wraps them
- **Workflows**: mirror how CLI/API entry points will compose services; use `Service.use`, not direct imports of future implementations
- **Tests**: wrap with `layer(mockLayer)("suite name", (it) => { it.effect(...) })` — read `@effect/vitest` package JSDoc for `layer()` (the submodule README may be stale)

### 4. Verify

```sh
bun run test
bun run typecheck   # keep strictEffectProvide: error — layer() satisfies it
```

## Anti-patterns

- Implementing “just one service” during the interface phase — that is a Layer; defer it
- Contract tests that assert real domain behaviour — assert composition outcomes (types compile, stubs return expected empty shapes)
- One giant mock layer file without workflow grouping — split fixtures / mock-layer / workflows