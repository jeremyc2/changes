import { Context, type Effect } from "effect";
import type { ChangesetConfig } from "../domain/changeset-config.ts";
import type { WorkspacePackage } from "../domain/workspace-package.ts";

/**
 * Finds workspace packages with changes since a git ref.
 *
 * Used by the `add --since` flag and `status` command.
 */
export class ChangedPackageDetection extends Context.Service<
	ChangedPackageDetection,
	{
		readonly detectVersionableChangedPackages: (options: {
			readonly cwd: string;
			readonly config: ChangesetConfig;
			readonly ref?: string;
		}) => Effect.Effect<ReadonlyArray<WorkspacePackage>>;
	}
>()("changes/services/ChangedPackageDetection") {}

export type ChangedPackageDetectionService = ChangedPackageDetection["Service"];
