import { Context, type Effect, Schema } from "effect";
import type { WorkspaceRoot } from "../domain/workspace-package.ts";

export type DependentsGraph = ReadonlyMap<string, ReadonlyArray<string>>;

export class DependentsGraphError extends Schema.TaggedErrorClass<DependentsGraphError>()(
	"DependentsGraphError",
	{ message: Schema.String },
) {}

/**
 * Builds a map of package name → packages that depend on it.
 *
 * Replaces upstream dependent graph building.
 */
export class DependentsGraphBuilder extends Context.Service<
	DependentsGraphBuilder,
	{
		readonly build: (
			workspace: WorkspaceRoot,
		) => Effect.Effect<DependentsGraph, DependentsGraphError>;
	}
>()("changes/services/DependentsGraphBuilder") {}

export type DependentsGraphBuilderService = DependentsGraphBuilder["Service"];
