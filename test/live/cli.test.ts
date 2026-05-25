import { assert, layer } from "@effect/vitest";
import { Effect } from "effect";
import { Command } from "effect/unstable/cli";
import { cli } from "../../src/cli/commands.ts";
import type { ChangesetConfig } from "../../src/domain/changeset-config.ts";
import {
	encodeJsonStringLine,
	parseJsonString,
} from "../../src/internal/pure/json-codec.ts";
import { appLayer } from "../../src/layers/index.ts";
import { ChangesetStatusReporter } from "../../src/services/ChangesetStatusReporter.ts";
import { Filesystem } from "../../src/services/Filesystem.ts";
import { PreReleaseStateManager } from "../../src/services/PreReleaseStateManager.ts";
import { ReleasePlanApplier } from "../../src/services/ReleasePlanApplier.ts";
import { WorkspacePackageDiscovery } from "../../src/services/WorkspacePackageDiscovery.ts";

const runCli = Command.runWith(cli, { version: "0.0.0" });

const tempDirectory = (name: string): string =>
	`/tmp/changes-live-${name}-${process.pid}-${performance.now()}`;

const withTempDirectory = <A, E, R>(
	name: string,
	run: (directory: string) => Effect.Effect<A, E, R>,
) =>
	Effect.gen(function* () {
		const filesystem = yield* Filesystem;
		const directory = tempDirectory(name);
		yield* filesystem.ensureDirectory(directory);
		yield* Effect.addFinalizer(() =>
			filesystem.remove(directory).pipe(Effect.catch(() => Effect.void)),
		);
		return yield* run(directory);
	});

const writeJson = (
	filesystem: Filesystem["Service"],
	path: string,
	value: unknown,
) => filesystem.writeUtf8(path, encodeJsonStringLine(value));

const liveConfig = (
	overrides: Partial<ChangesetConfig> = {},
): ChangesetConfig => ({
	changelog: ["@changesets/cli/changelog", null],
	commit: false,
	fixed: [],
	linked: [],
	access: "restricted",
	baseBranch: "main",
	changedFilePatterns: ["**"],
	prettier: false,
	privatePackages: { version: false, tag: false },
	ignore: [],
	updateInternalDependencies: "patch",
	...overrides,
});

