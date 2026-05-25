import { Effect, FileSystem, Layer } from "effect";
import { Filesystem, FilesystemError } from "../services/Filesystem.ts";

const make = Effect.gen(function* () {
	const fileSystem = yield* FileSystem.FileSystem;
	return Filesystem.of({
		readUtf8: (path) =>
			fileSystem.readFileString(path).pipe(
				Effect.mapError(
					(error) =>
						new FilesystemError({
							message: error.message,
							cause: error,
						}),
				),
			),
		writeUtf8: (path, contents) =>
			fileSystem.writeFileString(path, contents).pipe(
				Effect.mapError(
					(error) =>
						new FilesystemError({
							message: error.message,
							cause: error,
						}),
				),
			),
		exists: (path) =>
			fileSystem.exists(path).pipe(Effect.catch(() => Effect.succeed(false))),
		readDirectory: (path) =>
			fileSystem.readDirectory(path).pipe(
				Effect.mapError(
					(error) =>
						new FilesystemError({
							message: error.message,
							cause: error,
						}),
				),
			),
		ensureDirectory: (path) =>
			fileSystem.makeDirectory(path, { recursive: true }).pipe(
				Effect.mapError(
					(error) =>
						new FilesystemError({
							message: error.message,
							cause: error,
						}),
				),
			),
		remove: (path) =>
			fileSystem.remove(path).pipe(
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
