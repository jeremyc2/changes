import { Effect } from "effect";
import { Prompt } from "effect/unstable/cli";
import type { ChangesetConfig } from "../domain/changeset-config.ts";
import type {
	ChangesetDraft,
	Release,
	VersionType,
} from "../domain/changeset-document.ts";
import { versionTypes } from "../domain/changeset-document.ts";
import {
	defaultVersionMode,
	type VersionMode,
} from "../domain/version-mode.ts";
import { ChangedPackageDetection } from "../services/ChangedPackageDetection.ts";
import { ChangelogGenerator } from "../services/ChangelogGenerator.ts";
import { ChangesetCatalogReader } from "../services/ChangesetCatalogReader.ts";
import { ChangesetCommitHooks } from "../services/ChangesetCommitHooks.ts";
import { ChangesetConfigReader } from "../services/ChangesetConfigReader.ts";
import { ChangesetDocumentWriter } from "../services/ChangesetDocumentWriter.ts";
import { ChangesetStatusReporter } from "../services/ChangesetStatusReporter.ts";
import { ChangesetWorkspaceInit } from "../services/ChangesetWorkspaceInit.ts";
import { CliOutput } from "../services/CliOutput.ts";
import { Filesystem } from "../services/Filesystem.ts";
import { Git } from "../services/Git.ts";
import { PackageGitTagger } from "../services/PackageGitTagger.ts";
import { PackageVersionabilityPolicy } from "../services/PackageVersionabilityPolicy.ts";
import { PreReleaseStateManager } from "../services/PreReleaseStateManager.ts";
import { ProcessExecution } from "../services/ProcessExecution.ts";
import { RegistryPublish } from "../services/RegistryPublish.ts";
import { ReleasePlanApplier } from "../services/ReleasePlanApplier.ts";
import { ReleasePlanAssembler } from "../services/ReleasePlanAssembler.ts";
import { WorkspacePackageDiscovery } from "../services/WorkspacePackageDiscovery.ts";

