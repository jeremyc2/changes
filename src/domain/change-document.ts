export type VersionType = "major" | "minor" | "patch" | "none";

export type Release = {
	readonly name: string;
	readonly type: VersionType;
};

/** A change before it has been written to disk. */
export type ChangeDraft = {
	readonly summary: string;
	readonly releases: ReadonlyArray<Release>;
};

/** A change read from a `.changes/*.md` file. */
export type ParsedChangeDocument = ChangeDraft & {
	readonly id: string;
};

export const versionTypes = [
	"major",
	"minor",
	"patch",
	"none",
] as const satisfies ReadonlyArray<VersionType>;
