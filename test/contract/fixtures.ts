import type { ChangesetConfig } from "../../src/domain/changeset-config.ts";
import type { ChangesetDraft } from "../../src/domain/changeset-document.ts";
import {
	defaultVersionMode,
	type VersionMode,
} from "../../src/domain/version-mode.ts";
import type { WorkspaceRoot } from "../../src/domain/workspace-package.ts";
import type { ReleasePlan } from "../../src/services/ReleasePlanAssembler.ts";

export const rootDir = "/repo";

export const stubWorkspace: WorkspaceRoot = {
	dir: rootDir,
	tool: "npm",
	packages: [
		{
			dir: `${rootDir}/packages/a`,
			packageJson: {
				name: "pkg-a",
				version: "1.0.0",
			},
		},
		{
			dir: `${rootDir}/packages/b`,
			packageJson: {
				name: "pkg-b",
				version: "2.0.0",
			},
		},
	],
};

export const stubConfig: ChangesetConfig = {
	changelog: false,
	commit: false,
	fixed: [],
	linked: [],
	access: "restricted",
	baseBranch: "main",
	changedFilePatterns: [],
	prettier: false,
	privatePackages: { version: false, tag: false },
	ignore: [],
	updateInternalDependencies: "patch",
};

export const stubDraft: ChangesetDraft = {
	summary: "contract summary",
	releases: [{ name: "pkg-a", type: "patch" }],
};

export const stubReleasePlan = (
	versionMode: VersionMode = defaultVersionMode,
): ReleasePlan => ({
	changesets: [{ ...stubDraft, id: "stub-changeset" }],
	releases: [
		{
			name: "pkg-a",
			type: "patch",
			oldVersion: "1.0.0",
			newVersion:
				versionMode._tag === "snapshot" ? "0.0.0-contract-0000000000" : "1.0.1",
			changesets: ["stub-changeset"],
		},
	],
	preState: undefined,
	versionMode,
});

export const statusJsonPayload = (plan: ReleasePlan): string =>
	JSON.stringify({
		changesets: plan.changesets.length,
		releases: plan.releases.map((release) => ({
			name: release.name,
			newVersion: release.newVersion,
		})),
	});
