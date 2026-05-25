import { Effect } from "effect";
import type {
	ChangesetDraft,
	VersionType,
} from "../../src/domain/changeset-document.ts";
import {
	defaultVersionMode,
	type VersionMode,
} from "../../src/domain/version-mode.ts";
import { ChangedPackageDetection } from "../../src/services/ChangedPackageDetection.ts";
import { ChangelogGenerator } from "../../src/services/ChangelogGenerator.ts";
import { ChangesetCatalogReader } from "../../src/services/ChangesetCatalogReader.ts";
import { ChangesetCommitHooks } from "../../src/services/ChangesetCommitHooks.ts";
import { ChangesetConfigReader } from "../../src/services/ChangesetConfigReader.ts";
import { ChangesetDocumentWriter } from "../../src/services/ChangesetDocumentWriter.ts";
import { ChangesetStatusReporter } from "../../src/services/ChangesetStatusReporter.ts";
import { ChangesetWorkspaceInit } from "../../src/services/ChangesetWorkspaceInit.ts";
import { CliOutput } from "../../src/services/CliOutput.ts";
import { Filesystem } from "../../src/services/Filesystem.ts";
import { Git } from "../../src/services/Git.ts";
import { InteractivePrompts } from "../../src/services/InteractivePrompts.ts";
import { PackageGitTagger } from "../../src/services/PackageGitTagger.ts";
import { PackageVersionabilityPolicy } from "../../src/services/PackageVersionabilityPolicy.ts";
import { PreReleaseStateManager } from "../../src/services/PreReleaseStateManager.ts";
import { ProcessExecution } from "../../src/services/ProcessExecution.ts";
import { RegistryPublish } from "../../src/services/RegistryPublish.ts";
import { ReleasePlanApplier } from "../../src/services/ReleasePlanApplier.ts";
import { ReleasePlanAssembler } from "../../src/services/ReleasePlanAssembler.ts";
import { WorkspacePackageDiscovery } from "../../src/services/WorkspacePackageDiscovery.ts";
import { rootDir, statusJsonPayload } from "./fixtures.ts";

export type AddCommandInput = {
	readonly sinceRef?: string;
	readonly message?: string;
	readonly open?: boolean;
	readonly empty?: boolean;
};

export type AddCommandResult = {
	readonly changesetPath: string;
	readonly draft: ChangesetDraft;
};

export type VersionCommandInput = {
	readonly ignoredPackages?: ReadonlyArray<string>;
	readonly versionMode?: VersionMode;
};

export type PublishCommandInput = {
	readonly distTag?: string;
	readonly otp?: string;
	readonly skipGitTags?: boolean;
};

export type StatusCommandInput = {
	readonly sinceRef?: string;
	readonly verbose?: boolean;
	readonly outputPath?: string;
};

export type PreCommandInput = {
	readonly action: "enter" | "exit";
	readonly tag?: string;
};

const loadWorkspaceContext = Effect.fnUntraced(function* () {
	const workspace = yield* WorkspacePackageDiscovery.use((discovery) =>
		discovery.discover(rootDir),
	);
	const config = yield* ChangesetConfigReader.use((reader) =>
		reader.read(rootDir, workspace),
	);
	return { workspace, config };
});

/** `changeset init`. */
export const initCommand = Effect.fnUntraced(function* () {
	yield* ChangesetWorkspaceInit.use((init) => init.scaffold(rootDir));
});

/** `changeset add` (and default `changeset`). */
export const addCommand = Effect.fnUntraced(function* (
	input: AddCommandInput = {},
) {
	const { workspace, config } = yield* loadWorkspaceContext();
	const changedPackages = yield* ChangedPackageDetection.use((detection) =>
		detection.detectVersionableChangedPackages({
			cwd: rootDir,
			config,
			ref: input.sinceRef,
		}),
	);
	const versionablePackages = yield* Effect.filter(workspace.packages, (pkg) =>
		PackageVersionabilityPolicy.use((policy) =>
			policy.shouldSkip(pkg, config),
		).pipe(Effect.map((skip) => !skip)),
	);
	const selectedPackages =
		input.empty === true
			? []
			: yield* InteractivePrompts.use((prompts) =>
					prompts.selectPackages({
						message: "Which packages would you like to include?",
						packages: versionablePackages,
						changedPackageNames: changedPackages.map(
							(pkg) => pkg.packageJson.name,
						),
					}),
				);
	const releases: Array<{ readonly name: string; readonly type: VersionType }> =
		[];
	for (const packageName of selectedPackages) {
		const bumpType = yield* InteractivePrompts.use((prompts) =>
			prompts.selectBumpType({
				message: "What kind of change is this?",
				packageName,
			}),
		);
		releases.push({ name: packageName, type: bumpType });
	}
	const summary =
		input.message ??
		(yield* InteractivePrompts.use((prompts) =>
			prompts.askSummary({ message: "Summary", initial: input.message }),
		));
	const confirmed = yield* InteractivePrompts.use((prompts) =>
		prompts.confirm("Is this your desired changeset?"),
	);
	if (!confirmed) {
		return { changesetPath: "", draft: { summary: "", releases: [] } };
	}
	const draft: ChangesetDraft = { summary, releases };
	const changesetPath = yield* ChangesetDocumentWriter.use((writer) =>
		writer.write(rootDir, draft, config),
	);
	yield* CliOutput.use((output) =>
		output.success(`Changeset added: ${changesetPath}`),
	);
	const addCommit = yield* ChangesetCommitHooks.use((hooks) =>
		hooks.resolveAddCommitMessage({ rootDir, draft, config }),
	);
	if (addCommit !== undefined) {
		yield* Git.use((git) => git.add(changesetPath, rootDir));
		yield* Git.use((git) => git.commit(addCommit.message, rootDir));
	}
	if (input.open === true) {
		yield* ProcessExecution.use((process) =>
			process.spawnDetached({
				command: "editor",
				args: [changesetPath],
			}),
		);
	}
	return { changesetPath, draft } satisfies AddCommandResult;
});

