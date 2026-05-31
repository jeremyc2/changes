import { Context, type Effect, Schema } from "effect";
import type { ChangeConfig } from "../domain/change-config.ts";
import type { ChangeDraft } from "../domain/change-document.ts";
import type { ReleasePlan } from "./ReleasePlanAssembler.ts";

export type ChangeCommitMessage = {
	readonly message: string;
};

export class ChangeCommitHookError extends Schema.TaggedErrorClass<ChangeCommitHookError>()(
	"ChangeCommitHookError",
	{ message: Schema.String },
) {}

/**
 * Resolves optional commit messages from the configured commit generator module.
 *
 * Replaces upstream commit hook resolution.
 */
export class ChangeCommitHooks extends Context.Service<
	ChangeCommitHooks,
	{
		readonly resolveAddCommitMessage: (options: {
			readonly rootDir: string;
			readonly draft: ChangeDraft;
			readonly config: Pick<ChangeConfig, "commit">;
		}) => Effect.Effect<ChangeCommitMessage | undefined, ChangeCommitHookError>;
		readonly resolveVersionCommitMessage: (options: {
			readonly rootDir: string;
			readonly plan: ReleasePlan;
			readonly config: Pick<ChangeConfig, "commit">;
		}) => Effect.Effect<ChangeCommitMessage | undefined, ChangeCommitHookError>;
	}
>()("changes/services/ChangeCommitHooks") {}

export type ChangeCommitHooksService = ChangeCommitHooks["Service"];
