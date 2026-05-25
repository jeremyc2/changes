# Reference — Effect service contracts

## Service file template

```typescript
import { Context, type Effect, Schema } from "effect";

export class MyOperationError extends Schema.TaggedErrorClass<MyOperationError>()(
  "MyOperationError",
  { message: Schema.String },
) {}

/**
 * [One sentence: what seam this replaces or owns.]
 */
export class MyService extends Context.Service<
  MyService,
  {
    readonly run: (input: string) => Effect.Effect<{ readonly ok: true }, MyOperationError>;
  }
>()("my-app/services/MyService") {}

export type MyServiceService = MyService["Service"];
```

Naming: tag string should be stable and namespaced (`my-app/services/...`).

## Mock layer stub pattern

```typescript
import { Effect, Layer } from "effect";
import { MyService } from "../../src/services/MyService.ts";

const noop = Effect.sync(() => {});

export const contractLayer = Layer.mergeAll(
  Layer.succeed(
    MyService,
    MyService.of({
      run: () => Effect.succeed({ ok: true as const }),
    }),
  ),
  // ... one Layer.succeed per service in this suite
);
```

Use `Effect.sync(() => undefined)` for optional returns when `Effect.succeed(undefined)` trips `effectSucceedWithVoid`.

## Workflow template

```typescript
import { Effect } from "effect";
import { MyService } from "../../src/services/MyService.ts";

/** User flow: [describe the entry point, e.g. "POST /orders"]. */
export const createOrderWorkflow = Effect.fnUntraced(function* (input: { readonly sku: string }) {
  return yield* MyService.use((svc) => svc.run(input.sku));
});
```

Workflows belong in `test/contract/workflows.ts` (or per-domain files). They are **not** production command modules — they document intended composition.

## Contract test with `layer()`

Prefer the **`layer()` export from `@effect/vitest`** (see `node_modules/@effect/vitest/dist/index.d.ts`). Do not rely on the effect-smol vitest README alone — it may not document `layer()` yet.

```typescript
import { assert, it, layer } from "@effect/vitest";
import { Effect } from "effect";
import { contractLayer } from "./contract/mock-layer.ts";
import { createOrderWorkflow } from "./contract/workflows.ts";

layer(contractLayer)("Orders contract", (it) => {
  it.effect("create order chains MyService", () =>
    Effect.gen(function* () {
      const result = yield* createOrderWorkflow({ sku: "ABC" });
      assert.deepStrictEqual(result, { ok: true });
    }),
  );
});
```

Why not `Effect.provide(contractLayer)` in each test?

- `@effect/vitest` **`layer()`** builds the layer once, manages scope lifetime, and provides context inside the runner — the test file stays an entry point without mid-file `Effect.provide` calls
- With **`strictEffectProvide: error`**, user-written `Effect.provide(Layer)` in test bodies is flagged; `layer()` is the supported pattern

## Vitest config (minimal)

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    exclude: ["reference_repositories/**", "node_modules/**"],
  },
});
```

Package scripts: `"test": "vitest run"`, devDependency on `vitest` and `@effect/vitest` aligned with `effect` beta version.

## What to cover in contract tests

Focus on **primary user flows** (CLI subcommands, HTTP routes, job types) — not every method on every service.

| Include | Skip |
| --- | --- |
| Happy-path composition for each major flow | Exhaustive per-method smoke tests |
| Important flags/options on the flow input type | Internal services only used inside a future Layer |
| Assert stub-shaped outcomes where it locks the contract | Behavioural correctness (belongs in Layer tests later) |

## Relation to improve-codebase-architecture

| Phase | Skill |
| --- | --- |
| Discover seams, depth, deletion test | improve-codebase-architecture |
| Write interfaces + contract tests | **effect-service-contracts** (this skill) |
| Implement Layers + entry-point wiring | User-driven follow-up (not this skill) |

## effect-smol patterns to follow

From `reference_repositories/effect-smol/.patterns/effect.md`:

- `Context.Service` class syntax
- `Effect.fnUntraced` for reusable effect functions
- `return yield*` for terminal effects in generators
- No `async`/`await`, no `try`/`catch` in `Effect.gen`

From `.patterns/testing.md`:

- `it.effect` for Effect programs; `assert` from `@effect/vitest`, not Vitest `expect`
- No `Effect.runSync` in tests
