import { Context, type Effect, Schema } from "effect";

export class GitError extends Schema.TaggedErrorClass<GitError>()("GitError", {
	message: Schema.String,
	cause: Schema.optional(Schema.Defect),
}) {}

/**
 * Git operations for change workflows (stage, commit, diff since ref).
 *
 * Replaces upstream git operations.
 */
export class Git extends Context.Service<
	Git,
	{
		readonly add: (path: string, cwd: string) => Effect.Effect<void, GitError>;
		readonly commit: (
			message: string,
			cwd: string,
		) => Effect.Effect<void, GitError>;
		readonly getChangedChangeFilesSinceRef: (options: {
			readonly cwd: string;
			readonly ref: string;
		}) => Effect.Effect<ReadonlyArray<string>, GitError>;
		readonly getChangedFilesSinceRef: (options: {
			readonly cwd: string;
			readonly ref: string;
		}) => Effect.Effect<ReadonlyArray<string>, GitError>;
		readonly tag: (
			tagName: string,
			cwd: string,
		) => Effect.Effect<void, GitError>;
	}
>()("changes/services/Git") {}

export type GitService = Git["Service"];
