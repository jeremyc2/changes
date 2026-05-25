import { assert, layer } from "@effect/vitest";
import { Effect } from "effect";
import { Command } from "effect/unstable/cli";
import { cli } from "../../src/cli/commands.ts";
import { appLayer } from "../../src/layers/index.ts";
import { Filesystem } from "../../src/services/Filesystem.ts";

const runCli = Command.runWith(cli, { version: "0.0.0" });

layer(appLayer)("CLI live", (it) => {
	it.effect("init scaffolds a changeset workspace in a temp directory", () =>
		Effect.gen(function* () {
			const filesystem = yield* Filesystem;
			const directory = `/tmp/changes-live-${process.pid}-${performance.now()}`;
			yield* filesystem.ensureDirectory(directory);
			yield* Effect.addFinalizer(() =>
				filesystem.remove(directory).pipe(Effect.catch(() => Effect.void)),
			);
			yield* filesystem.writeUtf8(
				`${directory}/package.json`,
				'{"name":"live-root","version":"1.0.0","private":true}\n',
			);
			const previousCwd = process.cwd();
			yield* Effect.acquireRelease(
				Effect.sync(() => {
					process.chdir(directory);
					return previousCwd;
				}),
				(previous) => Effect.sync(() => process.chdir(previous)),
			);
			yield* runCli(["init"]);
			const configExists = yield* filesystem.exists(
				`${directory}/.changeset/config.json`,
			);
			assert.strictEqual(configExists, true);
		}),
	);
});
