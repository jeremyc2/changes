import { Context, type Effect, Schema } from "effect";

export class ProcessExecutionError extends Schema.TaggedErrorClass<ProcessExecutionError>()(
	"ProcessExecutionError",
	{
		message: Schema.String,
		cause: Schema.optional(Schema.Defect),
	},
) {}

export type ProcessResult = {
	readonly code: number;
	readonly stdout: string;
	readonly stderr: string;
};

/**
 * Spawns external processes (e.g. opening an editor for `--open`).
 */
export class ProcessExecution extends Context.Service<
	ProcessExecution,
	{
		readonly run: (options: {
			readonly command: string;
			readonly args: ReadonlyArray<string>;
			readonly cwd: string;
		}) => Effect.Effect<ProcessResult, ProcessExecutionError>;
		readonly spawnDetached: (options: {
			readonly command: string;
			readonly args: ReadonlyArray<string>;
		}) => Effect.Effect<void, ProcessExecutionError>;
	}
>()("changes/services/ProcessExecution") {}

export type ProcessExecutionService = ProcessExecution["Service"];
