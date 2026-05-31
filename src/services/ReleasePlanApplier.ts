import { Context, type Effect } from "effect";
import type { ChangeConfig } from "../domain/change-config.ts";
import type { WorkspaceRoot } from "../domain/workspace-package.ts";
import type { ChangelogEntry } from "./ChangelogGenerator.ts";
import type { FilesystemError } from "./Filesystem.ts";
import type { ReleasePlan } from "./ReleasePlanAssembler.ts";

/**
 * Applies a release plan to disk (bump package.json versions, update changelogs, delete consumed changes).
 *
 * Replaces upstream version apply behavior.
 */
export class ReleasePlanApplier extends Context.Service<
	ReleasePlanApplier,
	{
		readonly apply: (options: {
			readonly rootDir: string;
			readonly workspace: WorkspaceRoot;
			readonly config: ChangeConfig;
			readonly plan: ReleasePlan;
			readonly changelogEntries: ReadonlyArray<ChangelogEntry>;
		}) => Effect.Effect<void, FilesystemError>;
	}
>()("changes/services/ReleasePlanApplier") {}

export type ReleasePlanApplierService = ReleasePlanApplier["Service"];
