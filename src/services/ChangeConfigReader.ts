import { Context, type Effect, Schema } from "effect";
import type { ChangeConfig } from "../domain/change-config.ts";
import type { WorkspaceRoot } from "../domain/workspace-package.ts";

export class ChangeConfigReadError extends Schema.TaggedErrorClass<ChangeConfigReadError>()(
	"ChangeConfigReadError",
	{ message: Schema.String },
) {}

/**
 * Loads and validates `.changes/config.json`.
 *
 * Replaces upstream config loading.
 */
export class ChangeConfigReader extends Context.Service<
	ChangeConfigReader,
	{
		readonly read: (
			rootDir: string,
			workspace: WorkspaceRoot,
		) => Effect.Effect<ChangeConfig, ChangeConfigReadError>;
	}
>()("changes/services/ChangeConfigReader") {}

export type ChangeConfigReaderService = ChangeConfigReader["Service"];
