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
	filterRelevantChangesets,
	flattenReleases,
	getSnapshotSuffix,
} from "./assemble-release-plan.ts";

const make = Effect.gen(function* () {
	const dependentsGraphBuilder = yield* DependentsGraphBuilder;
	const versionIncrement = yield* VersionIncrement;

	const assemble = Effect.fnUntraced(function* (options: {
		readonly changesets: ReleasePlan["changesets"];
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
			options.workspace.packages.map((pkg) => [pkg.packageJson.name, pkg]),
		);
		const shouldSkip = (pkg: WorkspacePackage): boolean =>
			options.config.ignore.includes(pkg.packageJson.name) ||
			(pkg.packageJson.private === true &&
				options.config.privatePackages.version !== true) ||
			pkg.packageJson.version === undefined ||
			(options.ignoredPackages?.includes(pkg.packageJson.name) ?? false);

		const relevantChangesets = filterRelevantChangesets(
			options.changesets,
			options.preState,
		);
		const releases = flattenReleases(
			relevantChangesets,
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
			const newVersion =
				snapshotSuffix !== undefined
					? `0.0.0-${snapshotSuffix}`
					: yield* versionIncrement.increment({
							oldVersion: release.oldVersion,
							bump: release.type,
							preState: options.preState,
							packageName: release.name,
						});
			comprehensiveReleases.push({
				name: release.name,
				type: release.type,
				oldVersion: release.oldVersion,
				newVersion,
				changesets: release.changesets,
			});
		}
		return {
			changesets: relevantChangesets,
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
