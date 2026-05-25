import { Context, type Effect, Schema } from "effect";

export class FilesystemError extends Schema.TaggedErrorClass<FilesystemError>()(
	"FilesystemError",
	{
		message: Schema.String,
		cause: Schema.optional(Schema.Defect),
	},
) {}

/**
 * Filesystem I/O used across commands (read, write, exists, list).
 */
export class Filesystem extends Context.Service<
	Filesystem,
	{
		readonly readUtf8: (path: string) => Effect.Effect<string, FilesystemError>;
		readonly writeUtf8: (
			path: string,
			contents: string,
		) => Effect.Effect<void, FilesystemError>;
		readonly exists: (path: string) => Effect.Effect<boolean>;
		readonly readDirectory: (
			path: string,
		) => Effect.Effect<ReadonlyArray<string>, FilesystemError>;
		readonly ensureDirectory: (
			path: string,
		) => Effect.Effect<void, FilesystemError>;
		readonly remove: (path: string) => Effect.Effect<void, FilesystemError>;
	}
>()("changes/services/Filesystem") {}

export type FilesystemService = Filesystem["Service"];
