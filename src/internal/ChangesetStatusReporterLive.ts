import { Effect, Layer } from "effect";
import { defaultVersionMode } from "../domain/version-mode.ts";
import { ChangesetCatalogReader } from "../services/ChangesetCatalogReader.ts";
import {
	ChangesetStatusError,
	ChangesetStatusReporter,
} from "../services/ChangesetStatusReporter.ts";
import { CliOutput } from "../services/CliOutput.ts";
import { PreReleaseStateManager } from "../services/PreReleaseStateManager.ts";
import { ReleasePlanAssembler } from "../services/ReleasePlanAssembler.ts";
import { WorkspacePackageDiscovery } from "../services/WorkspacePackageDiscovery.ts";

const make = Effect.gen(function* () {
	const workspacePackageDiscovery = yield* WorkspacePackageDiscovery;
	const preReleaseStateManager = yield* PreReleaseStateManager;
	const changesetCatalogReader = yield* ChangesetCatalogReader;
	const releasePlanAssembler = yield* ReleasePlanAssembler;
	const cliOutput = yield* CliOutput;

	const report = Effect.fnUntraced(function* (options: {
		readonly rootDir: string;
		readonly config: Parameters<
			ChangesetStatusReporter["Service"]["report"]
		>[0]["config"];
		readonly sinceRef?: string;
		readonly verbose: boolean;
	}) {
		const workspace = yield* workspacePackageDiscovery.discover(
			options.rootDir,
		);
		const preState = yield* preReleaseStateManager.read(options.rootDir);
		const changesets =
			options.sinceRef === undefined
				? yield* changesetCatalogReader.readAll(options.rootDir)
				: yield* changesetCatalogReader.readSinceRef(
						options.rootDir,
						options.sinceRef,
					);
		const plan = yield* releasePlanAssembler.assemble({
			changesets,
			workspace,
			config: options.config,
			preState,
			versionMode: defaultVersionMode,
		});
		if (options.verbose) {
			yield* cliOutput.info(
				`${plan.changesets.length} changesets, ${plan.releases.length} releases`,
			);
		}
		if (plan.changesets.length === 0) {
			yield* cliOutput.error(
				"No changesets found. Run `changes add` or `changes add --empty`.",
			);
			return yield* new ChangesetStatusError({
				message: "No changesets found",
			});
		}
		return plan;
	});

	return ChangesetStatusReporter.of({ report });
});

export const layer = Layer.effect(ChangesetStatusReporter, make);
