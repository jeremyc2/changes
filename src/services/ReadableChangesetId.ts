import { Context, type Effect } from "effect";

export type ReadableChangesetIdOptions = {
	readonly separator?: string;
	readonly capitalizeWords?: boolean;
	readonly descriptorCount?: number;
	readonly includeMannerAdverb?: boolean;
};

/**
 * Generates human-readable slugs for new `.changeset/*.md` filenames.
 *
 * Replaces the `human-id` npm package used by `@changesets/write`.
 */
export class ReadableChangesetId extends Context.Service<
	ReadableChangesetId,
	{
		readonly generate: (
			options?: ReadableChangesetIdOptions,
		) => Effect.Effect<string>;
		readonly combinatorialPoolSize: (
			options?: Pick<
				ReadableChangesetIdOptions,
				"descriptorCount" | "includeMannerAdverb"
			>,
		) => Effect.Effect<number>;
		readonly maximumFormattedLength: (
			options?: ReadableChangesetIdOptions,
		) => Effect.Effect<number>;
		readonly minimumFormattedLength: (
			options?: ReadableChangesetIdOptions,
		) => Effect.Effect<number>;
	}
>()("changes/services/ReadableChangesetId") {}

export type ReadableChangesetIdService = ReadableChangesetId["Service"];
