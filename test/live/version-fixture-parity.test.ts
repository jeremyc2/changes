import { assert, layer } from "@effect/vitest";
import { Effect } from "effect";
import { versionCommand } from "../../src/commands/index.ts";
import type { ChangesetConfig } from "../../src/domain/changeset-config.ts";
import type { ChangesetDraft } from "../../src/domain/changeset-document.ts";
import { snapshotVersionMode } from "../../src/domain/version-mode.ts";
import type { PackageManifest } from "../../src/domain/workspace-package.ts";
import {
	encodeJsonStringLine,
	parseJsonString,
} from "../../src/internal/pure/json-codec.ts";
import { appLayer } from "../../src/layers/index.ts";
import { Filesystem } from "../../src/services/Filesystem.ts";

const tempDirectory = (name: string): string =>
	`/tmp/changes-version-fixture-${name}-${process.pid}-${performance.now()}`;

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

const writePackage = (
	filesystem: Filesystem["Service"],
	rootDir: string,
	packagePath: string,
	manifest: PackageManifest,
) =>
	Effect.gen(function* () {
		const packageDir =
			packagePath === "." ? rootDir : `${rootDir}/${packagePath}`;
		yield* filesystem.ensureDirectory(packageDir);
		yield* writeJson(filesystem, `${packageDir}/package.json`, manifest);
	});

const writeChangeset = (
	filesystem: Filesystem["Service"],
	rootDir: string,
	id: string,
	changeset: ChangesetDraft,
) =>
	filesystem.writeUtf8(
		`${rootDir}/.changeset/${id}.md`,
		`---\n${changeset.releases
			.map((release) => `"${release.name}": ${release.type}`)
			.join("\n")}\n---\n\n${changeset.summary}\n`,
	);

const setupWorkspace = (options: {
	readonly name: string;
	readonly workspaces?: ReadonlyArray<string>;
	readonly packages: Readonly<Record<string, PackageManifest>>;
	readonly changesets: ReadonlyArray<ChangesetDraft>;
	readonly config?: Partial<ChangesetConfig>;
}) =>
	withTempDirectory(options.name, (directory) =>
		Effect.gen(function* () {
			const filesystem = yield* Filesystem;
			yield* writeJson(filesystem, `${directory}/package.json`, {
				private: true,
				workspaces: options.workspaces ?? ["packages/*"],
			});
			yield* filesystem.ensureDirectory(`${directory}/.changeset`);
			yield* writeJson(filesystem, `${directory}/.changeset/config.json`, {
				changelog: false,
				commit: false,
				...options.config,
			});
			for (const [packagePath, manifest] of Object.entries(options.packages)) {
				yield* writePackage(filesystem, directory, packagePath, manifest);
			}
			let index = 0;
			for (const changeset of options.changesets) {
				yield* writeChangeset(
					filesystem,
					directory,
					`fixture-${index++}`,
					changeset,
				);
			}
			return directory;
		}),
	);

const readPackage = (
	filesystem: Filesystem["Service"],
	rootDir: string,
	packagePath: string,
) =>
	Effect.gen(function* () {
		const packageDir =
			packagePath === "." ? rootDir : `${rootDir}/${packagePath}`;
		return parseJsonString(
			yield* filesystem.readUtf8(`${packageDir}/package.json`),
		) as PackageManifest;
	});

const readPackagesByPath = (
	filesystem: Filesystem["Service"],
	rootDir: string,
	paths: ReadonlyArray<string>,
) =>
	Effect.gen(function* () {
		const packages: Record<string, PackageManifest> = {};
		for (const packagePath of paths) {
			packages[packagePath] = yield* readPackage(
				filesystem,
				rootDir,
				packagePath,
			);
		}
		return packages;
	});

