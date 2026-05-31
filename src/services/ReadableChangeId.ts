import { Context, type Effect } from "effect";

export type ReadableChangeIdOptions = {
	readonly separator?: string;
	readonly capitalizeWords?: boolean;
	readonly descriptorCount?: number;
	readonly includeMannerAdverb?: boolean;
};

/**
 * Generates human-readable slugs for new `.changes/*.md` filenames.
 *
 * Replaces upstream readable id generation.
 */
export class ReadableChangeId extends Context.Service<
	ReadableChangeId,
	{
		readonly generate: (
			options?: ReadableChangeIdOptions,
		) => Effect.Effect<string>;
		readonly combinatorialPoolSize: (
			options?: Pick<
				ReadableChangeIdOptions,
				"descriptorCount" | "includeMannerAdverb"
			>,
		) => Effect.Effect<number>;
		readonly maximumFormattedLength: (
			options?: ReadableChangeIdOptions,
		) => Effect.Effect<number>;
		readonly minimumFormattedLength: (
			options?: ReadableChangeIdOptions,
		) => Effect.Effect<number>;
	}
>()("changes/services/ReadableChangeId") {}

export type ReadableChangeIdService = ReadableChangeId["Service"];
