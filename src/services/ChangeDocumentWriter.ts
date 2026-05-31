import { Context, type Effect } from "effect";
import type { ChangeConfig } from "../domain/change-config.ts";
import type { ChangeDraft } from "../domain/change-document.ts";
import type { ChangeDocumentParseError } from "./ChangeDocumentParser.ts";
import type { FilesystemError } from "./Filesystem.ts";

/**
 * Writes a new change markdown file under `.changes/`.
 *
 * Replaces upstream change writing.
 */
export class ChangeDocumentWriter extends Context.Service<
	ChangeDocumentWriter,
	{
		readonly write: (
			rootDir: string,
			draft: ChangeDraft,
			config: Pick<ChangeConfig, "prettier">,
		) => Effect.Effect<string, ChangeDocumentParseError | FilesystemError>;
	}
>()("changes/services/ChangeDocumentWriter") {}

export type ChangeDocumentWriterService = ChangeDocumentWriter["Service"];
