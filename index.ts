import { runMain } from "@effect/platform-bun/BunRuntime";
import { Effect } from "effect";
import { runCli } from "./src/cli/commands.ts";
import { appLayer } from "./src/layers/index.ts";

// @effect-diagnostics-next-line strictEffectProvide:off - Effect docs say we can safely disable this diagnostic at application entry points
runMain(runCli.pipe(Effect.provide(appLayer)));
