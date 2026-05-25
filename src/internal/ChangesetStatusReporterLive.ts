import { Effect, Layer } from "effect";
import { defaultVersionMode } from "../domain/version-mode.ts";
import { ChangesetCatalogReader } from "../services/ChangesetCatalogReader.ts";
import { ChangesetStatusReporter } from "../services/ChangesetStatusReporter.ts";
import { CliOutput } from "../services/CliOutput.ts";
import { PreReleaseStateManager } from "../services/PreReleaseStateManager.ts";
import { ReleasePlanAssembler } from "../services/ReleasePlanAssembler.ts";
import { WorkspacePackageDiscovery } from "../services/WorkspacePackageDiscovery.ts";

const make = Effect.gen(function* () {
	const discovery = yield* WorkspacePackageDiscovery;
	const preRelease = yield* PreReleaseStateManager;
	const catalog = yield* ChangesetCatalogReader;
	const assembler = yield* ReleasePlanAssembler;
	const output = yield* CliOutput;

	const report = Effect.fnUntraced(function* (options: {
		readonly rootDir: string;
		readonly config: Parameters<
			ChangesetStatusReporter["Service"]["report"]
		>[0]["config"];
		readonly sinceRef?: string;
		readonly verbose: boolean;
	}) {
		const workspace = yield* discovery.discover(options.rootDir);
		const preState = yield* preRelease.read(options.rootDir);
		const changesets =
			options.sinceRef === undefined
				? yield* catalog.readAll(options.rootDir)
				: yield* catalog.readSinceRef(options.rootDir, options.sinceRef);
		const plan = yield* assembler.assemble({
			changesets,
			workspace,
			config: options.config,
			preState,
			versionMode: defaultVersionMode,
		});
		if (options.verbose) {
			yield* output.info(
				`${plan.changesets.length} changesets, ${plan.releases.length} releases`,
			);
		}
		return plan;
	});

	return ChangesetStatusReporter.of({ report });
});

export const layer = Layer.effect(ChangesetStatusReporter, make);
