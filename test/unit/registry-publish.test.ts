import { assert, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { layer as registryPublishLayer } from "../../src/internal/RegistryPublishLive.ts";
import { ProcessExecution } from "../../src/services/ProcessExecution.ts";
import { RegistryPublish } from "../../src/services/RegistryPublish.ts";
import type { ComprehensiveRelease } from "../../src/services/ReleasePlanAssembler.ts";

type ProcessCall = {
	readonly command: string;
	readonly args: ReadonlyArray<string>;
	readonly cwd: string;
};

const calls: Array<ProcessCall> = [];

const processExecutionLayer = Layer.succeed(
	ProcessExecution,
	ProcessExecution.of({
		run: (options) =>
			Effect.sync(() => {
				calls.push(options);
				return { code: 0, stdout: "", stderr: "" };
			}),
		spawnDetached: () => Effect.void,
	}),
);

const testLayer = registryPublishLayer.pipe(
	Layer.provide(processExecutionLayer),
);

const release = (name: string): ComprehensiveRelease => ({
	name,
	type: "patch",
	oldVersion: "1.0.0",
	newVersion: "1.0.1",
	changes: ["release"],
});

layer(testLayer)("RegistryPublish", (it) => {
	it.effect("publishes public releases from their package directories", () =>
		Effect.gen(function* () {
			calls.length = 0;
			yield* RegistryPublish.use((registryPublish) =>
				registryPublish.publish({
					cwd: "/repo",
					access: "restricted",
					tag: "next",
					otp: "123456",
					workspace: {
						dir: "/repo",
						tool: "npm",
						packages: [
							{
								dir: "/repo/packages/a",
								packageJson: { name: "pkg-a", version: "1.0.1" },
							},
							{
								dir: "/repo/packages/private",
								packageJson: {
									name: "pkg-private",
									version: "1.0.1",
									private: true,
								},
							},
							{
								dir: "/repo/packages/c",
								packageJson: {
									name: "pkg-c",
									version: "1.0.1",
									publishConfig: {
										directory: "dist",
										access: "public",
									},
								},
							},
						],
					},
					releases: [
						release("pkg-a"),
						release("pkg-private"),
						release("pkg-c"),
						{ ...release("pkg-none"), type: "none" },
					],
				}),
			);
			assert.deepStrictEqual(calls, [
				{
					command: "npm",
					args: [
						"publish",
						"--tag",
						"next",
						"--otp",
						"123456",
						"--access",
						"restricted",
					],
					cwd: "/repo/packages/a",
				},
				{
					command: "npm",
					args: [
						"publish",
						"--tag",
						"next",
						"--otp",
						"123456",
						"--access",
						"public",
					],
					cwd: "/repo/packages/c/dist",
				},
			]);
		}),
	);
});
