import type { AddCommandInput } from "../../src/commands/index.ts";
import type { ChangeConfig } from "../../src/domain/change-config.ts";
import type { ChangeDraft } from "../../src/domain/change-document.ts";
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

export const stubConfig: ChangeConfig = {
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

export const stubDraft: ChangeDraft = {
	summary: "contract summary",
	releases: [{ name: "pkg-a", type: "patch" }],
};

/** Default non-interactive input for contract tests of `addCommandWithDraft`. */
export const contractAddInput = (
	overrides: AddCommandInput = {},
): AddCommandInput => ({
	releases: stubDraft.releases,
	message: stubDraft.summary,
	confirmed: true,
	...overrides,
});

export const stubReleasePlan = (
	versionMode: VersionMode = defaultVersionMode,
): ReleasePlan => ({
	changes: [{ ...stubDraft, id: "stub-change" }],
	releases: [
		{
			name: "pkg-a",
			type: "patch",
			oldVersion: "1.0.0",
			newVersion:
				versionMode._tag === "snapshot" ? "0.0.0-contract-0000000000" : "1.0.1",
			changes: ["stub-change"],
		},
	],
	preState: undefined,
	versionMode,
});

export const statusJsonPayload = (plan: ReleasePlan): string =>
	JSON.stringify({
		changes: plan.changes.length,
		releases: plan.releases.map((release) => ({
			name: release.name,
			newVersion: release.newVersion,
		})),
	});
