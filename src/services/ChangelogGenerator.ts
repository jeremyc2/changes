import { Context, type Effect } from "effect";
import type { ParsedChangeDocument } from "../domain/change-document.ts";
import type { ComprehensiveRelease } from "./ReleasePlanAssembler.ts";

export type ChangelogEntry = {
	readonly packageName: string;
	readonly entry: string;
};

/**
 * Generates changelog entries for releases.
 *
 * Replaces upstream changelog hooks.
 */
export class ChangelogGenerator extends Context.Service<
	ChangelogGenerator,
	{
		readonly generateEntries: (options: {
			readonly changes: ReadonlyArray<ParsedChangeDocument>;
			readonly releases: ReadonlyArray<ComprehensiveRelease>;
			readonly changelogConfig: false | readonly [string, unknown];
		}) => Effect.Effect<ReadonlyArray<ChangelogEntry>>;
	}
>()("changes/services/ChangelogGenerator") {}

export type ChangelogGeneratorService = ChangelogGenerator["Service"];
