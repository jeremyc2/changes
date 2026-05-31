import { assert, it } from "@effect/vitest";
import {
	formatChangeDocument,
	parseChangeDocument,
} from "../../src/internal/pure/change-frontmatter.ts";
import { globMatch } from "../../src/internal/pure/glob-match.ts";
import { encodePrettyJsonStringLine } from "../../src/internal/pure/json-codec.ts";
import {
	incSemver,
	parseSemver,
	satisfiesSemver,
} from "../../src/internal/pure/semver.ts";

it("encodePrettyJsonStringLine writes two-space formatted JSON", () => {
	assert.strictEqual(
		encodePrettyJsonStringLine({ name: "pkg-a", nested: { enabled: true } }),
		'{\n  "name": "pkg-a",\n  "nested": {\n    "enabled": true\n  }\n}\n',
	);
});

it("incSemver bumps patch versions", () => {
	assert.strictEqual(incSemver("1.0.0", "patch"), "1.0.1");
	assert.strictEqual(incSemver("1.0.0", "minor"), "1.1.0");
	assert.strictEqual(incSemver("1.0.0", "major"), "2.0.0");
});

it("parseSemver reads semver strings", () => {
	const parsed = parseSemver("1.2.3-beta.1");
	assert.isDefined(parsed);
	assert.strictEqual(parsed?.major, 1);
	assert.strictEqual(parsed?.minor, 2);
	assert.strictEqual(parsed?.patch, 3);
});

it("satisfiesSemver matches caret ranges", () => {
	assert.strictEqual(satisfiesSemver("1.2.0", "^1.0.0"), true);
	assert.strictEqual(satisfiesSemver("2.0.0", "^1.0.0"), false);
});

it("parseChangeDocument reads frontmatter and summary", () => {
	const parsed = parseChangeDocument(`---
"pkg-a": patch
---

Hello world`);
	assert.deepStrictEqual(parsed.releases, [{ name: "pkg-a", type: "patch" }]);
	assert.strictEqual(parsed.summary, "Hello world");
});

it("formatChangeDocument writes quoted package names", () => {
	const formatted = formatChangeDocument({
		summary: "Summary",
		releases: [{ name: "pkg-a", type: "minor" }],
	});
	assert.include(formatted, '"pkg-a": minor');
	assert.include(formatted, "Summary");
});

it("globMatch supports star wildcards", () => {
	assert.strictEqual(globMatch("pkg-a", "pkg-*"), true);
	assert.strictEqual(globMatch("other", "pkg-*"), false);
});
