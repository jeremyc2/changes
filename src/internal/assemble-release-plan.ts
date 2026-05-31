import type { ChangeConfig } from "../domain/change-config.ts";
import type {
	ParsedChangeDocument,
	VersionType,
} from "../domain/change-document.ts";
import type { VersionMode } from "../domain/version-mode.ts";
import type { WorkspacePackage } from "../domain/workspace-package.ts";
import type { PreReleaseState } from "../services/ReleasePlanAssembler.ts";
import { parseSemver, satisfiesSemver } from "./pure/semver.ts";

export type InternalRelease = {
	name: string;
	type: VersionType;
	oldVersion: string;
	changes: Array<string>;
};

const bumpPriority: Record<VersionType, number> = {
	none: 0,
	patch: 1,
	minor: 2,
	major: 3,
};

const dependentDependencyTypes = [
	"dependencies",
	"peerDependencies",
	"optionalDependencies",
] as const;

const maxBump = (left: VersionType, right: VersionType): VersionType =>
	bumpPriority[left] >= bumpPriority[right] ? left : right;

export const flattenReleases = (
	changes: ReadonlyArray<ParsedChangeDocument>,
	packagesByName: ReadonlyMap<string, WorkspacePackage>,
	shouldSkip: (pkg: WorkspacePackage) => boolean,
): Map<string, InternalRelease> => {
	const releases = new Map<string, InternalRelease>();
	for (const change of changes) {
		for (const release of change.releases) {
			const workspacePackage = packagesByName.get(release.name);
			if (workspacePackage === undefined || shouldSkip(workspacePackage)) {
				continue;
			}
			const existing = releases.get(release.name);
			if (existing === undefined) {
				releases.set(release.name, {
					name: release.name,
					type: release.type,
					oldVersion: workspacePackage.packageJson.version,
					changes: [change.id],
				});
				continue;
			}
			existing.type = maxBump(existing.type, release.type);
			existing.changes.push(change.id);
		}
	}
	return releases;
};

export const getHighestReleaseType = (
	releases: ReadonlyArray<InternalRelease>,
): VersionType =>
	releases.reduce<VersionType>(
		(highest, release) => maxBump(highest, release.type),
		"none",
	);

export const getCurrentHighestVersion = (
	packageNames: ReadonlyArray<string>,
	packagesByName: ReadonlyMap<string, WorkspacePackage>,
): string => {
	let highest = "0.0.0";
	for (const name of packageNames) {
		const workspacePackage = packagesByName.get(name);
		if (workspacePackage === undefined) {
			continue;
		}
		const current = workspacePackage.packageJson.version;
		if (compareVersions(current, highest) > 0) {
			highest = current;
		}
	}
	return highest;
};

const compareVersions = (left: string, right: string): number => {
	const leftParsed = parseSemver(left);
	const rightParsed = parseSemver(right);
	if (leftParsed === undefined || rightParsed === undefined) {
		return 0;
	}
	if (leftParsed.major !== rightParsed.major) {
		return leftParsed.major - rightParsed.major;
	}
	if (leftParsed.minor !== rightParsed.minor) {
		return leftParsed.minor - rightParsed.minor;
	}
	return leftParsed.patch - rightParsed.patch;
};

export const applyFixedGroups = (
	releases: Map<string, InternalRelease>,
	packagesByName: ReadonlyMap<string, WorkspacePackage>,
	fixed: ChangeConfig["fixed"],
	shouldSkip: (pkg: WorkspacePackage) => boolean,
): boolean => {
	let updated = false;
	for (const group of fixed) {
		const releasing = [...releases.values()].filter(
			(release) => group.includes(release.name) && release.type !== "none",
		);
		if (releasing.length === 0) {
			continue;
		}
		const highestType = getHighestReleaseType(releasing);
		const highestVersion = getCurrentHighestVersion(group, packagesByName);
		for (const pkgName of group) {
			const workspacePackage = packagesByName.get(pkgName);
			if (workspacePackage === undefined || shouldSkip(workspacePackage)) {
				continue;
			}
			const existing = releases.get(pkgName);
			if (existing === undefined) {
				releases.set(pkgName, {
					name: pkgName,
					type: highestType,
					oldVersion: highestVersion,
					changes: [],
				});
				updated = true;
				continue;
			}
			if (existing.type !== highestType) {
				existing.type = highestType;
				updated = true;
			}
			if (existing.oldVersion !== highestVersion) {
				existing.oldVersion = highestVersion;
				updated = true;
			}
		}
	}
	return updated;
};

