import { Effect, Layer } from "effect";
import type { ParsedChangeDocument } from "../domain/change-document.ts";
import {
	ChangeDocumentParseError,
	ChangeDocumentParser,
} from "../services/ChangeDocumentParser.ts";
import {
	formatChangeDocument,
	parseChangeDocument,
} from "./pure/change-frontmatter.ts";

const parse = Effect.fnUntraced(function* (contents: string) {
	return yield* Effect.try({
		try: () => parseChangeDocument(contents),
		catch: (cause) =>
			new ChangeDocumentParseError({
				message: cause instanceof Error ? cause.message : String(cause),
			}),
	});
});

export const layer = Layer.succeed(
	ChangeDocumentParser,
	ChangeDocumentParser.of({
		parse,
		format: (draft) =>
			Effect.try({
				try: () => formatChangeDocument(draft),
				catch: (cause) =>
					new ChangeDocumentParseError({
						message: cause instanceof Error ? cause.message : String(cause),
					}),
			}),
		parseFile: Effect.fnUntraced(function* (id: string, contents: string) {
			const draft = yield* parse(contents);
			return { ...draft, id } satisfies ParsedChangeDocument;
		}),
	}),
);
