import { Context, type Effect, Schema } from "effect";

export class ProcessExecutionError extends Schema.TaggedErrorClass<ProcessExecutionError>()(
	"ProcessExecutionError",
	{
		message: Schema.String,
		cause: Schema.optional(Schema.Defect),
	},
) {}

/**
 * Spawns external processes (e.g. opening an editor for `--open`).
 */
export class ProcessExecution extends Context.Service<
	ProcessExecution,
	{
		readonly spawnDetached: (options: {
			readonly command: string;
			readonly args: ReadonlyArray<string>;
		}) => Effect.Effect<void, ProcessExecutionError>;
	}
>()("changes/services/ProcessExecution") {}

export type ProcessExecutionService = ProcessExecution["Service"];
