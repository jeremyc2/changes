import { Effect, Layer } from "effect";
import type { ParsedChangeDocument } from "../domain/change-document.ts";
import { ChangelogGenerator } from "../services/ChangelogGenerator.ts";

const getReleaseLine = (change: ParsedChangeDocument): string => {
	const [firstLine, ...futureLines] = change.summary
		.split("\n")
		.map((line) => line.trimEnd());
	let returnValue = `- ${firstLine}`;
	if (futureLines.length > 0) {
		returnValue += `\n${futureLines.map((line) => `  ${line}`).join("\n")}`;
	}
	return returnValue;
};

export const layer = Layer.succeed(
	ChangelogGenerator,
	ChangelogGenerator.of({
		generateEntries: (options) => {
			if (options.changelogConfig === false) {
				return Effect.succeed([]);
			}
			const entries: Array<{
				readonly packageName: string;
				readonly entry: string;
			}> = [];
			for (const release of options.releases) {
				const relatedChanges = options.changes.filter((change) =>
					release.changes.includes(change.id),
				);
				const lines = relatedChanges.map(getReleaseLine);
				entries.push({
					packageName: release.name,
					entry: lines.join("\n"),
				});
			}
			return Effect.succeed(entries);
		},
	}),
);
