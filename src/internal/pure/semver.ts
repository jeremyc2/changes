export type SemverReleaseType = "major" | "minor" | "patch";

export type ParsedSemver = {
	readonly major: number;
	readonly minor: number;
	readonly patch: number;
	readonly prerelease: ReadonlyArray<string | number>;
};

const semverPattern =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?(?:\+[\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*)?$/;

export const parseSemver = (version: string): ParsedSemver | undefined => {
	const match = semverPattern.exec(version);
	if (match === null) {
		return undefined;
	}
	const major = match[1];
	const minor = match[2];
	const patch = match[3];
	const prereleaseRaw = match[4];
	if (major === undefined || minor === undefined || patch === undefined) {
		return undefined;
	}
	const prerelease =
		prereleaseRaw === undefined
			? []
			: prereleaseRaw.split(".").map((part) => {
					const asNumber = Number(part);
					return Number.isNaN(asNumber) ? part : asNumber;
				});
	return {
		major: Number(major),
		minor: Number(minor),
		patch: Number(patch),
		prerelease,
	};
};

export const formatSemver = (parsed: ParsedSemver): string => {
	const base = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
	if (parsed.prerelease.length === 0) {
		return base;
	}
	return `${base}-${parsed.prerelease.join(".")}`;
};

export const incSemver = (
	version: string,
	releaseType: SemverReleaseType,
): string | undefined => {
	const parsed = parseSemver(version);
	if (parsed === undefined) {
		return undefined;
	}
	switch (releaseType) {
		case "major":
			return formatSemver({
				major: parsed.major + 1,
				minor: 0,
				patch: 0,
				prerelease: [],
			});
		case "minor":
			return formatSemver({
				major: parsed.major,
				minor: parsed.minor + 1,
				patch: 0,
				prerelease: [],
			});
		case "patch":
			return formatSemver({
				major: parsed.major,
				minor: parsed.minor,
				patch: parsed.patch + 1,
				prerelease: [],
			});
	}
};

const comparePrerelease = (
	left: ReadonlyArray<string | number>,
	right: ReadonlyArray<string | number>,
): number => {
	if (left.length === 0 && right.length === 0) {
		return 0;
	}
	if (left.length === 0) {
		return 1;
	}
	if (right.length === 0) {
		return -1;
	}
	const length = Math.max(left.length, right.length);
	for (let index = 0; index < length; index++) {
		const leftPart = left[index];
		const rightPart = right[index];
		if (leftPart === undefined) {
			return -1;
		}
		if (rightPart === undefined) {
			return 1;
		}
		const leftIsNumber = typeof leftPart === "number";
		const rightIsNumber = typeof rightPart === "number";
		if (leftIsNumber && rightIsNumber) {
			if (leftPart !== rightPart) {
				return leftPart < rightPart ? -1 : 1;
			}
			continue;
		}
		if (leftIsNumber) {
			return -1;
		}
		if (rightIsNumber) {
			return 1;
		}
		if (leftPart !== rightPart) {
			return leftPart < rightPart ? -1 : 1;
		}
	}
	return 0;
};

export const compareSemver = (left: string, right: string): number => {
	const leftParsed = parseSemver(left);
	const rightParsed = parseSemver(right);
	if (leftParsed === undefined || rightParsed === undefined) {
		return 0;
	}
	if (leftParsed.major !== rightParsed.major) {
		return leftParsed.major < rightParsed.major ? -1 : 1;
	}
	if (leftParsed.minor !== rightParsed.minor) {
		return leftParsed.minor < rightParsed.minor ? -1 : 1;
	}
	if (leftParsed.patch !== rightParsed.patch) {
		return leftParsed.patch < rightParsed.patch ? -1 : 1;
	}
	return comparePrerelease(leftParsed.prerelease, rightParsed.prerelease);
};

const parseRangePart = (
	rangePart: string,
):
	| { readonly operator: string; readonly version: ParsedSemver }
	| undefined => {
	const trimmed = rangePart.trim();
	if (trimmed === "" || trimmed === "*") {
		return undefined;
	}
	const operatorMatch = /^(\^|~|>=|>|<=|<|=)?(.+)$/.exec(trimmed);
	if (operatorMatch === null) {
		return undefined;
	}
	const operator = operatorMatch[1] ?? "=";
	const versionText = operatorMatch[2]?.trim();
	if (versionText === undefined || versionText === "") {
		return undefined;
	}
	const parsed = parseSemver(versionText);
	if (parsed === undefined) {
		return undefined;
	}
	return { operator, version: parsed };
};

const satisfiesOperator = (
	version: ParsedSemver,
	operator: string,
	rangeVersion: ParsedSemver,
): boolean => {
	const formatted = formatSemver(version);
	const rangeFormatted = formatSemver(rangeVersion);
	switch (operator) {
		case "=":
			return compareSemver(formatted, rangeFormatted) === 0;
		case ">":
			return compareSemver(formatted, rangeFormatted) > 0;
		case ">=":
			return compareSemver(formatted, rangeFormatted) >= 0;
		case "<":
			return compareSemver(formatted, rangeFormatted) < 0;
		case "<=":
			return compareSemver(formatted, rangeFormatted) <= 0;
		case "^":
			return (
				version.major === rangeVersion.major &&
				(version.major > 0
					? version.minor >= rangeVersion.minor
					: version.minor > rangeVersion.minor ||
						(version.minor === rangeVersion.minor &&
							version.patch >= rangeVersion.patch)) &&
				compareSemver(formatted, rangeFormatted) >= 0
			);
		case "~":
			return (
				version.major === rangeVersion.major &&
				version.minor === rangeVersion.minor &&
				version.patch >= rangeVersion.patch &&
				compareSemver(formatted, rangeFormatted) >= 0
			);
		default:
			return false;
	}
};

export const satisfiesSemver = (version: string, range: string): boolean => {
	if (range.trim() === "*" || range.trim() === "") {
		return true;
	}
	const parsedVersion = parseSemver(version);
	if (parsedVersion === undefined) {
		return false;
	}
	const parts = range.split("||").map((part) => part.trim());
	return parts.some((part) => {
		const ranges = part.split(/\s+/).filter(Boolean);
		return ranges.every((rangePart) => {
			const parsedRange = parseRangePart(rangePart);
			if (parsedRange === undefined) {
				return true;
			}
			return satisfiesOperator(
				parsedVersion,
				parsedRange.operator,
				parsedRange.version,
			);
		});
	});
};
