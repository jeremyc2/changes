import { assert, layer } from "@effect/vitest";
import { Effect } from "effect";
import { layer as readableChangesetIdLayer } from "../../src/internal/readable-changeset-id/layer.ts";
import { ReadableChangesetId } from "../../src/services/ReadableChangesetId.ts";

layer(readableChangesetIdLayer)("ReadableChangesetId", (it) => {
	it.effect("generate returns hyphenated lowercase ids by default", () =>
		Effect.gen(function* () {
			const changesetId = yield* ReadableChangesetId.use(
				(readableChangesetId) => readableChangesetId.generate(),
			);
			// Matches three lowercase alphabetic words separated by hyphens.
			assert.match(changesetId, /^[a-z]+-[a-z]+-[a-z]+$/);
		}),
	);
});
