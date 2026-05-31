import { Context, type Effect, Schema } from "effect";
import type { ChangeConfig } from "../domain/change-config.ts";
import type { ChangeDocumentParseError } from "./ChangeDocumentParser.ts";
import type { FilesystemError } from "./Filesystem.ts";
import type { GitError } from "./Git.ts";
import type { PreReleaseStateError } from "./PreReleaseStateManager.ts";
import type {
	ReleasePlan,
	ReleasePlanAssemblyError,
} from "./ReleasePlanAssembler.ts";
import type { WorkspaceDiscoveryError } from "./WorkspacePackageDiscovery.ts";

export class ChangeStatusError extends Schema.TaggedErrorClass<ChangeStatusError>()(
	"ChangeStatusError",
	{ message: Schema.String },
) {}

/**
 * Reports unreleased change status for the `status` command.
 */
export class ChangeStatusReporter extends Context.Service<
	ChangeStatusReporter,
	{
		readonly report: (options: {
			readonly rootDir: string;
			readonly config: ChangeConfig;
			readonly sinceRef?: string;
			readonly verbose: boolean;
		}) => Effect.Effect<
			ReleasePlan,
			| ChangeDocumentParseError
			| FilesystemError
			| GitError
			| PreReleaseStateError
			| ReleasePlanAssemblyError
			| ChangeStatusError
			| WorkspaceDiscoveryError
		>;
	}
>()("changes/services/ChangeStatusReporter") {}

export type ChangeStatusReporterService = ChangeStatusReporter["Service"];
