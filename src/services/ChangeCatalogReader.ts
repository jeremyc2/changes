import { Context, type Effect } from "effect";
import type { ParsedChangeDocument } from "../domain/change-document.ts";
import type { ChangeDocumentParseError } from "./ChangeDocumentParser.ts";
import type { FilesystemError } from "./Filesystem.ts";
import type { GitError } from "./Git.ts";

/**
 * Reads change documents from the `.changes/` directory.
 *
 * Replaces upstream change reading.
 */
export class ChangeCatalogReader extends Context.Service<
	ChangeCatalogReader,
	{
		readonly readAll: (
			rootDir: string,
		) => Effect.Effect<
			ReadonlyArray<ParsedChangeDocument>,
			ChangeDocumentParseError | FilesystemError
		>;
		readonly readSinceRef: (
			rootDir: string,
			sinceRef: string,
		) => Effect.Effect<
			ReadonlyArray<ParsedChangeDocument>,
			ChangeDocumentParseError | FilesystemError | GitError
		>;
	}
>()("changes/services/ChangeCatalogReader") {}

export type ChangeCatalogReaderService = ChangeCatalogReader["Service"];
