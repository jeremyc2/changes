import { Effect, Random } from "effect";
import type { ReadableChangesetIdOptions } from "../../services/ReadableChangesetId.ts";
import {
	actionWords,
	descriptorWords,
	mannerAdverbs,
	subjectWords,
} from "./word-lists.ts";

const pickRandomWord = (words: ReadonlyArray<string>) =>
	Effect.gen(function* () {
		const index = yield* Random.nextIntBetween(0, words.length);
		const word = words[index];
		if (word === undefined) {
			return yield* Effect.die("Word list index out of bounds");
		}
		return word;
	});

const formatWord = (word: string, capitalizeWords: boolean): string =>
	capitalizeWords ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word;

const longestWord = (words: ReadonlyArray<string>): string =>
	words.reduce((longest, word) =>
		word.length > longest.length ? word : longest,
	);

const shortestWord = (words: ReadonlyArray<string>): string =>
	words.reduce((shortest, word) =>
		word.length < shortest.length ? word : shortest,
	);

const resolveOptions = (
	options: ReadableChangesetIdOptions = {},
): Required<ReadableChangesetIdOptions> => ({
	separator: options.separator ?? "-",
	capitalizeWords: options.capitalizeWords ?? false,
	descriptorCount: options.descriptorCount ?? 1,
	includeMannerAdverb: options.includeMannerAdverb ?? false,
});

export const generateReadableChangesetId = Effect.fnUntraced(function* (
	options?: ReadableChangesetIdOptions,
) {
	const resolved = resolveOptions(options);
	const parts: Array<string> = [];
	for (let index = 0; index < resolved.descriptorCount; index++) {
		parts.push(yield* pickRandomWord(descriptorWords));
	}
	parts.push(yield* pickRandomWord(subjectWords));
	parts.push(yield* pickRandomWord(actionWords));
	if (resolved.includeMannerAdverb) {
		parts.push(yield* pickRandomWord(mannerAdverbs));
	}
	return parts
		.map((part) => formatWord(part, resolved.capitalizeWords))
		.join(resolved.separator);
});

export const combinatorialPoolSize = (
	options: Pick<
		ReadableChangesetIdOptions,
		"descriptorCount" | "includeMannerAdverb"
	> = {},
): number => {
	const descriptorCount = options.descriptorCount ?? 1;
	const includeMannerAdverb = options.includeMannerAdverb ?? false;
	return (
		descriptorWords.length ** descriptorCount *
		subjectWords.length *
		actionWords.length *
		(includeMannerAdverb ? mannerAdverbs.length : 1)
	);
};

export const maximumFormattedLength = (
	options: ReadableChangesetIdOptions = {},
): number => {
	const resolved = resolveOptions(options);
	return (
		longestWord(descriptorWords).length * resolved.descriptorCount +
		resolved.descriptorCount * resolved.separator.length +
		longestWord(subjectWords).length +
		resolved.separator.length +
		longestWord(actionWords).length +
		(resolved.includeMannerAdverb
			? resolved.separator.length + longestWord(mannerAdverbs).length
			: 0)
	);
};

export const minimumFormattedLength = (
	options: ReadableChangesetIdOptions = {},
): number => {
	const resolved = resolveOptions(options);
	return (
		shortestWord(descriptorWords).length * resolved.descriptorCount +
		resolved.descriptorCount * resolved.separator.length +
		shortestWord(subjectWords).length +
		resolved.separator.length +
		shortestWord(actionWords).length +
		(resolved.includeMannerAdverb
			? resolved.separator.length + shortestWord(mannerAdverbs).length
			: 0)
	);
};
