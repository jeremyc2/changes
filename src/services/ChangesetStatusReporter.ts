import { Context, type Effect } from "effect";
import type { ChangesetConfig } from "../domain/changeset-config.ts";
import type { ReleasePlan } from "./ReleasePlanAssembler.ts";

/**
 * Reports unreleased changeset status for the `status` command.
 */
export class ChangesetStatusReporter extends Context.Service<
	ChangesetStatusReporter,
	{
		readonly report: (options: {
			readonly rootDir: string;
			readonly config: ChangesetConfig;
			readonly sinceRef?: string;
			readonly verbose: boolean;
		}) => Effect.Effect<ReleasePlan>;
	}
>()("changes/services/ChangesetStatusReporter") {}

export type ChangesetStatusReporterService = ChangesetStatusReporter["Service"];
