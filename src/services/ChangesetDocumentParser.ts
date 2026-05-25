import { Context, type Effect, Schema } from "effect";
import type {
	ChangesetDraft,
	ParsedChangesetDocument,
} from "../domain/changeset-document.ts";

export class ChangesetDocumentParseError extends Schema.TaggedErrorClass<ChangesetDocumentParseError>()(
	"ChangesetDocumentParseError",
	{
		message: Schema.String,
	},
) {}

/**
 * Parses and serialises changeset markdown documents (YAML frontmatter + summary body).
 *
 * Replaces `@changesets/parse` and the formatting half of `@changesets/write`.
 */
export class ChangesetDocumentParser extends Context.Service<
	ChangesetDocumentParser,
	{
		readonly parse: (
			contents: string,
		) => Effect.Effect<ChangesetDraft, ChangesetDocumentParseError>;
		readonly format: (
			draft: ChangesetDraft,
		) => Effect.Effect<string, ChangesetDocumentParseError>;
		readonly parseFile: (
			id: string,
			contents: string,
		) => Effect.Effect<ParsedChangesetDocument, ChangesetDocumentParseError>;
	}
>()("changes/services/ChangesetDocumentParser") {}

export type ChangesetDocumentParserService = ChangesetDocumentParser["Service"];
