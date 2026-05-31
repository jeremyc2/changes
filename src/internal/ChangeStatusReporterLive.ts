import { Effect, Layer } from "effect";
import { defaultVersionMode } from "../domain/version-mode.ts";
import { ChangeCatalogReader } from "../services/ChangeCatalogReader.ts";
import {
	ChangeStatusError,
	ChangeStatusReporter,
} from "../services/ChangeStatusReporter.ts";
import { CliOutput } from "../services/CliOutput.ts";
import { PreReleaseStateManager } from "../services/PreReleaseStateManager.ts";
import { ReleasePlanAssembler } from "../services/ReleasePlanAssembler.ts";
import { WorkspacePackageDiscovery } from "../services/WorkspacePackageDiscovery.ts";

const make = Effect.gen(function* () {
	const workspacePackageDiscovery = yield* WorkspacePackageDiscovery;
	const preReleaseStateManager = yield* PreReleaseStateManager;
	const changeCatalogReader = yield* ChangeCatalogReader;
	const releasePlanAssembler = yield* ReleasePlanAssembler;
	const cliOutput = yield* CliOutput;

	const report = Effect.fnUntraced(function* (options: {
		readonly rootDir: string;
		readonly config: Parameters<
			ChangeStatusReporter["Service"]["report"]
		>[0]["config"];
		readonly sinceRef?: string;
		readonly verbose: boolean;
	}) {
		const workspace = yield* workspacePackageDiscovery.discover(
			options.rootDir,
		);
		const preState = yield* preReleaseStateManager.read(options.rootDir);
		const changes =
			options.sinceRef === undefined
				? yield* changeCatalogReader.readAll(options.rootDir)
				: yield* changeCatalogReader.readSinceRef(
						options.rootDir,
						options.sinceRef,
					);
		const plan = yield* releasePlanAssembler.assemble({
			changes,
			workspace,
			config: options.config,
			preState,
			versionMode: defaultVersionMode,
		});
		if (options.verbose) {
			yield* cliOutput.info(
				`${plan.changes.length} changes, ${plan.releases.length} releases`,
			);
		}
		if (plan.changes.length === 0) {
			yield* cliOutput.error(
				"No changes found. Run `changes add` or `changes add --empty`.",
			);
			return yield* new ChangeStatusError({
				message: "No changes found",
			});
		}
		return plan;
	});

	return ChangeStatusReporter.of({ report });
});

export const layer = Layer.effect(ChangeStatusReporter, make);
