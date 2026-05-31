import { Schema } from "effect";

const unknownJsonString = Schema.fromJsonString(Schema.Unknown);

export const parseJsonString = (contents: string): unknown =>
	Schema.decodeUnknownSync(Schema.UnknownFromJsonString)(contents);

export const encodeJsonString = (value: unknown): string =>
	Schema.encodeSync(unknownJsonString)(value);

export const encodeJsonStringLine = (value: unknown): string =>
	`${encodeJsonString(value)}\n`;

const indentUnit = "  ";

const encodePrettyJsonString = (value: unknown, depth = 0): string => {
	const currentIndent = indentUnit.repeat(depth);
	const nextIndent = indentUnit.repeat(depth + 1);

	if (Array.isArray(value)) {
		if (value.length === 0) {
			return "[]";
		}
		const items = value.map(
			(item) => `${nextIndent}${encodePrettyJsonString(item, depth + 1)}`,
		);
		return `[\n${items.join(",\n")}\n${currentIndent}]`;
	}

	if (value !== null && typeof value === "object") {
		const entries = Object.entries(value as Readonly<Record<string, unknown>>);
		if (entries.length === 0) {
			return "{}";
		}
		const fields = entries.map(
			([key, fieldValue]) =>
				`${nextIndent}${encodeJsonString(key)}: ${encodePrettyJsonString(fieldValue, depth + 1)}`,
		);
		return `{\n${fields.join(",\n")}\n${currentIndent}}`;
	}

	return encodeJsonString(value);
};

export const encodePrettyJsonStringLine = (value: unknown): string =>
	`${encodePrettyJsonString(value)}\n`;
