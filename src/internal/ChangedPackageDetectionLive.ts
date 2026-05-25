import { Effect, Layer } from "effect";
import { ChangedPackageDetection } from "../services/ChangedPackageDetection.ts";
import { Git } from "../services/Git.ts";
import { PackageVersionabilityPolicy } from "../services/PackageVersionabilityPolicy.ts";
import { WorkspacePackageDiscovery } from "../services/WorkspacePackageDiscovery.ts";
import { globMatchAny } from "./pure/glob-match.ts";

const make = Effect.gen(function* () {
	const gitClient = yield* Git;
	const workspacePackageDiscovery = yield* WorkspacePackageDiscovery;
	const packageVersionabilityPolicy = yield* PackageVersionabilityPolicy;

	const detectVersionableChangedPackages = Effect.fnUntraced(
		function* (options: {
			readonly cwd: string;
			readonly config: Parameters<
				ChangedPackageDetection["Service"]["detectVersionableChangedPackages"]
			>[0]["config"];
			readonly ref?: string;
		}) {
			const workspace = yield* workspacePackageDiscovery.discover(options.cwd);
			const gitRef = options.ref ?? options.config.baseBranch;
			const changedFiles = yield* gitClient.getChangedFilesSinceRef({
				cwd: options.cwd,
				ref: gitRef,
			});
			const changedPackages = [];
			for (const workspacePackage of workspace.packages) {
				const skip = yield* packageVersionabilityPolicy.shouldSkip(
					workspacePackage,
					options.config,
				);
				if (skip) {
					continue;
				}
				const relativeDir = workspacePackage.dir.replace(`${options.cwd}/`, "");
				const changed = changedFiles.some(
					(file) =>
						file.startsWith(relativeDir === "" ? "" : `${relativeDir}/`) &&
						globMatchAny(file, options.config.changedFilePatterns),
				);
				if (changed) {
					changedPackages.push(workspacePackage);
				}
			}
			return changedPackages;
		},
	);

	return ChangedPackageDetection.of({ detectVersionableChangedPackages });
});

export const layer = Layer.effect(ChangedPackageDetection, make);
