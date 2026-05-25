import { Effect, Layer } from "effect";
import type { ParsedChangesetDocument } from "../domain/changeset-document.ts";
import {
	ChangesetDocumentParseError,
	ChangesetDocumentParser,
} from "../services/ChangesetDocumentParser.ts";
import {
	formatChangesetDocument,
	parseChangesetDocument,
} from "./pure/changeset-frontmatter.ts";

const parse = Effect.fnUntraced(function* (contents: string) {
	return yield* Effect.try({
		try: () => parseChangesetDocument(contents),
		catch: (cause) =>
			new ChangesetDocumentParseError({
				message: cause instanceof Error ? cause.message : String(cause),
			}),
	});
});

export const layer = Layer.succeed(
	ChangesetDocumentParser,
	ChangesetDocumentParser.of({
		parse,
		format: (draft) =>
			Effect.try({
				try: () => formatChangesetDocument(draft),
				catch: (cause) =>
					new ChangesetDocumentParseError({
						message: cause instanceof Error ? cause.message : String(cause),
					}),
			}),
		parseFile: Effect.fnUntraced(function* (id: string, contents: string) {
			const draft = yield* parse(contents);
			return { ...draft, id } satisfies ParsedChangesetDocument;
		}),
	}),
);
