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

const make = Effect.gen(function* () {
	const filesystem = yield* Filesystem;

	const readJson = Effect.fnUntraced(function* <T>(path: string) {
		const contents = yield* filesystem.readUtf8(path);
		return parseJsonString(contents) as T;
	});

	const resolveWorkspaceGlobs = Effect.fnUntraced(function* (rootDir: string) {
		const packageJson = yield* readJson<{
			readonly workspaces?: ReadonlyArray<string>;
		}>(`${rootDir}/package.json`);
		if (
			packageJson.workspaces !== undefined &&
			packageJson.workspaces.length > 0
		) {
			return packageJson.workspaces;
		}
		const pnpmWorkspacePath = `${rootDir}/pnpm-workspace.yaml`;
		const hasPnpmWorkspace = yield* filesystem.exists(pnpmWorkspacePath);
		if (hasPnpmWorkspace) {
			const contents = yield* filesystem.readUtf8(pnpmWorkspacePath);
			const packagesLine = contents
				.split("\n")
				.find((line) => line.trim().startsWith("- "));
			if (packagesLine !== undefined) {
				return [packagesLine.replace(/^-\s*["']?|["']?$/g, "").trim()];
			}
		}
		return [] as ReadonlyArray<string>;
	});

	const expandGlob = (
		rootDir: string,
		pattern: string,
	): ReadonlyArray<string> => {
		if (pattern.endsWith("/*")) {
			const base = pattern.slice(0, -2);
			return [`${rootDir}/${base}`];
		}
		return [`${rootDir}/${pattern}`];
	};

	const discover = Effect.fnUntraced(function* (cwd: string) {
		const rootDir = cwd;
		const globs = yield* resolveWorkspaceGlobs(rootDir);
		const packageDirs = globs.flatMap((glob) => expandGlob(rootDir, glob));
		const packages: Array<WorkspacePackage> = [];
		for (const dir of packageDirs) {
			const manifestPath = `${dir}/package.json`;
			const exists = yield* filesystem.exists(manifestPath);
			if (!exists) {
				continue;
			}
			const packageJson = yield* readJson<PackageManifest>(manifestPath);
			if (packageJson.name === undefined) {
				continue;
			}
			packages.push({ dir, packageJson });
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
			tool: "npm" as const,
			packages,
		} satisfies WorkspaceRoot;
	});

	return WorkspacePackageDiscovery.of({
		discover: (cwd) =>
			discover(cwd).pipe(
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
