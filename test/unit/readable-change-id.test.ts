import { assert, layer } from "@effect/vitest";
import { Effect } from "effect";
import { layer as readableChangeIdLayer } from "../../src/internal/readable-change-id/layer.ts";
import { ReadableChangeId } from "../../src/services/ReadableChangeId.ts";

layer(readableChangeIdLayer)("ReadableChangeId", (it) => {
	it.effect("generate returns hyphenated lowercase ids by default", () =>
		Effect.gen(function* () {
			const changeId = yield* ReadableChangeId.use((readableChangeId) =>
				readableChangeId.generate(),
			);
			// Matches three lowercase alphabetic words separated by hyphens.
			assert.match(changeId, /^[a-z]+-[a-z]+-[a-z]+$/);
		}),
	);
});
