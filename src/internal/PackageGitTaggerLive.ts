import { Effect, Layer } from "effect";
import { Git } from "../services/Git.ts";
import {
	PackageGitTagger,
	PackageGitTaggerError,
} from "../services/PackageGitTagger.ts";

const make = Effect.gen(function* () {
	const gitClient = yield* Git;

	const tagWorkspacePackages = Effect.fnUntraced(function* (options: {
		readonly cwd: string;
		readonly workspace: Parameters<
			PackageGitTagger["Service"]["tagWorkspacePackages"]
		>[0]["workspace"];
	}) {
		const createdTagNames: Array<string> = [];
		const isSinglePackageRepository =
			options.workspace.packages.length === 1 &&
			options.workspace.packages[0]?.dir === options.workspace.dir;
		for (const workspacePackage of options.workspace.packages) {
			const gitTagName = isSinglePackageRepository
				? `v${workspacePackage.packageJson.version}`
				: `${workspacePackage.packageJson.name}@${workspacePackage.packageJson.version}`;
			yield* gitClient.tag(gitTagName, options.cwd).pipe(
				Effect.mapError(
					(cause) =>
						new PackageGitTaggerError({
							message: cause.message,
						}),
				),
			);
			createdTagNames.push(gitTagName);
		}
		return createdTagNames;
	});

	return PackageGitTagger.of({ tagWorkspacePackages });
});

export const layer = Layer.effect(PackageGitTagger, make);
