import { Effect, Layer, Schema } from "effect";
import type { ChangeConfig } from "../domain/change-config.ts";
import { defaultWrittenConfig } from "../domain/pre-release-state.ts";
import type { WorkspaceRoot } from "../domain/workspace-package.ts";
import {
	ChangeConfigReadError,
	ChangeConfigReader,
} from "../services/ChangeConfigReader.ts";
import { Filesystem } from "../services/Filesystem.ts";
import { globMatch, globMatchAny } from "./pure/glob-match.ts";
import { parseJsonString } from "./pure/json-codec.ts";

const normalizeChangelog = (value: unknown): ChangeConfig["changelog"] => {
	if (value === false) {
		return false;
	}
	if (value === defaultWrittenConfig.changelog) {
		return [defaultWrittenConfig.changelog, null];
	}
	return false;
};

const normalizeCommit = (value: unknown): ChangeConfig["commit"] => {
	if (value === false) {
		return false;
	}
	if (value === true) {
		return ["changes/commit", { skipCI: "version" }];
	}
	if (value === "changes/commit") {
		return ["changes/commit", null];
	}
	return false;
};

const make = Effect.gen(function* () {
	const filesystem = yield* Filesystem;

	const read = Effect.fnUntraced(function* (
		rootDir: string,
		workspace: WorkspaceRoot,
	) {
		const configPath = `${rootDir}/.changes/config.json`;
		const exists = yield* filesystem.exists(configPath);
		if (!exists) {
			return yield* new ChangeConfigReadError({
				message: "Missing .changes/config.json — run `changes init` first.",
			});
		}
		const contents = yield* filesystem.readUtf8(configPath);
		const json = parseJsonString(contents) as Record<string, unknown>;
		const packageNames = workspace.packages.map(
			(workspacePackage) => workspacePackage.packageJson.name,
		);
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
			fixed: (json["fixed"] as ChangeConfig["fixed"] | undefined) ?? [],
			linked: (json["linked"] as ChangeConfig["linked"] | undefined) ?? [],
			access:
				(json["access"] as ChangeConfig["access"] | undefined) ??
				defaultWrittenConfig.access,
			baseBranch:
				(json["baseBranch"] as string | undefined) ??
				defaultWrittenConfig.baseBranch,
			changedFilePatterns:
				(json["changedFilePatterns"] as
					| ChangeConfig["changedFilePatterns"]
					| undefined) ?? defaultWrittenConfig.changedFilePatterns,
			prettier:
				(json["prettier"] as boolean | undefined) ??
				defaultWrittenConfig.prettier,
			privatePackages:
				(json["privatePackages"] as
					| ChangeConfig["privatePackages"]
					| undefined) ?? defaultWrittenConfig.privatePackages,
			ignore: (json["ignore"] as ChangeConfig["ignore"] | undefined) ?? [],
			updateInternalDependencies:
				(json["updateInternalDependencies"] as
					| ChangeConfig["updateInternalDependencies"]
					| undefined) ?? defaultWrittenConfig.updateInternalDependencies,
			bumpVersionsWithWorkspaceProtocolOnly: json[
				"bumpVersionsWithWorkspaceProtocolOnly"
			] as boolean | undefined,
			snapshot: json["snapshot"] as ChangeConfig["snapshot"] | undefined,
		} satisfies ChangeConfig;
	});

	return ChangeConfigReader.of({
		read: (rootDir, workspace) =>
			read(rootDir, workspace).pipe(
				Effect.mapError((cause) =>
					Schema.is(ChangeConfigReadError)(cause)
						? cause
						: new ChangeConfigReadError({
								message: cause instanceof Error ? cause.message : String(cause),
							}),
				),
			),
	});
});

export const layer = Layer.effect(ChangeConfigReader, make);
