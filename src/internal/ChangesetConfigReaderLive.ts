import { Effect, Layer, Schema } from "effect";
import type { ChangesetConfig } from "../domain/changeset-config.ts";
import { defaultWrittenConfig } from "../domain/pre-release-state.ts";
import type { WorkspaceRoot } from "../domain/workspace-package.ts";
import {
	ChangesetConfigReadError,
	ChangesetConfigReader,
} from "../services/ChangesetConfigReader.ts";
import { Filesystem } from "../services/Filesystem.ts";
import { globMatch, globMatchAny } from "./pure/glob-match.ts";
import { parseJsonString } from "./pure/json-codec.ts";

const normalizeChangelog = (value: unknown): ChangesetConfig["changelog"] => {
	if (value === false) {
		return false;
	}
	if (
		value === "@changesets/cli/changelog" ||
		value === defaultWrittenConfig.changelog
	) {
		return ["@changesets/cli/changelog", null];
	}
	return false;
};

const normalizeCommit = (value: unknown): ChangesetConfig["commit"] => {
	if (value === false) {
		return false;
	}
	if (value === true) {
		return ["@changesets/cli/commit", { skipCI: "version" }];
	}
	if (value === "@changesets/cli/commit") {
		return ["@changesets/cli/commit", null];
	}
	return false;
};

const make = Effect.gen(function* () {
	const filesystem = yield* Filesystem;

	const read = Effect.fnUntraced(function* (
		rootDir: string,
		workspace: WorkspaceRoot,
	) {
		const configPath = `${rootDir}/.changeset/config.json`;
		const exists = yield* filesystem.exists(configPath);
		if (!exists) {
			return yield* new ChangesetConfigReadError({
				message: "Missing .changeset/config.json — run `changeset init` first.",
			});
		}
		const contents = yield* filesystem.readUtf8(configPath);
		const json = parseJsonString(contents) as Record<string, unknown>;
		const packageNames = workspace.packages.map((pkg) => pkg.packageJson.name);
		for (const pattern of (json["ignore"] as
			| ReadonlyArray<string>
			| undefined) ?? []) {
			if (!packageNames.some((name) => globMatch(name, pattern))) {
				continue;
			}
			if (!globMatchAny(pattern, packageNames)) {
			}
		}
		return {
			changelog: normalizeChangelog(
				json["changelog"] ?? defaultWrittenConfig.changelog,
			),
			commit: normalizeCommit(json["commit"] ?? defaultWrittenConfig.commit),
			fixed: (json["fixed"] as ChangesetConfig["fixed"] | undefined) ?? [],
			linked: (json["linked"] as ChangesetConfig["linked"] | undefined) ?? [],
			access:
				(json["access"] as ChangesetConfig["access"] | undefined) ??
				defaultWrittenConfig.access,
			baseBranch:
				(json["baseBranch"] as string | undefined) ??
				defaultWrittenConfig.baseBranch,
			changedFilePatterns:
				(json["changedFilePatterns"] as
					| ChangesetConfig["changedFilePatterns"]
					| undefined) ?? defaultWrittenConfig.changedFilePatterns,
			prettier:
				(json["prettier"] as boolean | undefined) ??
				defaultWrittenConfig.prettier,
			privatePackages:
				(json["privatePackages"] as
					| ChangesetConfig["privatePackages"]
					| undefined) ?? defaultWrittenConfig.privatePackages,
			ignore: (json["ignore"] as ChangesetConfig["ignore"] | undefined) ?? [],
			updateInternalDependencies:
				(json["updateInternalDependencies"] as
					| ChangesetConfig["updateInternalDependencies"]
					| undefined) ?? defaultWrittenConfig.updateInternalDependencies,
			bumpVersionsWithWorkspaceProtocolOnly: json[
				"bumpVersionsWithWorkspaceProtocolOnly"
			] as boolean | undefined,
			snapshot: json["snapshot"] as ChangesetConfig["snapshot"] | undefined,
		} satisfies ChangesetConfig;
	});

	return ChangesetConfigReader.of({
		read: (rootDir, workspace) =>
			read(rootDir, workspace).pipe(
				Effect.mapError((cause) =>
					Schema.is(ChangesetConfigReadError)(cause)
						? cause
						: new ChangesetConfigReadError({
								message: cause instanceof Error ? cause.message : String(cause),
							}),
				),
			),
	});
});

export const layer = Layer.effect(ChangesetConfigReader, make);
