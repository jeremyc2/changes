import { Effect, Layer } from "effect";
import {
	VersionIncrement,
	VersionIncrementError,
} from "../services/VersionIncrement.ts";
import { incSemver } from "./pure/semver.ts";

export const layer = Layer.succeed(
	VersionIncrement,
	VersionIncrement.of({
		increment: (options) => {
			if (options.bump === "none") {
				return Effect.succeed(options.oldVersion);
			}
			const next =
				options.preState !== undefined && options.preState.mode !== "exit"
					? incSemver(options.oldVersion, options.bump)
					: incSemver(options.oldVersion, options.bump);
			if (next === undefined) {
				return Effect.fail(
					new VersionIncrementError({
						message: `Unable to increment version ${options.oldVersion}`,
					}),
				);
			}
			if (
				options.preState !== undefined &&
				options.preState.mode !== "exit" &&
				options.preVersion !== undefined
			) {
				return Effect.succeed(
					`${next}-${options.preState.tag}.${options.preVersion}`,
				);
			}
			return Effect.succeed(next);
		},
	}),
);
