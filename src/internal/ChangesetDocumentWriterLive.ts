import { Effect, Layer } from "effect";
import { ChangesetDocumentParser } from "../services/ChangesetDocumentParser.ts";
import { ChangesetDocumentWriter } from "../services/ChangesetDocumentWriter.ts";
import { Filesystem } from "../services/Filesystem.ts";
import { MarkdownFormatter } from "../services/MarkdownFormatter.ts";
import { ReadableChangesetId } from "../services/ReadableChangesetId.ts";

const make = Effect.gen(function* () {
	const filesystem = yield* Filesystem;
	const parser = yield* ChangesetDocumentParser;
	const formatter = yield* MarkdownFormatter;
	const readableId = yield* ReadableChangesetId;

	const write = Effect.fnUntraced(function* (
		rootDir: string,
		draft: Parameters<ChangesetDocumentWriter["Service"]["write"]>[1],
		config: Parameters<ChangesetDocumentWriter["Service"]["write"]>[2],
	) {
		const changesetId = yield* readableId.generate({
			separator: "-",
			capitalizeWords: false,
			descriptorCount: 1,
		});
		const changesetBase = `${rootDir}/.changeset`;
		yield* filesystem.ensureDirectory(changesetBase);
		const changesetPath = `${changesetBase}/${changesetId}.md`;
		const formatted = yield* parser.format(draft);
		const output =
			config.prettier === false
				? formatted
				: yield* formatter.formatMarkdown(formatted, changesetPath);
		yield* filesystem.writeUtf8(changesetPath, output);
		return changesetPath;
	});

	return ChangesetDocumentWriter.of({ write });
});

export const layer = Layer.effect(ChangesetDocumentWriter, make);
