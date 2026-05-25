import { Effect, Layer } from "effect";
import type { ChangesetConfig } from "../domain/changeset-config.ts";
import type { VersionType } from "../domain/changeset-document.ts";
import type { PackageManifest } from "../domain/workspace-package.ts";
import { Filesystem } from "../services/Filesystem.ts";
import { ReleasePlanApplier } from "../services/ReleasePlanApplier.ts";
import type { ReleasePlan } from "../services/ReleasePlanAssembler.ts";
import { encodeJsonStringLine } from "./pure/json-codec.ts";
import { parseSemver, satisfiesSemver } from "./pure/semver.ts";

const dependencyTypes = [
	"dependencies",
	"devDependencies",
	"peerDependencies",
	"optionalDependencies",
] as const;

const bumpPriority: Record<VersionType, number> = {
	none: 0,
	patch: 1,
	minor: 2,
	major: 3,
};

const shouldUpdateForConfiguredMinimum = (
	releaseType: VersionType,
	minimum: ChangesetConfig["updateInternalDependencies"],
): boolean => bumpPriority[releaseType] >= bumpPriority[minimum];

const stripWorkspaceProtocol = (
	range: string,
): { readonly range: string; readonly usesWorkspaceProtocol: boolean } => {
	if (!range.startsWith("workspace:")) {
		return { range, usesWorkspaceProtocol: false };
	}
	return {
		range: range.slice("workspace:".length),
		usesWorkspaceProtocol: true,
	};
};

const rangePrefix = (range: string): string => {
	if (range.startsWith("^")) {
		return "^";
	}
	if (range.startsWith("~")) {
		return "~";
	}
	return "";
};

const isRewritableRange = (range: string): boolean => {
	if (range === "" || range === "*") {
		return false;
	}
	const prefix = rangePrefix(range);
	const version = prefix === "" ? range : range.slice(prefix.length);
	return parseSemver(version) !== undefined;
};

const nextDependencyRange = (options: {
	readonly currentRange: string;
	readonly newVersion: string;
	readonly releaseType: VersionType;
	readonly config: ChangesetConfig;
}): string | undefined => {
	if (
		options.currentRange.startsWith("file:") ||
		options.currentRange.startsWith("link:")
	) {
		return undefined;
	}
	const { range, usesWorkspaceProtocol } = stripWorkspaceProtocol(
		options.currentRange,
	);
	if (
		options.config.bumpVersionsWithWorkspaceProtocolOnly === true &&
		!usesWorkspaceProtocol
	) {
		return undefined;
	}
	if (
		usesWorkspaceProtocol &&
		(range === "*" || range === "^" || range === "~")
	) {
		return undefined;
	}
	if (!isRewritableRange(range)) {
		return undefined;
	}
	const shouldUpdate =
		shouldUpdateForConfiguredMinimum(
			options.releaseType,
			options.config.updateInternalDependencies,
		) || !satisfiesSemver(options.newVersion, range);
	if (!shouldUpdate) {
		return undefined;
	}
	const nextRange = `${rangePrefix(range)}${options.newVersion}`;
	return usesWorkspaceProtocol ? `workspace:${nextRange}` : nextRange;
};

const updateDependencyRanges = (
	packageJson: PackageManifest,
	versionsToUpdate: ReadonlyArray<{
		readonly name: string;
		readonly version: string;
		readonly type: VersionType;
	}>,
	config: ChangesetConfig,
): PackageManifest => {
	const next = { ...packageJson };
	for (const depType of dependencyTypes) {
		const deps = next[depType];
		if (deps === undefined) {
			continue;
		}
		const updatedDeps = { ...deps };
		for (const update of versionsToUpdate) {
			const current = updatedDeps[update.name];
			if (current === undefined) {
				continue;
			}
			const nextRange = nextDependencyRange({
				currentRange: current,
				newVersion: update.version,
				releaseType: update.type,
				config,
			});
			if (nextRange !== undefined) {
				updatedDeps[update.name] = nextRange;
			}
		}
		next[depType] = updatedDeps;
	}
	return next;
};

const manifestsEqual = (
	left: PackageManifest,
	right: PackageManifest,
): boolean => JSON.stringify(left) === JSON.stringify(right);

const make = Effect.gen(function* () {
	const filesystem = yield* Filesystem;

	const apply = Effect.fnUntraced(function* (options: {
		readonly rootDir: string;
		readonly workspace: Parameters<
			ReleasePlanApplier["Service"]["apply"]
		>[0]["workspace"];
		readonly config: Parameters<
			ReleasePlanApplier["Service"]["apply"]
		>[0]["config"];
		readonly plan: ReleasePlan;
		readonly changelogEntries: Parameters<
			ReleasePlanApplier["Service"]["apply"]
		>[0]["changelogEntries"];
	}) {
		const versionsToUpdate = options.plan.releases.map((release) => ({
			name: release.name,
			version: release.newVersion,
			type: release.type,
		}));
		const changelogEntriesByPackage = new Map(
			options.changelogEntries.map((entry) => [entry.packageName, entry.entry]),
		);
		for (const workspacePackage of options.workspace.packages) {
			const release = options.plan.releases.find(
				(candidate) => candidate.name === workspacePackage.packageJson.name,
			);
			const nextManifest = updateDependencyRanges(
				{
					...workspacePackage.packageJson,
					...(release === undefined ? {} : { version: release.newVersion }),
				},
				versionsToUpdate,
				options.config,
			);
			if (
				release === undefined &&
				manifestsEqual(workspacePackage.packageJson, nextManifest)
			) {
				continue;
			}
			yield* filesystem.writeUtf8(
				`${workspacePackage.dir}/package.json`,
				encodeJsonStringLine(nextManifest),
			);
			if (release === undefined) {
				continue;
			}
			if (options.config.changelog === false) {
				continue;
			}
			const entry = changelogEntriesByPackage.get(release.name);
			if (entry === undefined || entry.trim() === "") {
				continue;
			}
			const changelogPath = `${workspacePackage.dir}/CHANGELOG.md`;
			const hasChangelog = yield* filesystem.exists(changelogPath);
			const existing = hasChangelog
				? yield* filesystem.readUtf8(changelogPath)
				: `# ${release.name}\n\n`;
			const entryHeader = `\n## ${release.newVersion}\n\n`;
			yield* filesystem.writeUtf8(
				changelogPath,
				`${existing}${entryHeader}${entry}\n`,
			);
		}
		for (const changeset of options.plan.changesets) {
			const changesetPath = `${options.rootDir}/.changeset/${changeset.id}.md`;
			const exists = yield* filesystem.exists(changesetPath);
			if (exists) {
				yield* filesystem.remove(changesetPath);
			}
		}
	});

	return ReleasePlanApplier.of({ apply });
});

export const layer = Layer.effect(ReleasePlanApplier, make);
