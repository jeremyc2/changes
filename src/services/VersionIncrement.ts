import { Context, type Effect, Schema } from "effect";
import type { VersionType } from "../domain/change-document.ts";
import type { PreReleaseState } from "./ReleasePlanAssembler.ts";

export class VersionIncrementError extends Schema.TaggedErrorClass<VersionIncrementError>()(
	"VersionIncrementError",
	{ message: Schema.String },
) {}

/**
 * Computes the next semver string for a package release.
 *
 * Replaces upstream version increment logic.
 */
export class VersionIncrement extends Context.Service<
	VersionIncrement,
	{
		readonly increment: (options: {
			readonly oldVersion: string;
			readonly bump: VersionType;
			readonly preState?: PreReleaseState;
			readonly preVersion?: number;
			readonly packageName: string;
		}) => Effect.Effect<string, VersionIncrementError>;
	}
>()("changes/services/VersionIncrement") {}

export type VersionIncrementService = VersionIncrement["Service"];
