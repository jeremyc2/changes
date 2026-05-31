import { Effect, Layer } from "effect";
import { ChangeDocumentParser } from "../services/ChangeDocumentParser.ts";
import { ChangeDocumentWriter } from "../services/ChangeDocumentWriter.ts";
import { Filesystem } from "../services/Filesystem.ts";
import { MarkdownFormatter } from "../services/MarkdownFormatter.ts";
import { ReadableChangeId } from "../services/ReadableChangeId.ts";

const make = Effect.gen(function* () {
	const filesystem = yield* Filesystem;
	const changeDocumentParser = yield* ChangeDocumentParser;
	const markdownFormatter = yield* MarkdownFormatter;
	const readableChangeId = yield* ReadableChangeId;

	const write = Effect.fnUntraced(function* (
		rootDir: string,
		draft: Parameters<ChangeDocumentWriter["Service"]["write"]>[1],
		config: Parameters<ChangeDocumentWriter["Service"]["write"]>[2],
	) {
		const changeId = yield* readableChangeId.generate({
			separator: "-",
			capitalizeWords: false,
			descriptorCount: 1,
		});
		const changeBase = `${rootDir}/.changes`;
		yield* filesystem.ensureDirectory(changeBase);
		const changePath = `${changeBase}/${changeId}.md`;
		const formatted = yield* changeDocumentParser.format(draft);
		const output =
			config.prettier === false
				? formatted
				: yield* markdownFormatter.formatMarkdown(formatted, changePath);
		yield* filesystem.writeUtf8(changePath, output);
		return changePath;
	});

	return ChangeDocumentWriter.of({ write });
});

export const layer = Layer.effect(ChangeDocumentWriter, make);
