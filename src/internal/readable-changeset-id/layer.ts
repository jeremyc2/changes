import { Effect, Layer } from "effect";
import { ReadableChangesetId } from "../../services/ReadableChangesetId.ts";
import {
	combinatorialPoolSize,
	generateReadableChangesetId,
	maximumFormattedLength,
	minimumFormattedLength,
} from "./make.ts";

export const layer = Layer.succeed(
	ReadableChangesetId,
	ReadableChangesetId.of({
		generate: generateReadableChangesetId,
		combinatorialPoolSize: (options) =>
			Effect.succeed(combinatorialPoolSize(options)),
		maximumFormattedLength: (options) =>
			Effect.succeed(maximumFormattedLength(options)),
		minimumFormattedLength: (options) =>
			Effect.succeed(minimumFormattedLength(options)),
	}),
);
