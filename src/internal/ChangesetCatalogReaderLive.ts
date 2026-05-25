import { Effect, Layer } from "effect";
import type { ParsedChangesetDocument } from "../domain/changeset-document.ts";
import { ChangesetCatalogReader } from "../services/ChangesetCatalogReader.ts";
import { ChangesetDocumentParser } from "../services/ChangesetDocumentParser.ts";
import { Filesystem, FilesystemError } from "../services/Filesystem.ts";
import { Git } from "../services/Git.ts";

const make = Effect.gen(function* () {
	const filesystem = yield* Filesystem;
	const changesetDocumentParser = yield* ChangesetDocumentParser;
	const gitClient = yield* Git;

	const readMarkdownFiles = Effect.fnUntraced(function* (rootDir: string) {
		const changesetBase = `${rootDir}/.changeset`;
		const exists = yield* filesystem.exists(changesetBase);
		if (!exists) {
			return yield* new FilesystemError({
				message: "There is no .changeset directory in this project",
			});
		}
		return yield* filesystem.readDirectory(changesetBase);
	});

	const readAll = Effect.fnUntraced(function* (rootDir: string) {
		const files = yield* readMarkdownFiles(rootDir);
		const markdownFiles = files.filter(
			(file) =>
				!file.startsWith(".") && file !== "README.md" && file.endsWith(".md"),
		);
		const changesets: Array<ParsedChangesetDocument> = [];
		for (const file of markdownFiles) {
			const changesetId = file.replace(/\.md$/, "");
			const contents = yield* filesystem.readUtf8(
				`${rootDir}/.changeset/${file}`,
			);
			changesets.push(
				yield* changesetDocumentParser.parseFile(changesetId, contents),
			);
		}
		return changesets;
	});

	const readSinceRef = Effect.fnUntraced(function* (
		rootDir: string,
		sinceRef: string,
	) {
		const files = yield* readMarkdownFiles(rootDir);
		const changed = yield* gitClient.getChangedChangesetFilesSinceRef({
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
		const changesets: Array<ParsedChangesetDocument> = [];
		for (const file of markdownFiles) {
			const changesetId = file.replace(/\.md$/, "");
			const contents = yield* filesystem.readUtf8(
				`${rootDir}/.changeset/${file}`,
			);
			changesets.push(
				yield* changesetDocumentParser.parseFile(changesetId, contents),
			);
		}
		return changesets;
	});

	return ChangesetCatalogReader.of({ readAll, readSinceRef });
});

export const layer = Layer.effect(ChangesetCatalogReader, make);