export const applyLinkedGroups = (
	releases: Map<string, InternalRelease>,
	packagesByName: ReadonlyMap<string, WorkspacePackage>,
	linked: ChangeConfig["linked"],
): boolean => {
	let updated = false;
	for (const group of linked) {
		const releasing = [...releases.values()].filter(
			(release) => group.includes(release.name) && release.type !== "none",
		);
		if (releasing.length === 0) {
			continue;
		}
		const highestType = getHighestReleaseType(releasing);
		const highestVersion = getCurrentHighestVersion(group, packagesByName);
		for (const release of releasing) {
			if (release.type !== highestType) {
				release.type = highestType;
				updated = true;
			}
			if (release.oldVersion !== highestVersion) {
				release.oldVersion = highestVersion;
				updated = true;
			}
		}
	}
	return updated;
};

export const determineDependents = (
	releases: Map<string, InternalRelease>,
	dependentsGraph: ReadonlyMap<string, ReadonlyArray<string>>,
	packagesByName: ReadonlyMap<string, WorkspacePackage>,
	shouldSkip: (pkg: WorkspacePackage) => boolean,
): boolean => {
	let updated = false;
	const queue = [...releases.values()];
	while (queue.length > 0) {
		const nextRelease = queue.shift();
		if (nextRelease === undefined || nextRelease.type === "none") {
			continue;
		}
		const dependents = dependentsGraph.get(nextRelease.name) ?? [];
		for (const dependent of dependents) {
			const dependentPackage = packagesByName.get(dependent);
			if (dependentPackage === undefined || shouldSkip(dependentPackage)) {
				continue;
			}
			if (
				!shouldBumpDependent({
					dependentPackage,
					dependencyName: nextRelease.name,
					dependencyOldVersion: nextRelease.oldVersion,
					dependencyNewVersion: releaseNewVersion(nextRelease),
				})
			) {
				continue;
			}
			const existing = releases.get(dependent);
			const bumpType: VersionType =
				nextRelease.type === "major" || nextRelease.type === "minor"
					? "patch"
					: "patch";
			if (existing === undefined) {
				const release: InternalRelease = {
					name: dependent,
					type: bumpType,
					oldVersion: dependentPackage.packageJson.version,
					changes: [],
				};
				releases.set(dependent, release);
				queue.push(release);
				updated = true;
				continue;
			}
			if (existing.type === "none") {
				existing.type = bumpType;
				queue.push(existing);
				updated = true;
			}
		}
	}
	return updated;
};

const releaseNewVersion = (release: InternalRelease): string => {
	const parsed = parseSemver(release.oldVersion);
	if (release.type === "none" || parsed === undefined) {
		return release.oldVersion;
	}
	switch (release.type) {
		case "major":
			return `${parsed.major + 1}.0.0`;
		case "minor":
			return `${parsed.major}.${parsed.minor + 1}.0`;
		case "patch":
			return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
	}
};

const dependencyRangeFor = (
	workspacePackage: WorkspacePackage,
	dependencyName: string,
): string | undefined => {
	for (const dependencyType of dependentDependencyTypes) {
		const range =
			workspacePackage.packageJson[dependencyType]?.[dependencyName];
		if (range !== undefined) {
			return range;
		}
	}
	return undefined;
};

const comparableDependencyRange = (
	range: string,
	dependencyOldVersion: string,
): string | undefined => {
	if (range.startsWith("file:") || range.startsWith("link:")) {
		return undefined;
	}
	if (!range.startsWith("workspace:")) {
		return range;
	}
	const workspaceRange = range.slice("workspace:".length);
	if (workspaceRange === "*") {
		return "*";
	}
	if (workspaceRange === "^" || workspaceRange === "~") {
		return `${workspaceRange}${dependencyOldVersion}`;
	}
	if (workspaceRange === "") {
		return undefined;
	}
	return workspaceRange;
};

const shouldBumpDependent = (options: {
	readonly dependentPackage: WorkspacePackage;
	readonly dependencyName: string;
	readonly dependencyOldVersion: string;
	readonly dependencyNewVersion: string;
}): boolean => {
	const range = dependencyRangeFor(
		options.dependentPackage,
		options.dependencyName,
	);
	if (range === undefined) {
		return false;
	}
	const comparableRange = comparableDependencyRange(
		range,
		options.dependencyOldVersion,
	);
	if (comparableRange === undefined) {
		return false;
	}
	if (range === "workspace:*") {
		return true;
	}
	return !satisfiesSemver(options.dependencyNewVersion, comparableRange);
};

export const getSnapshotSuffix = (
	versionMode: VersionMode,
	timestampMillis: number,
): string => {
	if (versionMode._tag !== "snapshot") {
		return "";
	}
	const datetime = String(timestampMillis);
	return versionMode.tag === undefined
		? datetime
		: `${versionMode.tag}-${datetime}`;
};

export const filterRelevantChanges = (
	changes: ReadonlyArray<ParsedChangeDocument>,
	preState: PreReleaseState | undefined,
): ReadonlyArray<ParsedChangeDocument> => {
	if (preState !== undefined && preState.mode !== "exit") {
		return changes;
	}
	return changes;
};
