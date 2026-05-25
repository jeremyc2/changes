import { Context, type Effect } from "effect";
import type { ChangesetConfig } from "../domain/changeset-config.ts";
import type { WorkspaceRoot } from "../domain/workspace-package.ts";
import type { ReleasePlan } from "./ReleasePlanAssembler.ts";

/**
 * Applies a release plan to disk (bump package.json versions, update changelogs, delete consumed changesets).
 *
 * Replaces the apply phase of `@changesets/cli` `version` command.
 */
export class ReleasePlanApplier extends Context.Service<
	ReleasePlanApplier,
	{
		readonly apply: (options: {
			readonly rootDir: string;
			readonly workspace: WorkspaceRoot;
			readonly config: ChangesetConfig;
			readonly plan: ReleasePlan;
		}) => Effect.Effect<void>;
	}
>()("changes/services/ReleasePlanApplier") {}

export type ReleasePlanApplierService = ReleasePlanApplier["Service"];
