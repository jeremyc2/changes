import { Context, type Effect, Schema } from "effect";
import type {
	ChangeDraft,
	ParsedChangeDocument,
} from "../domain/change-document.ts";

export class ChangeDocumentParseError extends Schema.TaggedErrorClass<ChangeDocumentParseError>()(
	"ChangeDocumentParseError",
	{
		message: Schema.String,
	},
) {}

/**
 * Parses and serialises change markdown documents (YAML frontmatter + summary body).
 *
 * Replaces upstream change parsing and formatting.
 */
export class ChangeDocumentParser extends Context.Service<
	ChangeDocumentParser,
	{
		readonly parse: (
			contents: string,
		) => Effect.Effect<ChangeDraft, ChangeDocumentParseError>;
		readonly format: (
			draft: ChangeDraft,
		) => Effect.Effect<string, ChangeDocumentParseError>;
		readonly parseFile: (
			id: string,
			contents: string,
		) => Effect.Effect<ParsedChangeDocument, ChangeDocumentParseError>;
	}
>()("changes/services/ChangeDocumentParser") {}

export type ChangeDocumentParserService = ChangeDocumentParser["Service"];
