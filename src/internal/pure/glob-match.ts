const escapeRegex = (value: string): string =>
	value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

const globToRegex = (pattern: string): RegExp => {
	const regexBody = escapeRegex(pattern).replace(/\*/g, ".*");
	return new RegExp(`^${regexBody}$`);
};

export const globMatch = (value: string, pattern: string): boolean =>
	globToRegex(pattern).test(value);

export const globMatchAny = (
	value: string,
	patterns: ReadonlyArray<string>,
): boolean => patterns.some((pattern) => globMatch(value, pattern));
