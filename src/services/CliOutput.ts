import { Context, type Effect } from "effect";

/**
 * Structured command output (info, warn, error, success).
 *
 * Replaces upstream logging.
 */
export class CliOutput extends Context.Service<
	CliOutput,
	{
		readonly info: (message: string) => Effect.Effect<void>;
		readonly warn: (message: string) => Effect.Effect<void>;
		readonly error: (message: string) => Effect.Effect<void>;
		readonly log: (message: string) => Effect.Effect<void>;
		readonly success: (message: string) => Effect.Effect<void>;
	}
>()("changes/services/CliOutput") {}

export type CliOutputService = CliOutput["Service"];
