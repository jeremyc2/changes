import { assert, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { layer as packageGitTaggerLayer } from "../../src/internal/PackageGitTaggerLive.ts";
import { Git } from "../../src/services/Git.ts";
import { PackageGitTagger } from "../../src/services/PackageGitTagger.ts";

const tags: Array<string> = [];

const gitLayer = Layer.succeed(
	Git,
	Git.of({
		add: () => Effect.void,
		commit: () => Effect.void,
		getChangedChangesetFilesSinceRef: () => Effect.succeed([]),
		getChangedFilesSinceRef: () => Effect.succeed([]),
		tag: (tagName) =>
			Effect.sync(() => {
				tags.push(tagName);
			}),
	}),
);

const testLayer = packageGitTaggerLayer.pipe(Layer.provide(gitLayer));

layer(testLayer)("PackageGitTagger", (it) => {
	it.effect("uses v-prefixed tags for single-package repositories", () =>
		Effect.gen(function* () {
			tags.length = 0;
			const createdTagNames = yield* PackageGitTagger.use((packageGitTagger) =>
				packageGitTagger.tagWorkspacePackages({
					cwd: "/repo",
					workspace: {
						dir: "/repo",
						tool: "npm",
						packages: [
							{
								dir: "/repo",
								packageJson: { name: "single", version: "1.2.3" },
							},
						],
					},
				}),
			);
			assert.deepStrictEqual(createdTagNames, ["v1.2.3"]);
			assert.deepStrictEqual(tags, ["v1.2.3"]);
		}),
	);

	it.effect("uses package-name tags for monorepos", () =>
		Effect.gen(function* () {
			tags.length = 0;
			const createdTagNames = yield* PackageGitTagger.use((packageGitTagger) =>
				packageGitTagger.tagWorkspacePackages({
					cwd: "/repo",
					workspace: {
						dir: "/repo",
						tool: "npm",
						packages: [
							{
								dir: "/repo/packages/a",
								packageJson: { name: "pkg-a", version: "1.0.0" },
							},
							{
								dir: "/repo/packages/b",
								packageJson: { name: "pkg-b", version: "2.0.0" },
							},
						],
					},
				}),
			);
			assert.deepStrictEqual(createdTagNames, ["pkg-a@1.0.0", "pkg-b@2.0.0"]);
			assert.deepStrictEqual(tags, ["pkg-a@1.0.0", "pkg-b@2.0.0"]);
		}),
	);
});
