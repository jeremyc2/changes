import type {
	ChangesetDraft,
	Release,
	VersionType,
} from "../../domain/changeset-document.ts";
import { versionTypes } from "../../domain/changeset-document.ts";

// [\s\S] matches any character including newlines (DOTALL)
const frontmatterPattern = /\s*---([\s\S]*?)\n\s*---(\s*(?:\n|$)[\s\S]*)/;

const exampleFormat = `---\n"package-name": patch\n---`;

const validVersionTypes: ReadonlySet<VersionType> = new Set(versionTypes);

const truncate = (value: string, max = 200): string =>
	value.length > max ? `${value.slice(0, max)}...` : value;

const validateReleases = (
	releases: ReadonlyArray<Release>,
	contents: string,
): void => {
	for (const release of releases) {
		if (typeof release.name !== "string" || release.name.trim() === "") {
			throw new Error(
				`could not parse changeset - invalid package name in frontmatter.\nExpected a non-empty string for package name, but got: ${JSON.stringify(release.name)}\nChangeset contents:\n${truncate(contents)}`,
			);
		}
		if (typeof release.type !== "string") {
			throw new Error(
				`could not parse changeset - invalid release type for package "${release.name}".\nExpected a string for release type, but got: ${typeof release.type}\nChangeset contents:\n${truncate(contents)}`,
			);
		}
		if (!validVersionTypes.has(release.type)) {
			throw new Error(
				`could not parse changeset - invalid version type ${JSON.stringify(release.type)} for package "${release.name}".\nValid version types are: ${versionTypes.join(", ")}\nChangeset contents:\n${truncate(contents)}`,
			);
		}
	}
};

const parseFrontmatterLine = (
	line: string,
): { readonly name: string; readonly type: VersionType } | undefined => {
	const trimmed = line.trim();
	if (trimmed === "") {
		return undefined;
	}
	// Match `"package-name": patch` or `package-name: patch`
	const match = /^("([^"]+)"|([^:]+))\s*:\s*(\S+)\s*$/.exec(trimmed);
	if (match === null) {
		return undefined;
	}
	const name = match[2] ?? match[3];
	const type = match[4];
	if (name === undefined || type === undefined) {
		return undefined;
	}
	return { name, type: type as VersionType };
};

export const parseChangesetDocument = (contents: string): ChangesetDraft => {
	const trimmedContents = contents.trim();
	if (trimmedContents === "") {
		throw new Error(
			`could not parse changeset - file is empty.\nChangesets must have frontmatter with package names and version types.\nExample:\n${exampleFormat}\n\nYour changeset summary here.`,
		);
	}
	const match = frontmatterPattern.exec(contents);
	if (match === null) {
		throw new Error(
			`could not parse changeset - missing or invalid frontmatter.\nChangesets must start with frontmatter delimited by "---".\nExample:\n${exampleFormat}\n\nYour changeset summary here.\nReceived content:\n${truncate(trimmedContents)}`,
		);
	}
	const roughReleases = match[1];
	const roughSummary = match[2];
	if (roughReleases === undefined || roughSummary === undefined) {
		throw new Error(
			`could not parse changeset - missing or invalid frontmatter.\nChangesets must start with frontmatter delimited by "---".\nExample:\n${exampleFormat}\n\nYour changeset summary here.\nReceived content:\n${truncate(trimmedContents)}`,
		);
	}
	const summary = roughSummary.trim();
	const releases = roughReleases
		.split("\n")
		.map(parseFrontmatterLine)
		.filter((release): release is Release => release !== undefined);
	validateReleases(releases, contents);
	return { summary, releases };
};

export const formatChangesetDocument = (draft: ChangesetDraft): string => {
	const frontmatter = draft.releases
		.map((release) => `"${release.name}": ${release.type}`)
		.join("\n");
	return `---\n${frontmatter}\n---\n\n${draft.summary}\n`;
};
