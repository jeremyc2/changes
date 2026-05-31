import { Context, type Effect } from "effect";
import type { ChangeConfig } from "../domain/change-config.ts";
import type { WorkspacePackage } from "../domain/workspace-package.ts";

/**
 * Decides whether a workspace package participates in versioning.
 *
 * Replaces upstream package skip policy.
 */
export class PackageVersionabilityPolicy extends Context.Service<
	PackageVersionabilityPolicy,
	{
		readonly shouldSkip: (
			pkg: WorkspacePackage,
			config: Pick<ChangeConfig, "ignore" | "privatePackages">,
		) => Effect.Effect<boolean>;
	}
>()("changes/services/PackageVersionabilityPolicy") {}

export type PackageVersionabilityPolicyService =
	PackageVersionabilityPolicy["Service"];
