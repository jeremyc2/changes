import { Effect, Layer } from "effect";
import type { ParsedChangeDocument } from "../domain/change-document.ts";
import { ChangeCatalogReader } from "../services/ChangeCatalogReader.ts";
import { ChangeDocumentParser } from "../services/ChangeDocumentParser.ts";
import { Filesystem, FilesystemError } from "../services/Filesystem.ts";
import { Git } from "../services/Git.ts";

const make = Effect.gen(function* () {
	const filesystem = yield* Filesystem;
	const changeDocumentParser = yield* ChangeDocumentParser;
	const gitClient = yield* Git;

	const readMarkdownFiles = Effect.fnUntraced(function* (rootDir: string) {
		const changeBase = `${rootDir}/.changes`;
		const exists = yield* filesystem.exists(changeBase);
		if (!exists) {
			return yield* new FilesystemError({
				message: "There is no .changes directory in this project",
			});
		}
		return yield* filesystem.readDirectory(changeBase);
	});

	const readAll = Effect.fnUntraced(function* (rootDir: string) {
		const files = yield* readMarkdownFiles(rootDir);
		const markdownFiles = files.filter(
			(file) =>
				!file.startsWith(".") && file !== "README.md" && file.endsWith(".md"),
		);
		const changes: Array<ParsedChangeDocument> = [];
		for (const file of markdownFiles) {
			const changeId = file.replace(/\.md$/, "");
			const contents = yield* filesystem.readUtf8(
				`${rootDir}/.changes/${file}`,
			);
			changes.push(yield* changeDocumentParser.parseFile(changeId, contents));
		}
		return changes;
	});

	const readSinceRef = Effect.fnUntraced(function* (
		rootDir: string,
		sinceRef: string,
	) {
		const files = yield* readMarkdownFiles(rootDir);
		const changed = yield* gitClient.getChangedChangeFilesSinceRef({
			cwd: rootDir,
			ref: sinceRef,
		});
		const changedIds = new Set(
			changed.map((path) => path.split("/").pop()?.replace(/\.md$/, "") ?? ""),
		);
		const markdownFiles = files.filter(
			(file) =>
				file !== "README.md" &&
				file.endsWith(".md") &&
				changedIds.has(file.replace(/\.md$/, "")),
		);
		const changes: Array<ParsedChangeDocument> = [];
		for (const file of markdownFiles) {
			const changeId = file.replace(/\.md$/, "");
			const contents = yield* filesystem.readUtf8(
				`${rootDir}/.changes/${file}`,
			);
			changes.push(yield* changeDocumentParser.parseFile(changeId, contents));
		}
		return changes;
	});

	return ChangeCatalogReader.of({ readAll, readSinceRef });
});

export const layer = Layer.effect(ChangeCatalogReader, make);
