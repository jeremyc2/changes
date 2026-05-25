import { Argument, Command, Flag } from "effect/unstable/cli";
import {
	addCommand,
	initCommand,
	preCommand,
	publishCommand,
	statusCommand,
	tagCommand,
	versionCommand,
} from "../commands/index.ts";
import { snapshotVersionMode } from "../domain/version-mode.ts";

const cwd = () => process.cwd();

const add = Command.make(
	"add",
	{
		since: Flag.optional(Flag.string("since")),
		message: Flag.optional(Flag.string("message")),
		open: Flag.boolean("open").pipe(Flag.withDefault(false)),
		empty: Flag.boolean("empty").pipe(Flag.withDefault(false)),
	},
	(config) =>
		addCommand(cwd(), {
			sinceRef: config.since._tag === "Some" ? config.since.value : undefined,
			message:
				config.message._tag === "Some" ? config.message.value : undefined,
			open: config.open,
			empty: config.empty,
		}),
).pipe(Command.withDescription("Add a new changeset"));

const init = Command.make("init", {}, () => initCommand(cwd())).pipe(
	Command.withDescription("Initialize changesets in the project"),
);

const version = Command.make(
	"version",
	{
		ignore: Flag.optional(Flag.string("ignore")),
		snapshot: Flag.boolean("snapshot").pipe(Flag.withDefault(false)),
	},
	(config) =>
		versionCommand(cwd(), {
			ignoredPackages:
				config.ignore._tag === "Some"
					? config.ignore.value.split(",").map((value) => value.trim())
					: undefined,
			versionMode: config.snapshot ? snapshotVersionMode() : undefined,
		}),
).pipe(Command.withDescription("Version packages based on changesets"));

const publish = Command.make(
	"publish",
	{
		tag: Flag.optional(Flag.string("tag")),
		otp: Flag.optional(Flag.string("otp")),
		noGitTag: Flag.boolean("no-git-tag").pipe(Flag.withDefault(false)),
	},
	(config) =>
		publishCommand(cwd(), {
			distTag: config.tag._tag === "Some" ? config.tag.value : undefined,
			otp: config.otp._tag === "Some" ? config.otp.value : undefined,
			skipGitTags: config.noGitTag,
		}),
).pipe(Command.withDescription("Publish packages to npm"));

const status = Command.make(
	"status",
	{
		since: Flag.optional(Flag.string("since")),
		verbose: Flag.boolean("verbose").pipe(Flag.withDefault(false)),
		output: Flag.optional(Flag.string("output")),
	},
	(config) =>
		statusCommand(cwd(), {
			sinceRef: config.since._tag === "Some" ? config.since.value : undefined,
			verbose: config.verbose,
			outputPath:
				config.output._tag === "Some" ? config.output.value : undefined,
		}),
).pipe(Command.withDescription("Report changeset status"));

const preEnter = Command.make(
	"enter",
	{
		tag: Argument.string("tag").pipe(Argument.withDefault("next")),
	},
	(config) => preCommand(cwd(), { action: "enter", tag: config.tag }),
);

const preExit = Command.make("exit", {}, () =>
	preCommand(cwd(), { action: "exit" }),
);

const pre = Command.make("pre", {}).pipe(
	Command.withSubcommands([preEnter, preExit]),
	Command.withDescription("Manage prerelease mode"),
);

const tag = Command.make("tag", {}, () => tagCommand(cwd())).pipe(
	Command.withDescription("Create git tags for package versions"),
);

export const cli = Command.make("changes").pipe(
	Command.withSubcommands([init, add, version, publish, status, pre, tag]),
	Command.withDescription("Manage versioning and publishing with changesets"),
);

export const runCli = Command.run(cli, { version: "0.0.0" });
