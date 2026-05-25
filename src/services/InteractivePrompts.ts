import { Context, type Effect } from "effect";
import type { VersionType } from "../domain/changeset-document.ts";
import type { WorkspacePackage } from "../domain/workspace-package.ts";

/**
 * Interactive CLI prompts for the `add` command.
 *
 * Replaces enquirer / inquirer usage in `@changesets/cli`.
 */
export class InteractivePrompts extends Context.Service<
	InteractivePrompts,
	{
		readonly selectPackages: (options: {
			readonly message: string;
			readonly packages: ReadonlyArray<WorkspacePackage>;
			readonly changedPackageNames: ReadonlyArray<string>;
		}) => Effect.Effect<ReadonlyArray<string>>;
		readonly selectBumpType: (options: {
			readonly message: string;
			readonly packageName: string;
		}) => Effect.Effect<VersionType>;
		readonly askSummary: (options: {
			readonly message: string;
			readonly initial?: string;
		}) => Effect.Effect<string>;
		readonly confirm: (message: string) => Effect.Effect<boolean>;
	}
>()("changes/services/InteractivePrompts") {}

export type InteractivePromptsService = InteractivePrompts["Service"];