/** `changeset version`. */
export const versionCommand = Effect.fnUntraced(function* (
	input: VersionCommandInput = {},
) {
	const { workspace, config } = yield* loadWorkspaceContext();
	const preState = yield* PreReleaseStateManager.use((pre) =>
		pre.read(rootDir),
	);
	const changesets = yield* ChangesetCatalogReader.use((reader) =>
		reader.readAll(rootDir),
	);
	const versionMode = input.versionMode ?? defaultVersionMode;
	const plan = yield* ReleasePlanAssembler.use((assembler) =>
		assembler.assemble({
			changesets,
			workspace,
			config,
			preState,
			ignoredPackages: input.ignoredPackages,
			versionMode,
		}),
	);
	yield* ChangelogGenerator.use((changelog) =>
		changelog.generateEntries({
			changesets: plan.changesets,
			releases: plan.releases,
			changelogConfig: config.changelog,
		}),
	);
	yield* ReleasePlanApplier.use((applier) =>
		applier.apply({ rootDir, workspace, config, plan }),
	);
	const versionCommit = yield* ChangesetCommitHooks.use((hooks) =>
		hooks.resolveVersionCommitMessage({ rootDir, plan, config }),
	);
	if (versionCommit !== undefined) {
		yield* Git.use((git) => git.commit(versionCommit.message, rootDir));
	}
	return plan;
});

/** `changeset publish`. */
export const publishCommand = Effect.fnUntraced(function* (
	input: PublishCommandInput = {},
) {
	const { workspace, config } = yield* loadWorkspaceContext();
	const preState = yield* PreReleaseStateManager.use((pre) =>
		pre.read(rootDir),
	);
	const changesets = yield* ChangesetCatalogReader.use((reader) =>
		reader.readAll(rootDir),
	);
	const plan = yield* ReleasePlanAssembler.use((assembler) =>
		assembler.assemble({
			changesets,
			workspace,
			config,
			preState,
			versionMode: defaultVersionMode,
		}),
	);
	yield* RegistryPublish.use((publish) =>
		publish.publish({
			releases: plan.releases,
			cwd: rootDir,
			tag: input.distTag,
			otp: input.otp,
			skipGitTags: input.skipGitTags,
		}),
	);
	if (input.skipGitTags !== true) {
		for (const release of plan.releases) {
			yield* Git.use((git) =>
				git.tag(`${release.name}@${release.newVersion}`, rootDir),
			);
		}
	}
	return plan;
});

/** `changeset status`. */
export const statusCommand = Effect.fnUntraced(function* (
	input: StatusCommandInput = {},
) {
	const { config } = yield* loadWorkspaceContext();
	const plan = yield* ChangesetStatusReporter.use((reporter) =>
		reporter.report({
			rootDir,
			config,
			sinceRef: input.sinceRef,
			verbose: input.verbose ?? false,
		}),
	);
	if (input.outputPath !== undefined) {
		const outputPath = input.outputPath;
		yield* Filesystem.use((filesystem) =>
			filesystem.writeUtf8(outputPath, statusJsonPayload(plan)),
		);
	}
	return plan;
});

/** `changeset pre enter|exit`. */
export const preCommand = Effect.fnUntraced(function* (input: PreCommandInput) {
	if (input.action === "enter") {
		yield* PreReleaseStateManager.use((pre) =>
			pre.enter(rootDir, input.tag ?? "next"),
		);
		return;
	}
	yield* PreReleaseStateManager.use((pre) => pre.exit(rootDir));
});

/** `changeset tag`. */
export const tagCommand = Effect.fnUntraced(function* () {
	const { workspace } = yield* loadWorkspaceContext();
	return yield* PackageGitTagger.use((tagger) =>
		tagger.tagWorkspacePackages({ cwd: rootDir, workspace }),
	);
});
