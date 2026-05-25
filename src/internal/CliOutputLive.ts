import { Console, Layer } from "effect";
import { CliOutput } from "../services/CliOutput.ts";

export const layer = Layer.succeed(
	CliOutput,
	CliOutput.of({
		info: (message) => Console.log(message),
		warn: (message) => Console.warn(message),
		error: (message) => Console.error(message),
		log: (message) => Console.log(message),
		success: (message) => Console.log(`✔ ${message}`),
	}),
);
