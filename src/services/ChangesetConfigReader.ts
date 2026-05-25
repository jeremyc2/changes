import { Context, type Effect, Schema } from "effect";
import type { ChangesetConfig } from "../domain/changeset-config.ts";
import type { WorkspaceRoot } from "../domain/workspace-package.ts";

export class ChangesetConfigReadError extends Schema.TaggedErrorClass<ChangesetConfigReadError>()(
	"ChangesetConfigReadError",
	{ message: Schema.String },
) {}

/**
 * Loads and validates `.changeset/config.json`.
 *
 * Replaces `@changesets/config`.
 */
export class ChangesetConfigReader extends Context.Service<
	ChangesetConfigReader,
	{
		readonly read: (
			rootDir: string,
			workspace: WorkspaceRoot,
		) => Effect.Effect<ChangesetConfig, ChangesetConfigReadError>;
	}
>()("changes/services/ChangesetConfigReader") {}

export type ChangesetConfigReaderService = ChangesetConfigReader["Service"];
