import { Context, type Effect } from "effect";
import type { ParsedChangesetDocument } from "../domain/changeset-document.ts";
import type { ComprehensiveRelease } from "./ReleasePlanAssembler.ts";

export type ChangelogEntry = {
	readonly packageName: string;
	readonly entry: string;
};

/**
 * Generates changelog entries for releases.
 *
 * Replaces `@changesets/changelog-git`, `@changesets/changelog-github`, and CLI changelog hooks.
 */
export class ChangelogGenerator extends Context.Service<
	ChangelogGenerator,
	{
		readonly generateEntries: (options: {
			readonly changesets: ReadonlyArray<ParsedChangesetDocument>;
			readonly releases: ReadonlyArray<ComprehensiveRelease>;
			readonly changelogConfig: false | readonly [string, unknown];
		}) => Effect.Effect<ReadonlyArray<ChangelogEntry>>;
	}
>()("changes/services/ChangelogGenerator") {}

export type ChangelogGeneratorService = ChangelogGenerator["Service"];
