import { Effect, Layer } from "effect";
import type { PreReleaseStateFile } from "../domain/pre-release-state.ts";
import { Filesystem } from "../services/Filesystem.ts";
import {
	PreReleaseStateError,
	PreReleaseStateManager,
} from "../services/PreReleaseStateManager.ts";
import type { PreReleaseState } from "../services/ReleasePlanAssembler.ts";
import { encodeJsonStringLine, parseJsonString } from "./pure/json-codec.ts";

const preStatePath = (rootDir: string) => `${rootDir}/.changeset/pre.json`;

const make = Effect.gen(function* () {
	const filesystem = yield* Filesystem;

	const readFile = Effect.fnUntraced(function* (rootDir: string) {
		const path = preStatePath(rootDir);
		const exists = yield* filesystem.exists(path);
		if (!exists) {
			return undefined;
		}
		const contents = yield* filesystem.readUtf8(path);
		return parseJsonString(contents) as PreReleaseStateFile;
	});

	const readInitialVersions = Effect.fnUntraced(function* (rootDir: string) {
		const initialVersions: Record<string, string> = {};
		const rootManifest = parseJsonString(
			yield* filesystem.readUtf8(`${rootDir}/package.json`),
		) as { readonly name?: string; readonly version?: string };
		if (rootManifest.name !== undefined && rootManifest.version !== undefined) {
			initialVersions[rootManifest.name] = rootManifest.version;
		}
		return initialVersions;
	});

	const toPreReleaseState = (file: PreReleaseStateFile): PreReleaseState => ({
		mode: file.mode,
		tag: file.tag,
	});

	return PreReleaseStateManager.of({
		read: (rootDir) =>
			readFile(rootDir).pipe(
				Effect.map((file) =>
					file === undefined ? undefined : toPreReleaseState(file),
				),
				Effect.mapError(
					(cause) =>
						new PreReleaseStateError({
							message: cause instanceof Error ? cause.message : String(cause),
						}),
				),
			),
		enter: Effect.fnUntraced(function* (rootDir: string, tag: string) {
			const existing = yield* readFile(rootDir);
			if (existing?.mode === "pre") {
				return yield* new PreReleaseStateError({
					message: "Cannot enter pre mode when already in pre mode",
				});
			}
			const initialVersions = yield* readInitialVersions(rootDir);
			const nextState: PreReleaseStateFile = {
				mode: "pre",
				tag,
				initialVersions,
				changesets: existing?.changesets ?? [],
			};
			yield* filesystem.writeUtf8(
				preStatePath(rootDir),
				encodeJsonStringLine(nextState),
			);
		}),
		exit: Effect.fnUntraced(function* (rootDir: string) {
			const existing = yield* readFile(rootDir);
			if (existing === undefined) {
				return yield* new PreReleaseStateError({
					message: "Cannot exit pre mode when not in pre mode",
				});
			}
			yield* filesystem.writeUtf8(
				preStatePath(rootDir),
				encodeJsonStringLine({ ...existing, mode: "exit" }),
			);
		}),
	});
});

export const layer = Layer.effect(PreReleaseStateManager, make);
