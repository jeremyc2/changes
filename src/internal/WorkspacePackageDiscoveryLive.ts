import { Effect, Layer } from "effect";
import type {
	PackageManifest,
	WorkspacePackage,
	WorkspaceRoot,
} from "../domain/workspace-package.ts";
import { Filesystem } from "../services/Filesystem.ts";
import {
	WorkspaceDiscoveryError,
	WorkspacePackageDiscovery,
} from "../services/WorkspacePackageDiscovery.ts";
import { parseJsonString } from "./pure/json-codec.ts";

type WorkspacesConfig =
	| ReadonlyArray<string>
	| { readonly packages?: ReadonlyArray<string> };

type RootPackageJson = {
	readonly workspaces?: WorkspacesConfig;
};

const isWorkspaceObject = (
	workspaces: WorkspacesConfig | undefined,
): workspaces is { readonly packages?: ReadonlyArray<string> } =>
	workspaces !== undefined && !Array.isArray(workspaces);

const make = Effect.gen(function* () {
	const filesystem = yield* Filesystem;

	const readJson = Effect.fnUntraced(function* <T>(path: string) {
		const contents = yield* filesystem.readUtf8(path);
		return parseJsonString(contents) as T;
	});

	const stripQuotes = (value: string): string => {
		const trimmed = value.trim();
		if (
			(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
			(trimmed.startsWith("'") && trimmed.endsWith("'"))
		) {
			return trimmed.slice(1, -1);
		}
		return trimmed;
	};

	const parsePnpmWorkspacePackages = (
		contents: string,
	): ReadonlyArray<string> => {
		const packages: Array<string> = [];
		let inPackagesBlock = false;
		for (const line of contents.split("\n")) {
			const trimmed = line.trim();
			if (trimmed === "" || trimmed.startsWith("#")) {
				continue;
			}
			if (trimmed === "packages:") {
				inPackagesBlock = true;
				continue;
			}
			if (!inPackagesBlock || !trimmed.startsWith("- ")) {
				if (
					inPackagesBlock &&
					!line.startsWith(" ") &&
					!line.startsWith("\t")
				) {
					inPackagesBlock = false;
				}
				continue;
			}
			packages.push(stripQuotes(trimmed.slice(2)));
		}
		return packages;
	};

	const resolveWorkspaceGlobs = Effect.fnUntraced(function* (rootDir: string) {
		const packageJson = yield* readJson<RootPackageJson>(
			`${rootDir}/package.json`,
		);
		const { workspaces } = packageJson;
		if (Array.isArray(workspaces)) {
			return workspaces;
		}
		if (isWorkspaceObject(workspaces) && workspaces.packages !== undefined) {
			return workspaces.packages;
		}
		const pnpmWorkspacePath = `${rootDir}/pnpm-workspace.yaml`;
		const hasPnpmWorkspace = yield* filesystem.exists(pnpmWorkspacePath);
		if (hasPnpmWorkspace) {
			const contents = yield* filesystem.readUtf8(pnpmWorkspacePath);
			return parsePnpmWorkspacePackages(contents);
		}
		return [] as ReadonlyArray<string>;
	});

	const detectTool = Effect.fnUntraced(function* (rootDir: string) {
		if (yield* filesystem.exists(`${rootDir}/pnpm-workspace.yaml`)) {
			return "pnpm" as const;
		}
		if (yield* filesystem.exists(`${rootDir}/pnpm-lock.yaml`)) {
			return "pnpm" as const;
		}
		if (yield* filesystem.exists(`${rootDir}/bun.lock`)) {
			return "bun" as const;
		}
		if (yield* filesystem.exists(`${rootDir}/bun.lockb`)) {
			return "bun" as const;
		}
		if (yield* filesystem.exists(`${rootDir}/yarn.lock`)) {
			return "yarn" as const;
		}
		return "npm" as const;
	});

	const wildcardMatch = (value: string, pattern: string): boolean => {
		const parts = pattern.split("*");
		if (parts.length === 1) {
			return value === pattern;
		}
		const firstPart = parts[0] ?? "";
		if (!value.startsWith(firstPart)) {
			return false;
		}
		let cursor = firstPart.length;
		for (const part of parts.slice(1, -1)) {
			const index = value.indexOf(part, cursor);
			if (index === -1) {
				return false;
			}
			cursor = index + part.length;
		}
		const lastPart = parts.at(-1) ?? "";
		return lastPart === "" || value.slice(cursor).endsWith(lastPart);
	};

	const normalizePattern = (pattern: string): string =>
		pattern
			.trim()
			.split("/")
			.filter((part) => part !== "" && part !== ".")
			.join("/");

	const listDirectory = Effect.fnUntraced(function* (path: string) {
		return yield* filesystem
			.readDirectory(path)
			.pipe(Effect.catch(() => Effect.succeed([] as ReadonlyArray<string>)));
	});

	const pathHasPackageManifest = (path: string) =>
		filesystem.exists(`${path}/package.json`);

	const expandPattern = Effect.fnUntraced(function* (
		rootDir: string,
		pattern: string,
	) {
		const normalized = normalizePattern(pattern);
		if (normalized === "") {
			return [] as ReadonlyArray<string>;
		}
		const segments = normalized.split("/");
		const matches = new Set<string>();
		const visit = (
			currentDir: string,
			remaining: ReadonlyArray<string>,
		): Effect.Effect<void> =>
			Effect.gen(function* () {
				const [segment, ...rest] = remaining;
				if (segment === undefined) {
					if (yield* pathHasPackageManifest(currentDir)) {
						matches.add(currentDir);
					}
					return;
				}
				if (segment === "**") {
					yield* visit(currentDir, rest);
					for (const entry of yield* listDirectory(currentDir)) {
						const nextDir = `${currentDir}/${entry}`;
						if (yield* filesystem.exists(nextDir)) {
							yield* visit(nextDir, remaining);
						}
					}
					return;
				}
				if (segment.includes("*")) {
					for (const entry of yield* listDirectory(currentDir)) {
						if (wildcardMatch(entry, segment)) {
							yield* visit(`${currentDir}/${entry}`, rest);
						}
					}
					return;
				}
				yield* visit(`${currentDir}/${segment}`, rest);
			});
		yield* visit(rootDir, segments);
		return [...matches].sort();
	});

	const discover = Effect.fnUntraced(function* (workspaceRootDir: string) {
		const rootDir = workspaceRootDir;
		const globs: ReadonlyArray<string> = yield* resolveWorkspaceGlobs(rootDir);
		const includeGlobs = globs.filter((glob) => !glob.startsWith("!"));
		const excludeGlobs = globs
			.filter((glob) => glob.startsWith("!"))
			.map((glob) => glob.slice(1));
		const packageDirSet = new Set<string>();
		for (const glob of includeGlobs) {
			for (const packageDir of yield* expandPattern(rootDir, glob)) {
				packageDirSet.add(packageDir);
			}
		}
		for (const glob of excludeGlobs) {
			for (const packageDir of yield* expandPattern(rootDir, glob)) {
				packageDirSet.delete(packageDir);
			}
		}
		const packageDirs = [...packageDirSet].sort();
		const packages: Array<WorkspacePackage> = [];
		for (const packageDir of packageDirs) {
			const manifestPath = `${packageDir}/package.json`;
			const exists = yield* filesystem.exists(manifestPath);
			if (!exists) {
				continue;
			}
			const packageJson = yield* readJson<PackageManifest>(manifestPath);
			if (packageJson.name === undefined) {
				continue;
			}
			packages.push({ dir: packageDir, packageJson });
		}
		if (packages.length === 0) {
			const rootManifest = yield* readJson<PackageManifest>(
				`${rootDir}/package.json`,
			);
			if (rootManifest.name !== undefined) {
				packages.push({ dir: rootDir, packageJson: rootManifest });
			}
		}
		return {
			dir: rootDir,
			tool: yield* detectTool(rootDir),
			packages,
		} satisfies WorkspaceRoot;
	});

	return WorkspacePackageDiscovery.of({
		discover: (workspaceRootDir) =>
			discover(workspaceRootDir).pipe(
				Effect.mapError(
					(cause) =>
						new WorkspaceDiscoveryError({
							message: cause instanceof Error ? cause.message : String(cause),
						}),
				),
			),
	});
});

export const layer = Layer.effect(WorkspacePackageDiscovery, make);
