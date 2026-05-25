import { Context, type Effect, Schema } from "effect";
import type { ChangesetConfig } from "../domain/changeset-config.ts";
import type { ChangesetDraft } from "../domain/changeset-document.ts";
import type { ReleasePlan } from "./ReleasePlanAssembler.ts";

export type ChangesetCommitMessage = {
	readonly message: string;
};

export class ChangesetCommitHookError extends Schema.TaggedErrorClass<ChangesetCommitHookError>()(
	"ChangesetCommitHookError",
	{ message: Schema.String },
) {}

/**
 * Resolves optional commit messages from the configured commit generator module.
 *
 * Replaces `getCommitFunctions` / `getAddMessage` / `getVersionMessage` in `@changesets/cli`.
 */
export class ChangesetCommitHooks extends Context.Service<
	ChangesetCommitHooks,
	{
		readonly resolveAddCommitMessage: (options: {
			readonly rootDir: string;
			readonly draft: ChangesetDraft;
			readonly config: Pick<ChangesetConfig, "commit">;
		}) => Effect.Effect<
			ChangesetCommitMessage | undefined,
			ChangesetCommitHookError
		>;
		readonly resolveVersionCommitMessage: (options: {
			readonly rootDir: string;
			readonly plan: ReleasePlan;
			readonly config: Pick<ChangesetConfig, "commit">;
		}) => Effect.Effect<
			ChangesetCommitMessage | undefined,
			ChangesetCommitHookError
		>;
	}
>()("changes/services/ChangesetCommitHooks") {}

export type ChangesetCommitHooksService = ChangesetCommitHooks["Service"];
