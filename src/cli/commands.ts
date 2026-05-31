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

const currentWorkingDirectory = () => process.cwd();

const addCliCommand = Command.make(
	"add",
	{
		since: Flag.optional(Flag.string("since")),
		message: Flag.optional(Flag.string("message")),
		open: Flag.boolean("open").pipe(Flag.withDefault(false)),
		empty: Flag.boolean("empty").pipe(Flag.withDefault(false)),
	},
	(config) =>
		addCommand(currentWorkingDirectory(), {
			sinceRef: config.since._tag === "Some" ? config.since.value : undefined,
			message:
				config.message._tag === "Some" ? config.message.value : undefined,
			open: config.open,
			empty: config.empty,
		}),
).pipe(Command.withDescription("Add a new change file"));

const initCliCommand = Command.make("init", {}, () =>
	initCommand(currentWorkingDirectory()),
).pipe(Command.withDescription("Initialize changes in the project"));

const versionCliCommand = Command.make(
	"version",
	{
		ignore: Flag.optional(Flag.string("ignore")),
		snapshot: Flag.boolean("snapshot").pipe(Flag.withDefault(false)),
	},
	(config) =>
		versionCommand(currentWorkingDirectory(), {
			ignoredPackages:
				config.ignore._tag === "Some"
					? config.ignore.value.split(",").map((value) => value.trim())
					: undefined,
			versionMode: config.snapshot ? snapshotVersionMode() : undefined,
		}),
).pipe(Command.withDescription("Version packages based on change files"));

const publishCliCommand = Command.make(
	"publish",
	{
		tag: Flag.optional(Flag.string("tag")),
		otp: Flag.optional(Flag.string("otp")),
		noGitTag: Flag.boolean("no-git-tag").pipe(Flag.withDefault(false)),
	},
	(config) =>
		publishCommand(currentWorkingDirectory(), {
			distTag: config.tag._tag === "Some" ? config.tag.value : undefined,
			otp: config.otp._tag === "Some" ? config.otp.value : undefined,
			skipGitTags: config.noGitTag,
		}),
).pipe(Command.withDescription("Publish packages to npm"));

const statusCliCommand = Command.make(
	"status",
	{
		since: Flag.optional(Flag.string("since")),
		verbose: Flag.boolean("verbose").pipe(Flag.withDefault(false)),
		output: Flag.optional(Flag.string("output")),
	},
	(config) =>
		statusCommand(currentWorkingDirectory(), {
			sinceRef: config.since._tag === "Some" ? config.since.value : undefined,
			verbose: config.verbose,
			outputPath:
				config.output._tag === "Some" ? config.output.value : undefined,
		}),
).pipe(Command.withDescription("Report change status"));

const preEnterCliCommand = Command.make(
	"enter",
	{
		tag: Argument.string("tag").pipe(Argument.withDefault("next")),
	},
	(config) =>
		preCommand(currentWorkingDirectory(), { action: "enter", tag: config.tag }),
);

const preExitCliCommand = Command.make("exit", {}, () =>
	preCommand(currentWorkingDirectory(), { action: "exit" }),
);

const preCliCommand = Command.make("pre", {}).pipe(
	Command.withSubcommands([preEnterCliCommand, preExitCliCommand]),
	Command.withDescription("Manage prerelease mode"),
);

const tagCliCommand = Command.make("tag", {}, () =>
	tagCommand(currentWorkingDirectory()),
).pipe(Command.withDescription("Create git tags for package versions"));

export const cli = Command.make("changes").pipe(
	Command.withSubcommands([
		initCliCommand,
		addCliCommand,
		versionCliCommand,
		publishCliCommand,
		statusCliCommand,
		preCliCommand,
		tagCliCommand,
	]),
	Command.withDescription("Manage versioning and publishing with changes"),
);

export const runCli = Command.run(cli, { version: "0.0.0" });
