import { Context, type Effect } from "effect";
import type { ChangesetConfig } from "../domain/changeset-config.ts";
import type { ChangesetDraft } from "../domain/changeset-document.ts";
import type { ChangesetDocumentParseError } from "./ChangesetDocumentParser.ts";
import type { FilesystemError } from "./Filesystem.ts";

/**
 * Writes a new changeset markdown file under `.changeset/`.
 *
 * Replaces `@changesets/write`.
 */
export class ChangesetDocumentWriter extends Context.Service<
	ChangesetDocumentWriter,
	{
		readonly write: (
			rootDir: string,
			draft: ChangesetDraft,
			config: Pick<ChangesetConfig, "prettier">,
		) => Effect.Effect<string, ChangesetDocumentParseError | FilesystemError>;
	}
>()("changes/services/ChangesetDocumentWriter") {}

export type ChangesetDocumentWriterService = ChangesetDocumentWriter["Service"];
