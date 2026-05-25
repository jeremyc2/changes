import { Schema } from "effect";

const unknownJsonString = Schema.fromJsonString(Schema.Unknown);

export const parseJsonString = (contents: string): unknown =>
	Schema.decodeUnknownSync(Schema.UnknownFromJsonString)(contents);

export const encodeJsonString = (value: unknown): string =>
	Schema.encodeSync(unknownJsonString)(value);

export const encodeJsonStringLine = (value: unknown): string =>
	`${encodeJsonString(value)}\n`;
