import type { AccessType } from "./workspace-package.ts";

export type PackageGroup = ReadonlyArray<string>;

export type ChangeConfig = {
	readonly changelog: false | readonly [string, unknown];
	readonly commit: false | readonly [string, unknown];
	readonly fixed: ReadonlyArray<PackageGroup>;
	readonly linked: ReadonlyArray<PackageGroup>;
	readonly access: AccessType;
	readonly baseBranch: string;
	readonly changedFilePatterns: ReadonlyArray<string>;
	readonly prettier: boolean;
	readonly privatePackages: {
		readonly version: boolean;
		readonly tag: boolean;
	};
	readonly ignore: ReadonlyArray<string>;
	readonly updateInternalDependencies: "patch" | "minor";
	readonly bumpVersionsWithWorkspaceProtocolOnly?: boolean;
	readonly snapshot?: {
		readonly useCalculatedVersion?: boolean;
		readonly prereleaseTemplate?: string;
	};
};
