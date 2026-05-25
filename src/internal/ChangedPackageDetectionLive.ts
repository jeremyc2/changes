import { Effect, Layer } from "effect";
import { ChangedPackageDetection } from "../services/ChangedPackageDetection.ts";
import { Git } from "../services/Git.ts";
import { PackageVersionabilityPolicy } from "../services/PackageVersionabilityPolicy.ts";
import { WorkspacePackageDiscovery } from "../services/WorkspacePackageDiscovery.ts";
import { globMatchAny } from "./pure/glob-match.ts";

const make = Effect.gen(function* () {
	const git = yield* Git;
	const discovery = yield* WorkspacePackageDiscovery;
	const policy = yield* PackageVersionabilityPolicy;

	const detectVersionableChangedPackages = Effect.fnUntraced(
		function* (options: {
			readonly cwd: string;
			readonly config: Parameters<
				ChangedPackageDetection["Service"]["detectVersionableChangedPackages"]
			>[0]["config"];
			readonly ref?: string;
		}) {
			const workspace = yield* discovery.discover(options.cwd);
			const ref = options.ref ?? options.config.baseBranch;
			const changedFiles = yield* git.getChangedFilesSinceRef({
				cwd: options.cwd,
				ref,
			});
			const changedPackages = [];
			for (const pkg of workspace.packages) {
				const skip = yield* policy.shouldSkip(pkg, options.config);
				if (skip) {
					continue;
				}
				const relativeDir = pkg.dir.replace(`${options.cwd}/`, "");
				const changed = changedFiles.some(
					(file) =>
						file.startsWith(relativeDir === "" ? "" : `${relativeDir}/`) &&
						globMatchAny(file, options.config.changedFilePatterns),
				);
				if (changed) {
					changedPackages.push(pkg);
				}
			}
			return changedPackages;
		},
	);

	return ChangedPackageDetection.of({ detectVersionableChangedPackages });
});

export const layer = Layer.effect(ChangedPackageDetection, make);
