import type { ChangesetConfig } from "../domain/changeset-config.ts";
import type {
	ParsedChangesetDocument,
	VersionType,
} from "../domain/changeset-document.ts";
import type { VersionMode } from "../domain/version-mode.ts";
import type { WorkspacePackage } from "../domain/workspace-package.ts";
import type { PreReleaseState } from "../services/ReleasePlanAssembler.ts";
import { parseSemver } from "./pure/semver.ts";

export type InternalRelease = {
	name: string;
	type: VersionType;
	oldVersion: string;
	changesets: Array<string>;
};

const bumpPriority: Record<VersionType, number> = {
	none: 0,
	patch: 1,
	minor: 2,
	major: 3,
};

const maxBump = (left: VersionType, right: VersionType): VersionType =>
	bumpPriority[left] >= bumpPriority[right] ? left : right;

export const flattenReleases = (
	changesets: ReadonlyArray<ParsedChangesetDocument>,
	packagesByName: ReadonlyMap<string, WorkspacePackage>,
	shouldSkip: (pkg: WorkspacePackage) => boolean,
): Map<string, InternalRelease> => {
	const releases = new Map<string, InternalRelease>();
	for (const changeset of changesets) {
		for (const release of changeset.releases) {
			const pkg = packagesByName.get(release.name);
			if (pkg === undefined || shouldSkip(pkg)) {
				continue;
			}
			const existing = releases.get(release.name);
			if (existing === undefined) {
				releases.set(release.name, {
					name: release.name,
					type: release.type,
					oldVersion: pkg.packageJson.version,
					changesets: [changeset.id],
				});
				continue;
			}
			existing.type = maxBump(existing.type, release.type);
			existing.changesets.push(changeset.id);
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
		const pkg = packagesByName.get(name);
		if (pkg === undefined) {
			continue;
		}
		const current = pkg.packageJson.version;
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
	fixed: ChangesetConfig["fixed"],
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
			const pkg = packagesByName.get(pkgName);
			if (pkg === undefined || shouldSkip(pkg)) {
				continue;
			}
			const existing = releases.get(pkgName);
			if (existing === undefined) {
				releases.set(pkgName, {
					name: pkgName,
					type: highestType,
					oldVersion: highestVersion,
					changesets: [],
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
	linked: ChangesetConfig["linked"],
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
					changesets: [],
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

export const filterRelevantChangesets = (
	changesets: ReadonlyArray<ParsedChangesetDocument>,
	preState: PreReleaseState | undefined,
): ReadonlyArray<ParsedChangesetDocument> => {
	if (preState !== undefined && preState.mode !== "exit") {
		return changesets;
	}
	return changesets;
};
