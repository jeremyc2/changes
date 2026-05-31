import { Context, type Effect, Schema } from "effect";
import type { FilesystemError } from "./Filesystem.ts";

export class ChangeWorkspaceInitError extends Schema.TaggedErrorClass<ChangeWorkspaceInitError>()(
	"ChangeWorkspaceInitError",
	{ message: Schema.String },
) {}

/**
 * Scaffolds the `.changes/` directory for `changes init`.
 */
export class ChangeWorkspaceInit extends Context.Service<
	ChangeWorkspaceInit,
	{
		readonly scaffold: (
			rootDir: string,
		) => Effect.Effect<void, ChangeWorkspaceInitError | FilesystemError>;
	}
>()("changes/services/ChangeWorkspaceInit") {}

export type ChangeWorkspaceInitService = ChangeWorkspaceInit["Service"];
