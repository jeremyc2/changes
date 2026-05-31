import { Clock, Effect, Layer } from "effect";
import type { WorkspacePackage } from "../domain/workspace-package.ts";
import { DependentsGraphBuilder } from "../services/DependentsGraphBuilder.ts";
import {
	type ComprehensiveRelease,
	type ReleasePlan,
	ReleasePlanAssembler,
	ReleasePlanAssemblyError,
} from "../services/ReleasePlanAssembler.ts";
import { VersionIncrement } from "../services/VersionIncrement.ts";
import {
	applyFixedGroups,
	applyLinkedGroups,
	determineDependents,
	filterRelevantChanges,
	flattenReleases,
	getSnapshotSuffix,
} from "./assemble-release-plan.ts";

const make = Effect.gen(function* () {
	const dependentsGraphBuilder = yield* DependentsGraphBuilder;
	const versionIncrement = yield* VersionIncrement;

	const assemble = Effect.fnUntraced(function* (options: {
		readonly changes: ReleasePlan["changes"];
		readonly workspace: Parameters<
			ReleasePlanAssembler["Service"]["assemble"]
		>[0]["workspace"];
		readonly config: Parameters<
			ReleasePlanAssembler["Service"]["assemble"]
		>[0]["config"];
		readonly preState?: ReleasePlan["preState"];
		readonly ignoredPackages?: ReadonlyArray<string>;
		readonly versionMode?: ReleasePlan["versionMode"];
	}) {
		const versionMode = options.versionMode ?? { _tag: "default" as const };
		const packagesByName = new Map<string, WorkspacePackage>(
			options.workspace.packages.map((workspacePackage) => [
				workspacePackage.packageJson.name,
				workspacePackage,
			]),
		);
		const shouldSkip = (workspacePackage: WorkspacePackage): boolean =>
			options.config.ignore.includes(workspacePackage.packageJson.name) ||
			(workspacePackage.packageJson.private === true &&
				options.config.privatePackages.version !== true) ||
			workspacePackage.packageJson.version === undefined ||
			(options.ignoredPackages?.includes(workspacePackage.packageJson.name) ??
				false);

		const relevantChanges = filterRelevantChanges(
			options.changes,
			options.preState,
		);
		const releases = flattenReleases(
			relevantChanges,
			packagesByName,
			shouldSkip,
		);
		const dependentsGraph = yield* dependentsGraphBuilder.build(
			options.workspace,
		);
		let stable = false;
		while (!stable) {
			const dependentsUpdated = determineDependents(
				releases,
				dependentsGraph,
				packagesByName,
				shouldSkip,
			);
			const fixedUpdated = applyFixedGroups(
				releases,
				packagesByName,
				options.config.fixed,
				shouldSkip,
			);
			const linkedUpdated = applyLinkedGroups(
				releases,
				packagesByName,
				options.config.linked,
			);
			stable = !dependentsUpdated && !fixedUpdated && !linkedUpdated;
		}
		const timestampMillis = yield* Clock.currentTimeMillis;
		const snapshotSuffix =
			versionMode._tag === "snapshot"
				? getSnapshotSuffix(versionMode, timestampMillis)
				: undefined;
		const comprehensiveReleases: Array<ComprehensiveRelease> = [];
		for (const release of releases.values()) {
			const calculatedVersion = yield* versionIncrement.increment({
				oldVersion: release.oldVersion,
				bump: release.type,
				preState: options.preState,
				packageName: release.name,
			});
			const newVersion =
				snapshotSuffix === undefined || release.type === "none"
					? calculatedVersion
					: options.config.snapshot?.useCalculatedVersion === true
						? `${calculatedVersion}-${snapshotSuffix}`
						: `0.0.0-${snapshotSuffix}`;
			comprehensiveReleases.push({
				name: release.name,
				type: release.type,
				oldVersion: release.oldVersion,
				newVersion,
				changes: release.changes,
			});
		}
		return {
			changes: relevantChanges,
			releases: comprehensiveReleases,
			preState: options.preState,
			versionMode,
		} satisfies ReleasePlan;
	});

	return ReleasePlanAssembler.of({
		assemble: (options) =>
			assemble(options).pipe(
				Effect.mapError(
					(cause) =>
						new ReleasePlanAssemblyError({
							message: cause instanceof Error ? cause.message : String(cause),
						}),
				),
			),
	});
});

export const layer = Layer.effect(ReleasePlanAssembler, make);
