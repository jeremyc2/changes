import { Effect, Layer } from "effect";
import type { ParsedChangesetDocument } from "../domain/changeset-document.ts";
import { ChangelogGenerator } from "../services/ChangelogGenerator.ts";

const getReleaseLine = (changeset: ParsedChangesetDocument): string => {
	const [firstLine, ...futureLines] = changeset.summary
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
				const relatedChangesets = options.changesets.filter((changeset) =>
					release.changesets.includes(changeset.id),
				);
				const lines = relatedChangesets.map(getReleaseLine);
				entries.push({
					packageName: release.name,
					entry: lines.join("\n"),
				});
			}
			return Effect.succeed(entries);
		},
	}),
);
