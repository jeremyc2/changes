import { Effect, Layer } from "effect";
import { ReadableChangeId } from "../../services/ReadableChangeId.ts";
import {
	combinatorialPoolSize,
	generateReadableChangeId,
	maximumFormattedLength,
	minimumFormattedLength,
} from "./make.ts";

export const layer = Layer.succeed(
	ReadableChangeId,
	ReadableChangeId.of({
		generate: generateReadableChangeId,
		combinatorialPoolSize: (options) =>
			Effect.succeed(combinatorialPoolSize(options)),
		maximumFormattedLength: (options) =>
			Effect.succeed(maximumFormattedLength(options)),
		minimumFormattedLength: (options) =>
			Effect.succeed(minimumFormattedLength(options)),
	}),
);
