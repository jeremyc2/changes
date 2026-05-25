export type VersionType = "major" | "minor" | "patch" | "none";

export type Release = {
	readonly name: string;
	readonly type: VersionType;
};

/** A changeset before it has been written to disk. */
export type ChangesetDraft = {
	readonly summary: string;
	readonly releases: ReadonlyArray<Release>;
};

/** A changeset read from a `.changeset/*.md` file. */
export type ParsedChangesetDocument = ChangesetDraft & {
	readonly id: string;
};

export const versionTypes = [
	"major",
	"minor",
	"patch",
	"none",
] as const satisfies ReadonlyArray<VersionType>;
