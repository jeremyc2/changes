import { Context, type Effect, Schema } from "effect";
import type { ChangeConfig } from "../domain/change-config.ts";
import type { ParsedChangeDocument } from "../domain/change-document.ts";
import type { VersionMode } from "../domain/version-mode.ts";
import type { WorkspaceRoot } from "../domain/workspace-package.ts";

export type ComprehensiveRelease = {
	readonly name: string;
	readonly type: ParsedChangeDocument["releases"][number]["type"];
	readonly oldVersion: string;
	readonly newVersion: string;
	readonly changes: ReadonlyArray<string>;
};

export type PreReleaseState = {
	readonly mode: "pre" | "exit";
	readonly tag: string;
};

export type ReleasePlan = {
	readonly changes: ReadonlyArray<ParsedChangeDocument>;
	readonly releases: ReadonlyArray<ComprehensiveRelease>;
	readonly preState: PreReleaseState | undefined;
	readonly versionMode: VersionMode;
};

export class ReleasePlanAssemblyError extends Schema.TaggedErrorClass<ReleasePlanAssemblyError>()(
	"ReleasePlanAssemblyError",
	{ message: Schema.String },
) {}

/**
 * Combines parsed changes into a release plan with bumped versions.
 *
 * Replaces upstream release plan assembly.
 */
export class ReleasePlanAssembler extends Context.Service<
	ReleasePlanAssembler,
	{
		readonly assemble: (options: {
			readonly changes: ReadonlyArray<ParsedChangeDocument>;
			readonly workspace: WorkspaceRoot;
			readonly config: ChangeConfig;
			readonly preState?: PreReleaseState;
			readonly ignoredPackages?: ReadonlyArray<string>;
			readonly versionMode?: VersionMode;
		}) => Effect.Effect<ReleasePlan, ReleasePlanAssemblyError>;
	}
>()("changes/services/ReleasePlanAssembler") {}

export type ReleasePlanAssemblerService = ReleasePlanAssembler["Service"];
