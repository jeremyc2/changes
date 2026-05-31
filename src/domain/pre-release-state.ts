export type PreReleaseStateFile = {
	readonly mode: "pre" | "exit";
	readonly tag: string;
	readonly initialVersions: Readonly<Record<string, string>>;
	readonly changes: ReadonlyArray<string>;
};

export const defaultWrittenConfig = {
	changelog: "changes/changelog",
	commit: false,
	fixed: [] as ReadonlyArray<ReadonlyArray<string>>,
	linked: [] as ReadonlyArray<ReadonlyArray<string>>,
	access: "restricted" as const,
	baseBranch: "main",
	updateInternalDependencies: "patch" as const,
	ignore: [] as ReadonlyArray<string>,
	changedFilePatterns: ["**"] as ReadonlyArray<string>,
	prettier: true,
	privatePackages: {
		version: false,
		tag: false,
	},
};
