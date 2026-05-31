import { Effect, Layer } from "effect";
import { Git, GitError } from "../services/Git.ts";

type GitResult = {
	readonly code: number;
	readonly stdout: string;
	readonly stderr: string;
};

const runGit = Effect.fnUntraced(function* (
	args: ReadonlyArray<string>,
	cwd: string,
) {
	return yield* Effect.tryPromise({
		try: (): Promise<GitResult> => {
			const process = Bun.spawn(["git", ...args], {
				cwd,
				stdout: "pipe",
				stderr: "pipe",
			});
			return Promise.all([
				process.exited,
				new Response(process.stdout).text(),
				new Response(process.stderr).text(),
			]).then(([code, stdout, stderr]) => ({ code, stdout, stderr }));
		},
		catch: (cause) =>
			new GitError({
				message: `git ${args.join(" ")} failed`,
				cause,
			}),
	});
});

const requireSuccess = Effect.fnUntraced(function* (
	args: ReadonlyArray<string>,
	cwd: string,
) {
	const result = yield* runGit(args, cwd);
	if (result.code !== 0) {
		return yield* new GitError({
			message:
				result.stderr.trim() || `git ${args.join(" ")} exited ${result.code}`,
		});
	}
	return result;
});

export const layer = Layer.succeed(
	Git,
	Git.of({
		add: (path, cwd) => requireSuccess(["add", path], cwd).pipe(Effect.asVoid),
		commit: (message, cwd) =>
			requireSuccess(["commit", "-m", message, "--allow-empty"], cwd).pipe(
				Effect.asVoid,
			),
		tag: (tagName, cwd) =>
			requireSuccess(["tag", tagName, "-m", tagName], cwd).pipe(Effect.asVoid),
		getChangedFilesSinceRef: Effect.fnUntraced(function* (options) {
			const mergeBase = yield* requireSuccess(
				["merge-base", options.ref, "HEAD"],
				options.cwd,
			);
			const diff = yield* requireSuccess(
				["diff", "--name-only", `${mergeBase.stdout.trim()}...HEAD`],
				options.cwd,
			);
			return diff.stdout
				.split("\n")
				.map((line) => line.trim())
				.filter((line) => line !== "");
		}),
		getChangedChangeFilesSinceRef: Effect.fnUntraced(function* (options) {
			const mergeBase = yield* requireSuccess(
				["merge-base", options.ref, "HEAD"],
				options.cwd,
			);
			const diff = yield* requireSuccess(
				["diff", "--name-only", `${mergeBase.stdout.trim()}...HEAD`],
				options.cwd,
			);
			return diff.stdout
				.split("\n")
				.map((line) => line.trim())
				.filter(
					(file) =>
						file !== "" && file.startsWith(".changes/") && file.endsWith(".md"),
				);
		}),
	}),
);
