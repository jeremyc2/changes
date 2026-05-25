import { Context, type Effect } from "effect";
import type { ParsedChangesetDocument } from "../domain/changeset-document.ts";

/**
 * Reads changeset documents from the `.changeset/` directory.
 *
 * Replaces `@changesets/read`.
 */
export class ChangesetCatalogReader extends Context.Service<
	ChangesetCatalogReader,
	{
		readonly readAll: (
			rootDir: string,
		) => Effect.Effect<ReadonlyArray<ParsedChangesetDocument>>;
		readonly readSinceRef: (
			rootDir: string,
			sinceRef: string,
		) => Effect.Effect<ReadonlyArray<ParsedChangesetDocument>>;
	}
>()("changes/services/ChangesetCatalogReader") {}

export type ChangesetCatalogReaderService = ChangesetCatalogReader["Service"];
