import { Context, type Effect, Schema } from "effect";
import type { ComprehensiveRelease } from "./ReleasePlanAssembler.ts";

export class RegistryPublishError extends Schema.TaggedErrorClass<RegistryPublishError>()(
	"RegistryPublishError",
	{
		message: Schema.String,
		cause: Schema.optional(Schema.Defect),
	},
) {}

/**
 * Publishes released packages to a registry.
 *
 * Replaces publish logic in `@changesets/cli`.
 */
export class RegistryPublish extends Context.Service<
	RegistryPublish,
	{
		readonly publish: (options: {
			readonly releases: ReadonlyArray<ComprehensiveRelease>;
			readonly cwd: string;
			readonly tag?: string;
			readonly otp?: string;
			readonly skipGitTags?: boolean;
		}) => Effect.Effect<void, RegistryPublishError>;
	}
>()("changes/services/RegistryPublish") {}

export type RegistryPublishService = RegistryPublish["Service"];
