import { Context, type Effect } from "effect";
import type { ParsedChangesetDocument } from "../domain/changeset-document.ts";
import type { ChangesetDocumentParseError } from "./ChangesetDocumentParser.ts";
import type { FilesystemError } from "./Filesystem.ts";
import type { GitError } from "./Git.ts";

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
		) => Effect.Effect<
			ReadonlyArray<ParsedChangesetDocument>,
			ChangesetDocumentParseError | FilesystemError
		>;
		readonly readSinceRef: (
			rootDir: string,
			sinceRef: string,
		) => Effect.Effect<
			ReadonlyArray<ParsedChangesetDocument>,
			ChangesetDocumentParseError | FilesystemError | GitError
		>;
	}
>()("changes/services/ChangesetCatalogReader") {}

export type ChangesetCatalogReaderService = ChangesetCatalogReader["Service"];