layer(appLayer)("version fixture parity", (it) => {
	it.effect("bumps released packages from a single changeset", () =>
		Effect.gen(function* () {
			const filesystem = yield* Filesystem;
			yield* setupWorkspace({
				name: "basic-bump",
				packages: {
					"packages/pkg-a": {
						name: "pkg-a",
						version: "1.0.0",
						dependencies: { "pkg-b": "1.0.0" },
					},
					"packages/pkg-b": { name: "pkg-b", version: "1.0.0" },
				},
				changesets: [
					{
						summary: "This is a summary too",
						releases: [
							{ name: "pkg-a", type: "minor" },
							{ name: "pkg-b", type: "patch" },
						],
					},
				],
			}).pipe(
				Effect.flatMap((directory) =>
					Effect.gen(function* () {
						yield* versionCommand(directory);
						const packages = yield* readPackagesByPath(filesystem, directory, [
							"packages/pkg-a",
							"packages/pkg-b",
						]);
						assert.strictEqual(packages["packages/pkg-a"]?.version, "1.1.0");
						assert.strictEqual(packages["packages/pkg-b"]?.version, "1.0.1");
					}),
				),
			);
		}),
	);

	it.effect("deletes consumed changeset files after versioning", () =>
		Effect.gen(function* () {
			const filesystem = yield* Filesystem;
			yield* setupWorkspace({
				name: "delete-consumed",
				packages: {
					"packages/pkg-a": { name: "pkg-a", version: "1.0.0" },
				},
				changesets: [
					{
						summary: "A useful summary",
						releases: [{ name: "pkg-a", type: "patch" }],
					},
				],
			}).pipe(
				Effect.flatMap((directory) =>
					Effect.gen(function* () {
						yield* versionCommand(directory);
						assert.strictEqual(
							yield* filesystem.exists(`${directory}/.changeset/fixture-0.md`),
							false,
						);
					}),
				),
			);
		}),
	);

	it.effect(
		"updates dependency ranges in ignored dependents without bumping them",
		() =>
			Effect.gen(function* () {
				const filesystem = yield* Filesystem;
				yield* setupWorkspace({
					name: "ignored-dependent",
					packages: {
						"packages/pkg-a": {
							name: "pkg-a",
							version: "1.0.0",
							dependencies: { "pkg-b": "1.0.0" },
						},
						"packages/pkg-b": { name: "pkg-b", version: "1.0.0" },
					},
					changesets: [
						{
							summary: "This is not a summary",
							releases: [{ name: "pkg-b", type: "patch" }],
						},
					],
					config: {
						fixed: [["pkg-a", "pkg-b"]],
						ignore: ["pkg-a"],
					},
				}).pipe(
					Effect.flatMap((directory) =>
						Effect.gen(function* () {
							yield* versionCommand(directory);
							const pkgA = yield* readPackage(
								filesystem,
								directory,
								"packages/pkg-a",
							);
							const pkgB = yield* readPackage(
								filesystem,
								directory,
								"packages/pkg-b",
							);
							assert.strictEqual(pkgA.version, "1.0.0");
							assert.strictEqual(pkgA.dependencies?.["pkg-b"], "1.0.1");
							assert.strictEqual(pkgB.version, "1.0.1");
						}),
					),
				);
			}),
	);

	it.effect(
		"bumps every package in a fixed group to the same calculated version",
		() =>
			Effect.gen(function* () {
				const filesystem = yield* Filesystem;
				yield* setupWorkspace({
					name: "fixed-group",
					packages: {
						"packages/pkg-a": {
							name: "pkg-a",
							version: "1.0.0",
							dependencies: { "pkg-b": "1.0.0" },
						},
						"packages/pkg-b": { name: "pkg-b", version: "1.0.0" },
					},
					changesets: [
						{
							summary: "This is a summary",
							releases: [{ name: "pkg-a", type: "minor" }],
						},
					],
					config: { fixed: [["pkg-a", "pkg-b"]] },
				}).pipe(
					Effect.flatMap((directory) =>
						Effect.gen(function* () {
							yield* versionCommand(directory);
							const packages = yield* readPackagesByPath(
								filesystem,
								directory,
								["packages/pkg-a", "packages/pkg-b"],
							);
							assert.strictEqual(packages["packages/pkg-a"]?.version, "1.1.0");
							assert.strictEqual(packages["packages/pkg-b"]?.version, "1.1.0");
						}),
					),
				);
			}),
	);

	it.effect("bumps linked packages from the highest current version", () =>
		Effect.gen(function* () {
			const filesystem = yield* Filesystem;
			yield* setupWorkspace({
				name: "linked-group",
				packages: {
					"packages/pkg-a": {
						name: "pkg-a",
						version: "1.0.0",
						dependencies: { "pkg-b": "0.1.0" },
					},
					"packages/pkg-b": { name: "pkg-b", version: "0.1.0" },
				},
				changesets: [
					{
						summary: "This is a summary too",
						releases: [
							{ name: "pkg-a", type: "minor" },
							{ name: "pkg-b", type: "patch" },
						],
					},
				],
				config: { linked: [["pkg-a", "pkg-b"]] },
			}).pipe(
				Effect.flatMap((directory) =>
					Effect.gen(function* () {
						yield* versionCommand(directory);
						const packages = yield* readPackagesByPath(filesystem, directory, [
							"packages/pkg-a",
							"packages/pkg-b",
						]);
						assert.strictEqual(packages["packages/pkg-a"]?.version, "1.1.0");
						assert.strictEqual(packages["packages/pkg-b"]?.version, "1.1.0");
					}),
				),
			);
		}),
	);

	it.effect("does not bump a dependent using an npm tag range", () =>
		Effect.gen(function* () {
			const filesystem = yield* Filesystem;
			yield* setupWorkspace({
				name: "npm-tag-dependent",
				workspaces: ["examples/*", "packages/*"],
				packages: {
					"packages/pkg-a": { name: "pkg-a", version: "1.0.0" },
					"examples/example-a": {
						name: "example-a",
						version: "1.0.0",
						dependencies: { "pkg-a": "latest" },
					},
				},
				changesets: [
					{
						summary: "A very useful summary for the change",
						releases: [{ name: "pkg-a", type: "major" }],
					},
				],
			}).pipe(
				Effect.flatMap((directory) =>
					Effect.gen(function* () {
						yield* versionCommand(directory);
						const example = yield* readPackage(
							filesystem,
							directory,
							"examples/example-a",
						);
						const pkgA = yield* readPackage(
							filesystem,
							directory,
							"packages/pkg-a",
						);
						assert.strictEqual(example.version, "1.0.0");
						assert.strictEqual(example.dependencies?.["pkg-a"], "latest");
						assert.strictEqual(pkgA.version, "2.0.0");
					}),
				),
			);
		}),
	);

	it.effect("updates explicit workspace dependency ranges", () =>
		Effect.gen(function* () {
			const filesystem = yield* Filesystem;
			yield* setupWorkspace({
				name: "workspace-explicit",
				packages: {
					"packages/pkg-a": {
						name: "pkg-a",
						version: "1.0.0",
						dependencies: { "pkg-b": "workspace:1.0.0" },
					},
					"packages/pkg-b": { name: "pkg-b", version: "1.0.0" },
				},
				changesets: [
					{
						summary: "This is a summary too",
						releases: [
							{ name: "pkg-a", type: "minor" },
							{ name: "pkg-b", type: "patch" },
						],
					},
				],
			}).pipe(
				Effect.flatMap((directory) =>
					Effect.gen(function* () {
						yield* versionCommand(directory);
						const pkgA = yield* readPackage(
							filesystem,
							directory,
							"packages/pkg-a",
						);
						assert.strictEqual(pkgA.version, "1.1.0");
						assert.strictEqual(pkgA.dependencies?.["pkg-b"], "workspace:1.0.1");
					}),
				),
			);
		}),
	);

	it.effect(
		"bumps dependents of workspace star ranges without rewriting the range",
		() =>
			Effect.gen(function* () {
				const filesystem = yield* Filesystem;
				yield* setupWorkspace({
					name: "workspace-star",
					packages: {
						"packages/pkg-a": {
							name: "pkg-a",
							version: "1.0.0",
							dependencies: { "pkg-b": "workspace:*" },
						},
						"packages/pkg-b": { name: "pkg-b", version: "1.0.0" },
					},
					changesets: [
						{
							summary: "A very useful summary for the change",
							releases: [{ name: "pkg-b", type: "patch" }],
						},
					],
				}).pipe(
					Effect.flatMap((directory) =>
						Effect.gen(function* () {
							yield* versionCommand(directory);
							const packages = yield* readPackagesByPath(
								filesystem,
								directory,
								["packages/pkg-a", "packages/pkg-b"],
							);
							assert.strictEqual(packages["packages/pkg-a"]?.version, "1.0.1");
							assert.strictEqual(
								packages["packages/pkg-a"]?.dependencies?.["pkg-b"],
								"workspace:*",
							);
							assert.strictEqual(packages["packages/pkg-b"]?.version, "1.0.1");
						}),
					),
				);
			}),
	);

	it.effect(
		"does not bump dependents of workspace caret ranges for patch bumps",
		() =>
			Effect.gen(function* () {
				const filesystem = yield* Filesystem;
				yield* setupWorkspace({
					name: "workspace-caret",
					packages: {
						"packages/pkg-a": {
							name: "pkg-a",
							version: "1.0.0",
							dependencies: { "pkg-b": "workspace:^" },
						},
						"packages/pkg-b": { name: "pkg-b", version: "1.0.0" },
					},
					changesets: [
						{
							summary: "A very useful summary for the change",
							releases: [{ name: "pkg-b", type: "patch" }],
						},
					],
				}).pipe(
					Effect.flatMap((directory) =>
						Effect.gen(function* () {
							yield* versionCommand(directory);
							const packages = yield* readPackagesByPath(
								filesystem,
								directory,
								["packages/pkg-a", "packages/pkg-b"],
							);
							assert.strictEqual(packages["packages/pkg-a"]?.version, "1.0.0");
							assert.strictEqual(
								packages["packages/pkg-a"]?.dependencies?.["pkg-b"],
								"workspace:^",
							);
							assert.strictEqual(packages["packages/pkg-b"]?.version, "1.0.1");
						}),
					),
				);
			}),
	);

	it.effect("bumps dependents of workspace tilde ranges for minor bumps", () =>
		Effect.gen(function* () {
			const filesystem = yield* Filesystem;
			yield* setupWorkspace({
				name: "workspace-tilde",
				packages: {
					"packages/pkg-a": {
						name: "pkg-a",
						version: "1.0.0",
						dependencies: { "pkg-b": "workspace:~" },
					},
					"packages/pkg-b": { name: "pkg-b", version: "1.0.0" },
				},
				changesets: [
					{
						summary: "A very useful summary for the change",
						releases: [{ name: "pkg-b", type: "minor" }],
					},
				],
			}).pipe(
				Effect.flatMap((directory) =>
					Effect.gen(function* () {
						yield* versionCommand(directory);
						const packages = yield* readPackagesByPath(filesystem, directory, [
							"packages/pkg-a",
							"packages/pkg-b",
						]);
						assert.strictEqual(packages["packages/pkg-a"]?.version, "1.0.1");
						assert.strictEqual(
							packages["packages/pkg-a"]?.dependencies?.["pkg-b"],
							"workspace:~",
						);
						assert.strictEqual(packages["packages/pkg-b"]?.version, "1.1.0");
					}),
				),
			);
		}),
	);

	it.effect(
		"updates the same package across dependency sections without a dependent bump",
		() =>
			Effect.gen(function* () {
				const filesystem = yield* Filesystem;
				yield* setupWorkspace({
					name: "mixed-dependency-types",
					packages: {
						"packages/pkg-a": {
							name: "pkg-a",
							version: "1.0.0",
							peerDependencies: { "pkg-b": "^1.0.0" },
							devDependencies: { "pkg-b": "1.0.0" },
						},
						"packages/pkg-b": { name: "pkg-b", version: "1.0.0" },
					},
					changesets: [
						{
							summary: "A very useful summary for the first change",
							releases: [{ name: "pkg-b", type: "patch" }],
						},
					],
				}).pipe(
					Effect.flatMap((directory) =>
						Effect.gen(function* () {
							yield* versionCommand(directory);
							const packages = yield* readPackagesByPath(
								filesystem,
								directory,
								["packages/pkg-a", "packages/pkg-b"],
							);
							assert.strictEqual(packages["packages/pkg-a"]?.version, "1.0.0");
							assert.strictEqual(
								packages["packages/pkg-a"]?.peerDependencies?.["pkg-b"],
								"^1.0.1",
							);
							assert.strictEqual(
								packages["packages/pkg-a"]?.devDependencies?.["pkg-b"],
								"1.0.1",
							);
							assert.strictEqual(packages["packages/pkg-b"]?.version, "1.0.1");
						}),
					),
				);
			}),
	);

	it.effect(
		"snapshot useCalculatedVersion keeps explicit none releases stable",
		() =>
			Effect.gen(function* () {
				const filesystem = yield* Filesystem;
				yield* setupWorkspace({
					name: "snapshot-calculated-none",
					packages: {
						"packages/pkg-a": { name: "pkg-a", version: "1.0.0" },
						"packages/pkg-b": { name: "pkg-b", version: "1.0.0" },
						"packages/pkg-c": { name: "pkg-c", version: "1.0.0" },
					},
					changesets: [
						{
							summary: "This is a summary too",
							releases: [
								{ name: "pkg-a", type: "minor" },
								{ name: "pkg-b", type: "patch" },
								{ name: "pkg-c", type: "none" },
							],
						},
					],
					config: {
						snapshot: {
							useCalculatedVersion: true,
							prereleaseTemplate: undefined,
						},
					},
				}).pipe(
					Effect.flatMap((directory) =>
						Effect.gen(function* () {
							yield* versionCommand(directory, {
								versionMode: snapshotVersionMode("experimental"),
							});
							const packages = yield* readPackagesByPath(
								filesystem,
								directory,
								["packages/pkg-a", "packages/pkg-b", "packages/pkg-c"],
							);
							assert.strictEqual(
								packages["packages/pkg-a"]?.version.startsWith(
									"1.1.0-experimental-",
								),
								true,
							);
							assert.strictEqual(
								packages["packages/pkg-b"]?.version.startsWith(
									"1.0.1-experimental-",
								),
								true,
							);
							assert.strictEqual(packages["packages/pkg-c"]?.version, "1.0.0");
						}),
					),
				);
			}),
	);
});
