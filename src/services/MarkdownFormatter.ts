import { Context, type Effect } from "effect";

/**
 * Optional markdown formatting (Prettier integration in the original CLI).
 */
export class MarkdownFormatter extends Context.Service<
	MarkdownFormatter,
	{
		readonly formatMarkdown: (
			contents: string,
			filePath: string,
		) => Effect.Effect<string>;
	}
>()("changes/services/MarkdownFormatter") {}

export type MarkdownFormatterService = MarkdownFormatter["Service"];
