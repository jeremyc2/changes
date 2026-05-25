import { Context, type Effect } from "effect";
import type { ChangesetConfig } from "../domain/changeset-config.ts";
import type { WorkspacePackage } from "../domain/workspace-package.ts";

/**
 * Decides whether a workspace package participates in versioning.
 *
 * Replaces `@changesets/should-skip-package`.
 */
export class PackageVersionabilityPolicy extends Context.Service<
	PackageVersionabilityPolicy,
	{
		readonly shouldSkip: (
			pkg: WorkspacePackage,
			config: Pick<ChangesetConfig, "ignore" | "privatePackages">,
		) => Effect.Effect<boolean>;
	}
>()("changes/services/PackageVersionabilityPolicy") {}

export type PackageVersionabilityPolicyService =
	PackageVersionabilityPolicy["Service"];
