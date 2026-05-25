import { Effect, Layer } from "effect";
import {
	RegistryPublish,
	RegistryPublishError,
} from "../services/RegistryPublish.ts";

const publish = Effect.fnUntraced(function* (options: {
	readonly releases: Parameters<
		RegistryPublish["Service"]["publish"]
	>[0]["releases"];
	readonly cwd: string;
	readonly tag?: string;
	readonly otp?: string;
}) {
	for (const release of options.releases) {
		if (release.type === "none") {
			continue;
		}
		const args = ["publish"];
		if (options.tag !== undefined) {
			args.push("--tag", options.tag);
		}
		if (options.otp !== undefined) {
			args.push("--otp", options.otp);
		}
		yield* Effect.tryPromise({
			try: () => {
				const process = Bun.spawn(["npm", ...args], {
					cwd: options.cwd,
					stdout: "pipe",
					stderr: "pipe",
				});
				return process.exited.then((code) =>
					code === 0
						? undefined
						: new Response(process.stderr).text().then((stderr) => {
								throw new Error(
									stderr.trim() || `npm publish failed with code ${code}`,
								);
							}),
				);
			},
			catch: (cause) =>
				new RegistryPublishError({
					message: cause instanceof Error ? cause.message : String(cause),
					cause,
				}),
		});
	}
});

export const layer = Layer.succeed(
	RegistryPublish,
	RegistryPublish.of({ publish }),
);
