import { Context, type Effect, Schema } from "effect";

export class ChangesetWorkspaceInitError extends Schema.TaggedErrorClass<ChangesetWorkspaceInitError>()(
	"ChangesetWorkspaceInitError",
	{ message: Schema.String },
) {}

/**
 * Scaffolds the `.changeset/` directory for `changeset init`.
 */
export class ChangesetWorkspaceInit extends Context.Service<
	ChangesetWorkspaceInit,
	{
		readonly scaffold: (
			rootDir: string,
		) => Effect.Effect<void, ChangesetWorkspaceInitError>;
	}
>()("changes/services/ChangesetWorkspaceInit") {}

export type ChangesetWorkspaceInitService = ChangesetWorkspaceInit["Service"];
