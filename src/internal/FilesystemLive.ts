import { Effect, FileSystem, Layer } from "effect";
import { Filesystem, FilesystemError } from "../services/Filesystem.ts";

const make = Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem;
	return Filesystem.of({
		readUtf8: (path) =>
			fs.readFileString(path).pipe(
				Effect.mapError(
					(error) =>
						new FilesystemError({
							message: error.message,
							cause: error,
						}),
				),
			),
		writeUtf8: (path, contents) =>
			fs.writeFileString(path, contents).pipe(
				Effect.mapError(
					(error) =>
						new FilesystemError({
							message: error.message,
							cause: error,
						}),
				),
			),
		exists: (path) =>
			fs.exists(path).pipe(Effect.catch(() => Effect.succeed(false))),
		readDirectory: (path) =>
			fs.readDirectory(path).pipe(
				Effect.mapError(
					(error) =>
						new FilesystemError({
							message: error.message,
							cause: error,
						}),
				),
			),
		ensureDirectory: (path) =>
			fs.makeDirectory(path, { recursive: true }).pipe(
				Effect.mapError(
					(error) =>
						new FilesystemError({
							message: error.message,
							cause: error,
						}),
				),
			),
		remove: (path) =>
			fs.remove(path).pipe(
				Effect.mapError(
					(error) =>
						new FilesystemError({
							message: error.message,
							cause: error,
						}),
				),
			),
	});
});

export const layer = Layer.effect(Filesystem, make);
