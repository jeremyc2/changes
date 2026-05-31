import { Context, type Effect, Schema } from "effect";
import type { WorkspaceRoot } from "../domain/workspace-package.ts";

export class PackageGitTaggerError extends Schema.TaggedErrorClass<PackageGitTaggerError>()(
	"PackageGitTaggerError",
	{ message: Schema.String },
) {}

/**
 * Creates git tags for current package versions without publishing to a registry.
 *
 * Replaces upstream tag command behavior.
 */
export class PackageGitTagger extends Context.Service<
	PackageGitTagger,
	{
		readonly tagWorkspacePackages: (options: {
			readonly cwd: string;
			readonly workspace: WorkspaceRoot;
		}) => Effect.Effect<ReadonlyArray<string>, PackageGitTaggerError>;
	}
>()("changes/services/PackageGitTagger") {}

export type PackageGitTaggerService = PackageGitTagger["Service"];
