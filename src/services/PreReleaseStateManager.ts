import { Context, type Effect, Schema } from "effect";
import type { PreReleaseState } from "./ReleasePlanAssembler.ts";

export class PreReleaseStateError extends Schema.TaggedErrorClass<PreReleaseStateError>()(
	"PreReleaseStateError",
	{ message: Schema.String },
) {}

/**
 * Manages pre-release mode (enter / exit / read state).
 *
 * Replaces `@changesets/pre`.
 */
export class PreReleaseStateManager extends Context.Service<
	PreReleaseStateManager,
	{
		readonly read: (
			rootDir: string,
		) => Effect.Effect<PreReleaseState | undefined, PreReleaseStateError>;
		readonly enter: (
			rootDir: string,
			tag: string,
		) => Effect.Effect<void, PreReleaseStateError>;
		readonly exit: (
			rootDir: string,
		) => Effect.Effect<void, PreReleaseStateError>;
	}
>()("changes/services/PreReleaseStateManager") {}

export type PreReleaseStateManagerService = PreReleaseStateManager["Service"];
