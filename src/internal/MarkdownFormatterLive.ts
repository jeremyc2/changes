import { Effect, Layer } from "effect";
import { MarkdownFormatter } from "../services/MarkdownFormatter.ts";

export const layer = Layer.succeed(
	MarkdownFormatter,
	MarkdownFormatter.of({
		formatMarkdown: (contents) => Effect.succeed(contents),
	}),
);
