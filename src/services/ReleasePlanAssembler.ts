import { Context, type Effect, Schema } from "effect";
import type { ChangesetConfig } from "../domain/changeset-config.ts";
import type { ParsedChangesetDocument } from "../domain/changeset-document.ts";
import type { VersionMode } from "../domain/version-mode.ts";
import type { WorkspaceRoot } from "../domain/workspace-package.ts";

export type ComprehensiveRelease = {
	readonly name: string;
	readonly type: ParsedChangesetDocument["releases"][number]["type"];
	readonly oldVersion: string;
	readonly newVersion: string;
	readonly changesets: ReadonlyArray<string>;
};

export type PreReleaseState = {
	readonly mode: "pre" | "exit";
	readonly tag: string;
};

export type ReleasePlan = {
	readonly changesets: ReadonlyArray<ParsedChangesetDocument>;
	readonly releases: ReadonlyArray<ComprehensiveRelease>;
	readonly preState: PreReleaseState | undefined;
	readonly versionMode: VersionMode;
};

export class ReleasePlanAssemblyError extends Schema.TaggedErrorClass<ReleasePlanAssemblyError>()(
	"ReleasePlanAssemblyError",
	{ message: Schema.String },
) {}

/**
 * Combines parsed changesets into a release plan with bumped versions.
 *
 * Replaces `@changesets/assemble-release-plan` and `@changesets/get-release-plan`.
 */
export class ReleasePlanAssembler extends Context.Service<
	ReleasePlanAssembler,
	{
		readonly assemble: (options: {
			readonly changesets: ReadonlyArray<ParsedChangesetDocument>;
			readonly workspace: WorkspaceRoot;
			readonly config: ChangesetConfig;
			readonly preState?: PreReleaseState;
			readonly ignoredPackages?: ReadonlyArray<string>;
			readonly versionMode?: VersionMode;
		}) => Effect.Effect<ReleasePlan, ReleasePlanAssemblyError>;
	}
>()("changes/services/ReleasePlanAssembler") {}

export type ReleasePlanAssemblerService = ReleasePlanAssembler["Service"];
