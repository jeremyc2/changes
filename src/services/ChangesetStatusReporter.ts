import { Context, type Effect } from "effect";
import type { ChangesetConfig } from "../domain/changeset-config.ts";
import type { ChangesetDocumentParseError } from "./ChangesetDocumentParser.ts";
import type { FilesystemError } from "./Filesystem.ts";
import type { GitError } from "./Git.ts";
import type { PreReleaseStateError } from "./PreReleaseStateManager.ts";
import type {
	ReleasePlan,
	ReleasePlanAssemblyError,
} from "./ReleasePlanAssembler.ts";
import type { WorkspaceDiscoveryError } from "./WorkspacePackageDiscovery.ts";

/**
 * Reports unreleased changeset status for the `status` command.
 */
export class ChangesetStatusReporter extends Context.Service<
	ChangesetStatusReporter,
	{
		readonly report: (options: {
			readonly rootDir: string;
			readonly config: ChangesetConfig;
			readonly sinceRef?: string;
			readonly verbose: boolean;
		}) => Effect.Effect<
			ReleasePlan,
			| ChangesetDocumentParseError
			| FilesystemError
			| GitError
			| PreReleaseStateError
			| ReleasePlanAssemblyError
			| WorkspaceDiscoveryError
		>;
	}
>()("changes/services/ChangesetStatusReporter") {}

export type ChangesetStatusReporterService = ChangesetStatusReporter["Service"];
