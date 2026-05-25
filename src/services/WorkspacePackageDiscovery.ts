import { Context, type Effect, Schema } from "effect";
import type { WorkspaceRoot } from "../domain/workspace-package.ts";

export class WorkspaceDiscoveryError extends Schema.TaggedErrorClass<WorkspaceDiscoveryError>()(
	"WorkspaceDiscoveryError",
	{ message: Schema.String },
) {}

/**
 * Discovers packages in a monorepo workspace.
 *
 * Replaces `@manypkg/get-packages`.
 */
export class WorkspacePackageDiscovery extends Context.Service<
	WorkspacePackageDiscovery,
	{
		readonly discover: (
			cwd: string,
		) => Effect.Effect<WorkspaceRoot, WorkspaceDiscoveryError>;
	}
>()("changes/services/WorkspacePackageDiscovery") {}

export type WorkspacePackageDiscoveryService =
	WorkspacePackageDiscovery["Service"];
