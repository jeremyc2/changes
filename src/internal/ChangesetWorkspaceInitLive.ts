import { Effect, Layer } from "effect";
import { defaultWrittenConfig } from "../domain/pre-release-state.ts";
import {
	ChangesetWorkspaceInit,
	ChangesetWorkspaceInitError,
} from "../services/ChangesetWorkspaceInit.ts";
import { Filesystem } from "../services/Filesystem.ts";
import { encodeJsonStringLine } from "./pure/json-codec.ts";

const make = Effect.gen(function* () {
	const filesystem = yield* Filesystem;

	const scaffold = Effect.fnUntraced(function* (rootDir: string) {
		const changesetDir = `${rootDir}/.changeset`;
		yield* filesystem.ensureDirectory(changesetDir);
		const configPath = `${changesetDir}/config.json`;
		const exists = yield* filesystem.exists(configPath);
		if (exists) {
			return yield* new ChangesetWorkspaceInitError({
				message: "It looks like changesets is already initialized",
			});
		}
		yield* filesystem.writeUtf8(
			configPath,
			encodeJsonStringLine(defaultWrittenConfig),
		);
		yield* filesystem.writeUtf8(
			`${changesetDir}/README.md`,
			"# Changesets\n\nHello and welcome!\n",
		);
	});

	return ChangesetWorkspaceInit.of({ scaffold });
});

export const layer = Layer.effect(ChangesetWorkspaceInit, make);
