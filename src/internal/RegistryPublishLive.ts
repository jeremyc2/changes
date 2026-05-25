import { Effect, Layer } from "effect";
import { ProcessExecution } from "../services/ProcessExecution.ts";
import {
	RegistryPublish,
	RegistryPublishError,
} from "../services/RegistryPublish.ts";

const make = Effect.gen(function* () {
	const processExecution = yield* ProcessExecution;

	const publish = Effect.fnUntraced(function* (
		options: Parameters<RegistryPublish["Service"]["publish"]>[0],
	) {
		const packagesByName = new Map(
			options.workspace.packages.map((workspacePackage) => [
				workspacePackage.packageJson.name,
				workspacePackage,
			]),
		);
		for (const release of options.releases) {
			if (release.type === "none") {
				continue;
			}
			const workspacePackage = packagesByName.get(release.name);
			if (workspacePackage === undefined) {
				return yield* new RegistryPublishError({
					message: `Could not find matching package for release of ${release.name}`,
				});
			}
			if (workspacePackage.packageJson.private === true) {
				continue;
			}
			const publishDirectory =
				workspacePackage.packageJson.publishConfig?.directory === undefined
					? workspacePackage.dir
					: `${workspacePackage.dir}/${workspacePackage.packageJson.publishConfig.directory}`;
			const args = ["publish"];
			if (options.tag !== undefined) {
				args.push("--tag", options.tag);
			}
			if (options.otp !== undefined) {
				args.push("--otp", options.otp);
			}
			args.push(
				"--access",
				workspacePackage.packageJson.publishConfig?.access ?? options.access,
			);
			const result = yield* processExecution
				.run({
					command: "npm",
					args,
					cwd: publishDirectory,
				})
				.pipe(
					Effect.mapError(
						(cause) =>
							new RegistryPublishError({
								message: cause.message,
								cause,
							}),
					),
				);
			if (result.code !== 0) {
				return yield* new RegistryPublishError({
					message:
						result.stderr.trim() ||
						`npm publish failed with code ${result.code}`,
				});
			}
		}
	});

	return RegistryPublish.of({ publish });
});

export const layer = Layer.effect(RegistryPublish, make);