layer(appLayer)("CLI live", (it) => {
	it.effect("init scaffolds a changeset workspace in a temp directory", () =>
		Effect.gen(function* () {
			const filesystem = yield* Filesystem;
			yield* withTempDirectory("init", (directory) =>
				Effect.gen(function* () {
					yield* writeJson(filesystem, `${directory}/package.json`, {
						name: "live-root",
						version: "1.0.0",
						private: true,
					});
					const previousCwd = process.cwd();
					yield* Effect.acquireRelease(
						Effect.sync(() => {
							process.chdir(directory);
							return previousCwd;
						}),
						(previous) => Effect.sync(() => process.chdir(previous)),
					);
					yield* runCli(["init"]);
					const configExists = yield* filesystem.exists(
						`${directory}/.changeset/config.json`,
					);
					assert.strictEqual(configExists, true);
				}),
			);
		}),
	);

	it.effect("discovers package.json workspaces with nested globs", () =>
		Effect.gen(function* () {
			const filesystem = yield* Filesystem;
			const workspacePackageDiscovery = yield* WorkspacePackageDiscovery;
			yield* withTempDirectory("workspaces", (directory) =>
				Effect.gen(function* () {
					yield* writeJson(filesystem, `${directory}/package.json`, {
						name: "root",
						version: "1.0.0",
						private: true,
						workspaces: ["packages/*", "examples/*/fixtures/*"],
					});
					yield* filesystem.ensureDirectory(`${directory}/packages/a`);
					yield* filesystem.ensureDirectory(`${directory}/packages/b`);
					yield* filesystem.ensureDirectory(`${directory}/packages/c`);
					yield* filesystem.ensureDirectory(
						`${directory}/examples/demo/fixtures/c`,
					);
					yield* writeJson(filesystem, `${directory}/packages/a/package.json`, {
						name: "pkg-a",
						version: "1.0.0",
					});
					yield* writeJson(filesystem, `${directory}/packages/b/package.json`, {
						name: "pkg-b",
						version: "1.0.0",
					});
					yield* writeJson(
						filesystem,
						`${directory}/examples/demo/fixtures/c/package.json`,
						{ name: "pkg-c", version: "1.0.0" },
					);
					const workspace =
						yield* workspacePackageDiscovery.discover(directory);
					assert.deepStrictEqual(
						workspace.packages.map(
							(workspacePackage) => workspacePackage.packageJson.name,
						),
						["pkg-c", "pkg-a", "pkg-b"],
					);
					assert.strictEqual(workspace.tool, "npm");
				}),
			);
		}),
	);

	it.effect("discovers pnpm workspaces and applies exclusions", () =>
		Effect.gen(function* () {
			const filesystem = yield* Filesystem;
			const workspacePackageDiscovery = yield* WorkspacePackageDiscovery;
			yield* withTempDirectory("pnpm", (directory) =>
				Effect.gen(function* () {
					yield* writeJson(filesystem, `${directory}/package.json`, {
						name: "root",
						version: "1.0.0",
						private: true,
					});
					yield* filesystem.writeUtf8(
						`${directory}/pnpm-workspace.yaml`,
						'packages:\n  - "packages/*"\n  - "!packages/private-*"\n',
					);
					yield* filesystem.ensureDirectory(`${directory}/packages/public-a`);
					yield* filesystem.ensureDirectory(`${directory}/packages/private-b`);
					yield* writeJson(
						filesystem,
						`${directory}/packages/public-a/package.json`,
						{ name: "public-a", version: "1.0.0" },
					);
					yield* writeJson(
						filesystem,
						`${directory}/packages/private-b/package.json`,
						{ name: "private-b", version: "1.0.0" },
					);
					const workspace =
						yield* workspacePackageDiscovery.discover(directory);
					assert.deepStrictEqual(
						workspace.packages.map(
							(workspacePackage) => workspacePackage.packageJson.name,
						),
						["public-a"],
					);
					assert.strictEqual(workspace.tool, "pnpm");
				}),
			);
		}),
	);

	it.effect(
		"applies release plans with workspace dependency ranges and generated changelog entries",
		() =>
			Effect.gen(function* () {
				const filesystem = yield* Filesystem;
				const releasePlanApplier = yield* ReleasePlanApplier;
				yield* withTempDirectory("apply", (directory) =>
					Effect.gen(function* () {
						yield* filesystem.ensureDirectory(`${directory}/packages/a`);
						yield* filesystem.ensureDirectory(`${directory}/packages/b`);
						yield* filesystem.ensureDirectory(`${directory}/packages/c`);
						yield* filesystem.ensureDirectory(`${directory}/.changeset`);
						const pkgA = {
							name: "pkg-a",
							version: "1.0.0",
						};
						const pkgB = {
							name: "pkg-b",
							version: "1.0.0",
							dependencies: {
								"pkg-a": "workspace:^1.0.0",
								"pkg-c": "workspace:*",
							},
						};
						const pkgC = {
							name: "pkg-c",
							version: "1.0.0",
						};
						yield* writeJson(
							filesystem,
							`${directory}/packages/a/package.json`,
							pkgA,
						);
						yield* writeJson(
							filesystem,
							`${directory}/packages/b/package.json`,
							pkgB,
						);
						yield* writeJson(
							filesystem,
							`${directory}/packages/c/package.json`,
							pkgC,
						);
						yield* filesystem.writeUtf8(
							`${directory}/.changeset/release.md`,
							'---\n"pkg-a": minor\n"pkg-b": patch\n---\n\nOriginal summary\n',
						);
						yield* releasePlanApplier.apply({
							rootDir: directory,
							config: liveConfig({ updateInternalDependencies: "minor" }),
							workspace: {
								dir: directory,
								tool: "npm",
								packages: [
									{ dir: `${directory}/packages/a`, packageJson: pkgA },
									{ dir: `${directory}/packages/b`, packageJson: pkgB },
									{ dir: `${directory}/packages/c`, packageJson: pkgC },
								],
							},
							plan: {
								changesets: [
									{
										id: "release",
										summary: "Original summary",
										releases: [
											{ name: "pkg-a", type: "minor" },
											{ name: "pkg-b", type: "patch" },
										],
									},
								],
								releases: [
									{
										name: "pkg-a",
										type: "minor",
										oldVersion: "1.0.0",
										newVersion: "1.1.0",
										changesets: ["release"],
									},
									{
										name: "pkg-b",
										type: "patch",
										oldVersion: "1.0.0",
										newVersion: "1.0.1",
										changesets: ["release"],
									},
									{
										name: "pkg-c",
										type: "minor",
										oldVersion: "1.0.0",
										newVersion: "1.1.0",
										changesets: ["release"],
									},
								],
								preState: undefined,
								versionMode: { _tag: "default" },
							},
							changelogEntries: [
								{ packageName: "pkg-a", entry: "- Generated pkg-a line" },
								{ packageName: "pkg-b", entry: "- Generated pkg-b line" },
							],
						});
						const updatedPkgB = parseJsonString(
							yield* filesystem.readUtf8(
								`${directory}/packages/b/package.json`,
							),
						) as typeof pkgB;
						assert.strictEqual(updatedPkgB.version, "1.0.1");
						assert.strictEqual(
							updatedPkgB.dependencies["pkg-a"],
							"workspace:^1.1.0",
						);
						assert.strictEqual(
							updatedPkgB.dependencies["pkg-c"],
							"workspace:*",
						);
						const changelogContents = yield* filesystem.readUtf8(
							`${directory}/packages/b/CHANGELOG.md`,
						);
						assert.include(changelogContents, "- Generated pkg-b line");
						assert.notInclude(changelogContents, "- Original summary");
						assert.strictEqual(
							yield* filesystem.exists(`${directory}/.changeset/release.md`),
							false,
						);
					}),
				);
			}),
	);

	it.effect("pre enter snapshots workspace package initial versions", () =>
		Effect.gen(function* () {
			const filesystem = yield* Filesystem;
			const preReleaseStateManager = yield* PreReleaseStateManager;
			yield* withTempDirectory("pre", (directory) =>
				Effect.gen(function* () {
					yield* writeJson(filesystem, `${directory}/package.json`, {
						name: "root",
						version: "1.0.0",
						private: true,
						workspaces: ["packages/*"],
					});
					yield* filesystem.ensureDirectory(`${directory}/packages/a`);
					yield* filesystem.ensureDirectory(`${directory}/packages/b`);
					yield* writeJson(filesystem, `${directory}/packages/a/package.json`, {
						name: "pkg-a",
						version: "1.2.3",
					});
					yield* writeJson(filesystem, `${directory}/packages/b/package.json`, {
						name: "pkg-b",
						version: "2.0.0",
					});
					yield* preReleaseStateManager.enter(directory, "next");
					const preState = parseJsonString(
						yield* filesystem.readUtf8(`${directory}/.changeset/pre.json`),
					) as {
						readonly initialVersions: Readonly<Record<string, string>>;
						readonly mode: string;
						readonly tag: string;
					};
					assert.deepStrictEqual(preState.initialVersions, {
						"pkg-a": "1.2.3",
						"pkg-b": "2.0.0",
					});
					assert.strictEqual(preState.mode, "pre");
					assert.strictEqual(preState.tag, "next");
				}),
			);
		}),
	);

	it.effect(
		"status ignores the changeset readme and fails when no changesets exist",
		() =>
			Effect.gen(function* () {
				const filesystem = yield* Filesystem;
				const reporter = yield* ChangesetStatusReporter;
				yield* withTempDirectory("status", (directory) =>
					Effect.gen(function* () {
						yield* writeJson(filesystem, `${directory}/package.json`, {
							name: "single-package",
							version: "1.0.0",
						});
						yield* filesystem.ensureDirectory(`${directory}/.changeset`);
						yield* filesystem.writeUtf8(
							`${directory}/.changeset/README.md`,
							"# Changesets\n\nHello and welcome!\n",
						);
						const error = yield* reporter
							.report({
								rootDir: directory,
								config: liveConfig(),
								verbose: false,
							})
							.pipe(Effect.flip);
						assert.strictEqual(error._tag, "ChangesetStatusError");
					}),
				);
			}),
	);
});
