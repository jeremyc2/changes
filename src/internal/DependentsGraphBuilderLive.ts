import { Effect, Layer } from "effect";
import type { WorkspacePackage } from "../domain/workspace-package.ts";
import {
	type DependentsGraph,
	DependentsGraphBuilder,
} from "../services/DependentsGraphBuilder.ts";
import { satisfiesSemver } from "./pure/semver.ts";

const dependencyTypes = [
	"dependencies",
	"devDependencies",
	"peerDependencies",
	"optionalDependencies",
] as const;

const getAllDependencies = (
	packageJson: WorkspacePackage["packageJson"],
	ignoreDevDependencies: boolean,
): ReadonlyMap<string, string> => {
	const allDependencies = new Map<string, string>();
	for (const type of dependencyTypes) {
		const deps = packageJson[type];
		if (deps === undefined) {
			continue;
		}
		for (const [name, depRange] of Object.entries(deps)) {
			if (
				type === "devDependencies" &&
				(ignoreDevDependencies ||
					depRange.startsWith("link:") ||
					depRange.startsWith("file:"))
			) {
				continue;
			}
			allDependencies.set(name, depRange);
		}
	}
	return allDependencies;
};

const isProtocolRange = (range: string): boolean => range.includes(":");

const buildDependencyGraph = (
	workspacePackages: ReadonlyArray<WorkspacePackage>,
	rootPackage: WorkspacePackage,
	bumpVersionsWithWorkspaceProtocolOnly: boolean,
): Map<string, ReadonlyArray<string>> => {
	const packagesByName = new Map<string, WorkspacePackage>();
	packagesByName.set(rootPackage.packageJson.name, rootPackage);
	for (const pkg of workspacePackages) {
		packagesByName.set(pkg.packageJson.name, pkg);
	}
	const relativePathsByName = new Map<string, string>();
	relativePathsByName.set(rootPackage.packageJson.name, ".");
	for (const pkg of workspacePackages) {
		relativePathsByName.set(
			pkg.packageJson.name,
			pkg.dir.replace(`${rootPackage.dir}/`, ""),
		);
	}
	const graph = new Map<string, ReadonlyArray<string>>();
	const queue = [rootPackage, ...workspacePackages];
	for (const pkg of queue) {
		const { name } = pkg.packageJson;
		const dependencies: Array<string> = [];
		const allDependencies = getAllDependencies(pkg.packageJson, false);
		for (const [depName, rawDepRange] of allDependencies) {
			const match = packagesByName.get(depName);
			if (match === undefined) {
				continue;
			}
			let depRange = rawDepRange;
			const usesWorkspaceRange = depRange.startsWith("workspace:");
			if (usesWorkspaceRange) {
				depRange = depRange.replace(/^workspace:/, "");
				if (depRange === "*" || depRange === "^" || depRange === "~") {
					dependencies.push(depName);
					continue;
				}
				const relativePath = relativePathsByName.get(depName);
				if (relativePath !== undefined && depRange === relativePath) {
					dependencies.push(depName);
					continue;
				}
			} else if (bumpVersionsWithWorkspaceProtocolOnly) {
				continue;
			}
			if (isProtocolRange(depRange) && !usesWorkspaceRange) {
				continue;
			}
			if (
				!usesWorkspaceRange &&
				!satisfiesSemver(match.packageJson.version, depRange)
			) {
				continue;
			}
			dependencies.push(depName);
		}
		graph.set(name, dependencies);
	}
	return graph;
};

const buildDependentsGraph = (
	dependencyGraph: ReadonlyMap<string, ReadonlyArray<string>>,
): DependentsGraph => {
	const dependents = new Map<string, Array<string>>();
	for (const [pkgName] of dependencyGraph) {
		dependents.set(pkgName, []);
	}
	for (const [pkgName, dependencies] of dependencyGraph) {
		for (const dependency of dependencies) {
			const existing = dependents.get(dependency) ?? [];
			existing.push(pkgName);
			dependents.set(dependency, existing);
		}
	}
	return dependents;
};

export const layer = Layer.succeed(
	DependentsGraphBuilder,
	DependentsGraphBuilder.of({
		build: (workspace) =>
			Effect.sync(() => {
				const rootPackage: WorkspacePackage = {
					dir: workspace.dir,
					packageJson: {
						name: workspace.dir.split("/").pop() ?? "root",
						version: "0.0.0",
					},
				};
				const dependencyGraph = buildDependencyGraph(
					workspace.packages,
					rootPackage,
					false,
				);
				return buildDependentsGraph(dependencyGraph);
			}),
	}),
);
