import { Context, type Effect, Schema } from "effect";
import type { FilesystemError } from "./Filesystem.ts";
import type { PreReleaseState } from "./ReleasePlanAssembler.ts";

export class PreReleaseStateError extends Schema.TaggedErrorClass<PreReleaseStateError>()(
	"PreReleaseStateError",
	{ message: Schema.String },
) {}

/**
 * Manages pre-release mode (enter / exit / read state).
 *
 * Replaces upstream prerelease state management.
 */
export class PreReleaseStateManager extends Context.Service<
	PreReleaseStateManager,
	{
		readonly read: (
			rootDir: string,
		) => Effect.Effect<
			PreReleaseState | undefined,
			PreReleaseStateError | FilesystemError
		>;
		readonly enter: (
			rootDir: string,
			tag: string,
		) => Effect.Effect<void, PreReleaseStateError | FilesystemError>;
		readonly exit: (
			rootDir: string,
		) => Effect.Effect<void, PreReleaseStateError | FilesystemError>;
	}
>()("changes/services/PreReleaseStateManager") {}

export type PreReleaseStateManagerService = PreReleaseStateManager["Service"];
