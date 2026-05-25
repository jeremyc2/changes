import { Effect, Layer } from "effect";
import type { PackageManifest } from "../domain/workspace-package.ts";
import { Filesystem } from "../services/Filesystem.ts";
import { ReleasePlanApplier } from "../services/ReleasePlanApplier.ts";
import type { ReleasePlan } from "../services/ReleasePlanAssembler.ts";
import { encodeJsonStringLine } from "./pure/json-codec.ts";

const dependencyTypes = [
	"dependencies",
	"devDependencies",
	"peerDependencies",
	"optionalDependencies",
] as const;

const updateDependencyRanges = (
	packageJson: PackageManifest,
	versionsToUpdate: ReadonlyArray<{
		readonly name: string;
		readonly version: string;
	}>,
): PackageManifest => {
	const next = { ...packageJson };
	for (const depType of dependencyTypes) {
		const deps = next[depType];
		if (deps === undefined) {
			continue;
		}
		const updatedDeps = { ...deps };
		for (const update of versionsToUpdate) {
			const current = updatedDeps[update.name];
			if (current === undefined || current.startsWith("workspace:")) {
				continue;
			}
			if (current.startsWith("^")) {
				updatedDeps[update.name] = `^${update.version}`;
			} else if (current.startsWith("~")) {
				updatedDeps[update.name] = `~${update.version}`;
			} else {
				updatedDeps[update.name] = update.version;
			}
		}
		next[depType] = updatedDeps;
	}
	return next;
};

const make = Effect.gen(function* () {
	const filesystem = yield* Filesystem;

	const apply = Effect.fnUntraced(function* (options: {
		readonly rootDir: string;
		readonly workspace: Parameters<
			ReleasePlanApplier["Service"]["apply"]
		>[0]["workspace"];
		readonly config: Parameters<
			ReleasePlanApplier["Service"]["apply"]
		>[0]["config"];
		readonly plan: ReleasePlan;
	}) {
		const versionsToUpdate = options.plan.releases.map((release) => ({
			name: release.name,
			version: release.newVersion,
		}));
		for (const pkg of options.workspace.packages) {
			const release = options.plan.releases.find(
				(candidate) => candidate.name === pkg.packageJson.name,
			);
			if (release === undefined) {
				continue;
			}
			const nextManifest = updateDependencyRanges(
				{
					...pkg.packageJson,
					version: release.newVersion,
				},
				versionsToUpdate,
			);
			yield* filesystem.writeUtf8(
				`${pkg.dir}/package.json`,
				encodeJsonStringLine(nextManifest),
			);
			if (options.config.changelog === false) {
				continue;
			}
			const changelogPath = `${pkg.dir}/CHANGELOG.md`;
			const hasChangelog = yield* filesystem.exists(changelogPath);
			const existing = hasChangelog
				? yield* filesystem.readUtf8(changelogPath)
				: `# ${release.name}\n\n`;
			const entryHeader = `\n## ${release.newVersion}\n\n`;
			const entryBody = `${options.plan.changesets
				.filter((changeset) => release.changesets.includes(changeset.id))
				.map((changeset) => `- ${changeset.summary.split("\n")[0]}`)
				.join("\n")}\n`;
			yield* filesystem.writeUtf8(
				changelogPath,
				`${existing}${entryHeader}${entryBody}`,
			);
		}
		for (const changeset of options.plan.changesets) {
			const changesetPath = `${options.rootDir}/.changeset/${changeset.id}.md`;
			const exists = yield* filesystem.exists(changesetPath);
			if (exists) {
				yield* filesystem.remove(changesetPath);
			}
		}
	});

	return ReleasePlanApplier.of({ apply });
});

export const layer = Layer.effect(ReleasePlanApplier, make);
