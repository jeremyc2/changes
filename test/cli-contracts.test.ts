import { assert, it, layer } from "@effect/vitest";
import { Effect } from "effect";
import { snapshotVersionMode } from "../src/domain/version-mode.ts";
import { rootDir, stubReleasePlan } from "./contract/fixtures.ts";
import {
	cliContractLayer,
	snapshotVersionModeForContract,
} from "./contract/mock-layer.ts";
import {
	addCommand,
	initCommand,
	preCommand,
	publishCommand,
	statusCommand,
	tagCommand,
	versionCommand,
} from "./contract/workflows.ts";

layer(cliContractLayer)("CLI contract", (it) => {
	it.effect("init scaffolds a changeset workspace", () => initCommand());

	it.effect("add records a changeset for selected packages", () =>
		Effect.gen(function* () {
			const result = yield* addCommand();
			assert.strictEqual(
				result.changesetPath,
				`${rootDir}/.changeset/stub-slug.md`,
			);
			assert.strictEqual(result.draft.summary, "contract summary");
			assert.deepStrictEqual(result.draft.releases, [
				{ name: "pkg-a", type: "patch" },
			]);
		}),
	);

	it.effect("add --message skips the summary prompt path", () =>
		Effect.gen(function* () {
			const result = yield* addCommand({ message: "from flag" });
			assert.strictEqual(result.draft.summary, "from flag");
		}),
	);

	it.effect("add --open chains editor spawn after write", () =>
		addCommand({ open: true }),
	);

	it.effect("add --since passes a git ref into changed-package detection", () =>
		addCommand({ sinceRef: "develop" }),
	);

	it.effect("add --empty writes an empty changeset", () =>
		Effect.gen(function* () {
			const result = yield* addCommand({ empty: true });
			assert.deepStrictEqual(result.draft.releases, []);
		}),
	);

	it.effect("version produces a release plan and applies it", () =>
		Effect.gen(function* () {
			const plan = yield* versionCommand();
			assert.strictEqual(plan.versionMode._tag, "default");
			assert.strictEqual(plan.releases[0]?.newVersion, "1.0.1");
		}),
	);

	it.effect("version --ignore forwards ignored packages to assembly", () =>
		Effect.gen(function* () {
			const plan = yield* versionCommand({
				ignoredPackages: ["pkg-b"],
			});
			assert.strictEqual(plan.releases[0]?.name, "pkg-a");
		}),
	);

	it.effect("version --snapshot uses snapshot version mode", () =>
		Effect.gen(function* () {
			const plan = yield* versionCommand({
				versionMode: snapshotVersionModeForContract,
			});
			assert.strictEqual(plan.versionMode._tag, "snapshot");
			if (plan.versionMode._tag === "snapshot") {
				assert.strictEqual(plan.versionMode.tag, "contract");
			}
			assert.strictEqual(
				plan.releases[0]?.newVersion,
				"0.0.0-contract-0000000000",
			);
		}),
	);

	it.effect("publish releases packages and tags them", () =>
		Effect.gen(function* () {
			const plan = yield* publishCommand();
			assert.strictEqual(plan.releases.length, 1);
		}),
	);

	it.effect("publish --no-git-tag skips git tagging", () =>
		publishCommand({ skipGitTags: true }),
	);

	it.effect("publish --tag forwards a dist-tag for snapshot releases", () =>
		publishCommand({ distTag: "contract" }),
	);

	it.effect("status reports unreleased work", () =>
		Effect.gen(function* () {
			const plan = yield* statusCommand();
			assert.deepStrictEqual(plan, stubReleasePlan());
		}),
	);

	it.effect("status --output writes JSON through the filesystem seam", () =>
		statusCommand({
			sinceRef: "main",
			verbose: true,
			outputPath: `${rootDir}/status.json`,
		}),
	);

	it.effect("pre enter and exit manage prerelease mode", () =>
		Effect.gen(function* () {
			yield* preCommand({ action: "enter", tag: "next" });
			yield* preCommand({ action: "exit" });
		}),
	);

	it.effect("tag creates git tags from current package versions", () =>
		Effect.gen(function* () {
			const tags = yield* tagCommand();
			assert.deepStrictEqual(tags, ["pkg-a@1.0.0"]);
		}),
	);
});

it("mock layer only wires user-facing CLI services", () => {
	assert.isDefined(cliContractLayer);
	assert.isDefined(snapshotVersionMode("contract"));
});