export type AddCommandInput = {
	readonly sinceRef?: string;
	readonly message?: string;
	readonly open?: boolean;
	readonly empty?: boolean;
	/** When set, skips interactive package and bump prompts. */
	readonly releases?: ReadonlyArray<Release>;
	/** When set, skips the confirmation prompt. */
	readonly confirmed?: boolean;
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

export const loadWorkspaceContext = Effect.fnUntraced(function* (
	rootDir: string,
) {
	const workspace = yield* WorkspacePackageDiscovery.use(
		(workspacePackageDiscovery) => workspacePackageDiscovery.discover(rootDir),
	);
	const config = yield* ChangesetConfigReader.use((changesetConfigReader) =>
		changesetConfigReader.read(rootDir, workspace),
	);
	return { workspace, config };
});

export const initCommand = Effect.fnUntraced(function* (rootDir: string) {
	yield* ChangesetWorkspaceInit.use((changesetWorkspaceInit) =>
		changesetWorkspaceInit.scaffold(rootDir),
	);
});

export const completeAddChangeset = Effect.fnUntraced(function* (options: {
	readonly rootDir: string;
	readonly input: AddCommandInput;
	readonly config: ChangesetConfig;
	readonly summary: string;
	readonly releases: ReadonlyArray<Release>;
	readonly confirmed: boolean;
}) {
	if (!options.confirmed) {
		return {
			changesetPath: "",
			draft: { summary: "", releases: [] },
		} satisfies AddCommandResult;
	}
	const draft: ChangesetDraft = {
		summary: options.summary,
		releases: options.releases,
	};
	const changesetPath = yield* ChangesetDocumentWriter.use(
		(changesetDocumentWriter) =>
			changesetDocumentWriter.write(options.rootDir, draft, options.config),
	);
	yield* CliOutput.use((cliOutput) =>
		cliOutput.success(`Changeset added: ${changesetPath}`),
	);
	const addCommit = yield* ChangesetCommitHooks.use((changesetCommitHooks) =>
		changesetCommitHooks.resolveAddCommitMessage({
			rootDir: options.rootDir,
			draft,
			config: options.config,
		}),
	);
	if (addCommit !== undefined) {
		yield* Git.use((gitClient) =>
			gitClient.add(changesetPath, options.rootDir),
		);
		yield* Git.use((gitClient) =>
			gitClient.commit(addCommit.message, options.rootDir),
		);
	}
	if (options.input.open === true) {
		yield* ProcessExecution.use((processExecution) =>
			processExecution.spawnDetached({
				command: "editor",
				args: [changesetPath],
			}),
		);
	}
	return { changesetPath, draft } satisfies AddCommandResult;
});

/** Non-interactive `add` when releases (and optionally message/confirmed) are supplied upfront. */
export const addCommandWithDraft = Effect.fnUntraced(function* (
	rootDir: string,
	input: AddCommandInput = {},
) {
	const { config } = yield* loadWorkspaceContext(rootDir);
	const releases = input.empty === true ? [] : (input.releases ?? []);
	const summary = input.message ?? "";
	const confirmed = input.confirmed ?? true;
	return yield* completeAddChangeset({
		rootDir,
		input,
		config,
		summary,
		releases,
		confirmed,
	});
});

export const addCommand = Effect.fnUntraced(function* (
	rootDir: string,
	input: AddCommandInput = {},
) {
	if (input.empty === true) {
		return yield* addCommandWithDraft(rootDir, input);
	}
	const { workspace, config } = yield* loadWorkspaceContext(rootDir);
	const changedPackages = yield* ChangedPackageDetection.use(
		(changedPackageDetection) =>
			changedPackageDetection.detectVersionableChangedPackages({
				cwd: rootDir,
				config,
				ref: input.sinceRef,
			}),
	);
	const versionablePackages = yield* Effect.filter(
		workspace.packages,
		(workspacePackage) =>
			PackageVersionabilityPolicy.use((packageVersionabilityPolicy) =>
				packageVersionabilityPolicy.shouldSkip(workspacePackage, config),
			).pipe(Effect.map((skip) => !skip)),
	);
	const selectedPackages = yield* Prompt.run(
		Prompt.multiSelect({
			message: "Which packages would you like to include?",
			choices: versionablePackages.map((workspacePackage) => ({
				title: workspacePackage.packageJson.name,
				value: workspacePackage.packageJson.name,
				selected: changedPackages.some(
					(changedPackage) =>
						changedPackage.packageJson.name ===
						workspacePackage.packageJson.name,
				),
			})),
		}),
	);
	const releases: Array<{ readonly name: string; readonly type: VersionType }> =
		[];
	for (const packageName of selectedPackages) {
		const bumpType = yield* Prompt.run(
			Prompt.select({
				message: `What kind of change is this? (${packageName})`,
				choices: versionTypes.map((type) => ({
					title: type,
					value: type,
				})),
			}),
		);
		releases.push({ name: packageName, type: bumpType });
	}
	const summary =
		input.message ??
		(yield* Prompt.run(
			Prompt.text({
				message: "Summary",
				default: input.message,
			}),
		));
	const confirmed = yield* Prompt.run(
		Prompt.confirm({ message: "Is this your desired changeset?" }),
	);
	return yield* completeAddChangeset({
		rootDir,
		input,
		config,
		summary,
		releases,
		confirmed,
	});
});

export const versionCommand = Effect.fnUntraced(function* (
	rootDir: string,
	input: VersionCommandInput = {},
) {
	const { workspace, config } = yield* loadWorkspaceContext(rootDir);
	const preState = yield* PreReleaseStateManager.use((preReleaseStateManager) =>
		preReleaseStateManager.read(rootDir),
	);
	const changesets = yield* ChangesetCatalogReader.use(
		(changesetCatalogReader) => changesetCatalogReader.readAll(rootDir),
	);
	const versionMode = input.versionMode ?? defaultVersionMode;
	const plan = yield* ReleasePlanAssembler.use((releasePlanAssembler) =>
		releasePlanAssembler.assemble({
			changesets,
			workspace,
			config,
			preState,
			ignoredPackages: input.ignoredPackages,
			versionMode,
		}),
	);
	const changelogEntries = yield* ChangelogGenerator.use((changelogGenerator) =>
		changelogGenerator.generateEntries({
			changesets: plan.changesets,
			releases: plan.releases,
			changelogConfig: config.changelog,
		}),
	);
	yield* ReleasePlanApplier.use((releasePlanApplier) =>
		releasePlanApplier.apply({
			rootDir,
			workspace,
			config,
			plan,
			changelogEntries,
		}),
	);
	const versionCommit = yield* ChangesetCommitHooks.use(
		(changesetCommitHooks) =>
			changesetCommitHooks.resolveVersionCommitMessage({
				rootDir,
				plan,
				config,
			}),
	);
	if (versionCommit !== undefined) {
		yield* Git.use((gitClient) =>
			gitClient.commit(versionCommit.message, rootDir),
		);
	}
	return plan;
});

export const publishCommand = Effect.fnUntraced(function* (
	rootDir: string,
	input: PublishCommandInput = {},
) {
	const { workspace, config } = yield* loadWorkspaceContext(rootDir);
	const preState = yield* PreReleaseStateManager.use((preReleaseStateManager) =>
		preReleaseStateManager.read(rootDir),
	);
	const changesets = yield* ChangesetCatalogReader.use(
		(changesetCatalogReader) => changesetCatalogReader.readAll(rootDir),
	);
	const plan = yield* ReleasePlanAssembler.use((releasePlanAssembler) =>
		releasePlanAssembler.assemble({
			changesets,
			workspace,
			config,
			preState,
			versionMode: defaultVersionMode,
		}),
	);
	yield* RegistryPublish.use((registryPublish) =>
		registryPublish.publish({
			releases: plan.releases,
			workspace,
			cwd: rootDir,
			access: config.access,
			tag: input.distTag,
			otp: input.otp,
			skipGitTags: input.skipGitTags,
		}),
	);
	if (input.skipGitTags !== true) {
		for (const release of plan.releases) {
			yield* Git.use((gitClient) =>
				gitClient.tag(`${release.name}@${release.newVersion}`, rootDir),
			);
		}
	}
	return plan;
});

export const statusCommand = Effect.fnUntraced(function* (
	rootDir: string,
	input: StatusCommandInput = {},
) {
	const { config } = yield* loadWorkspaceContext(rootDir);
	const plan = yield* ChangesetStatusReporter.use((changesetStatusReporter) =>
		changesetStatusReporter.report({
			rootDir,
			config,
			sinceRef: input.sinceRef,
			verbose: input.verbose ?? false,
		}),
	);
	if (input.outputPath !== undefined) {
		const outputPath = input.outputPath;
		yield* Filesystem.use((filesystem) =>
			filesystem.writeUtf8(
				outputPath,
				JSON.stringify({
					changesets: plan.changesets.length,
					releases: plan.releases.map((release) => ({
						name: release.name,
						newVersion: release.newVersion,
					})),
				}),
			),
		);
	}
	return plan;
});

export const preCommand = Effect.fnUntraced(function* (
	rootDir: string,
	input: PreCommandInput,
) {
	if (input.action === "enter") {
		yield* PreReleaseStateManager.use((preReleaseStateManager) =>
			preReleaseStateManager.enter(rootDir, input.tag ?? "next"),
		);
		return;
	}
	yield* PreReleaseStateManager.use((preReleaseStateManager) =>
		preReleaseStateManager.exit(rootDir),
	);
});

export const tagCommand = Effect.fnUntraced(function* (rootDir: string) {
	const { workspace } = yield* loadWorkspaceContext(rootDir);
	return yield* PackageGitTagger.use((packageGitTagger) =>
		packageGitTagger.tagWorkspacePackages({ cwd: rootDir, workspace }),
	);
});
