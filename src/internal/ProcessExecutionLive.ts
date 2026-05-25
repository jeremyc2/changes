import { Effect, Layer } from "effect";
import {
	ProcessExecution,
	ProcessExecutionError,
} from "../services/ProcessExecution.ts";

const runDetached = Effect.fnUntraced(function* (options: {
	readonly command: string;
	readonly args: ReadonlyArray<string>;
}) {
	yield* Effect.try({
		try: () => {
			Bun.spawn([options.command, ...options.args], {
				stdout: "ignore",
				stderr: "ignore",
				stdin: "ignore",
			});
		},
		catch: (cause) =>
			new ProcessExecutionError({
				message: `Failed to spawn ${options.command}`,
				cause,
			}),
	});
});

export const layer = Layer.succeed(
	ProcessExecution,
	ProcessExecution.of({ spawnDetached: runDetached }),
);
