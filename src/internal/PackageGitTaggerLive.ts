import { Effect, Layer } from "effect";
import { Git } from "../services/Git.ts";
import {
	PackageGitTagger,
	PackageGitTaggerError,
} from "../services/PackageGitTagger.ts";

const make = Effect.gen(function* () {
	const git = yield* Git;

	const tagWorkspacePackages = Effect.fnUntraced(function* (options: {
		readonly cwd: string;
		readonly workspace: Parameters<
			PackageGitTagger["Service"]["tagWorkspacePackages"]
		>[0]["workspace"];
	}) {
		const tags: Array<string> = [];
		for (const pkg of options.workspace.packages) {
			const tag = `${pkg.packageJson.name}@${pkg.packageJson.version}`;
			yield* git.tag(tag, options.cwd).pipe(
				Effect.mapError(
					(cause) =>
						new PackageGitTaggerError({
							message: cause.message,
						}),
				),
			);
			tags.push(tag);
		}
		return tags;
	});

	return PackageGitTagger.of({ tagWorkspacePackages });
});

export const layer = Layer.effect(PackageGitTagger, make);
