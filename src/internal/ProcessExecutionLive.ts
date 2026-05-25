import { Effect, Layer } from "effect";
import {
	ProcessExecution,
	ProcessExecutionError,
	type ProcessResult,
} from "../services/ProcessExecution.ts";

const runProcess = Effect.fnUntraced(function* (options: {
	readonly command: string;
	readonly args: ReadonlyArray<string>;
	readonly cwd: string;
}) {
	return yield* Effect.tryPromise({
		try: (): Promise<ProcessResult> => {
			const process = Bun.spawn([options.command, ...options.args], {
				cwd: options.cwd,
				stdout: "pipe",
				stderr: "pipe",
			});
			return Promise.all([
				process.exited,
				new Response(process.stdout).text(),
				new Response(process.stderr).text(),
			]).then(([code, stdout, stderr]) => ({ code, stdout, stderr }));
		},
		catch: (cause) =>
			new ProcessExecutionError({
				message: `Failed to run ${options.command}`,
				cause,
			}),
	});
});

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
	ProcessExecution.of({ run: runProcess, spawnDetached: runDetached }),
);
