export type AccessType = "public" | "restricted";

export type PackageManifest = {
	readonly name: string;
	readonly version: string;
	readonly private?: boolean;
	readonly dependencies?: Readonly<Record<string, string>>;
	readonly devDependencies?: Readonly<Record<string, string>>;
	readonly peerDependencies?: Readonly<Record<string, string>>;
	readonly optionalDependencies?: Readonly<Record<string, string>>;
	readonly publishConfig?: {
		readonly access?: AccessType;
		readonly directory?: string;
	};
};

export type WorkspacePackage = {
	readonly dir: string;
	readonly packageJson: PackageManifest;
};

export type WorkspaceRoot = {
	readonly dir: string;
	readonly tool: "yarn" | "pnpm" | "npm" | "bun" | "bolt";
	readonly packages: ReadonlyArray<WorkspacePackage>;
};
