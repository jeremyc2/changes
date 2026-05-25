import { Effect, Layer } from "effect";
import type { ChangesetDraft } from "../domain/changeset-document.ts";
import {
	ChangesetCommitHooks,
	type ChangesetCommitMessage,
} from "../services/ChangesetCommitHooks.ts";
import type { ReleasePlan } from "../services/ReleasePlanAssembler.ts";

const resolveAddCommitMessage = (
	draft: ChangesetDraft,
): ChangesetCommitMessage | undefined => {
	if (draft.releases.length === 0) {
		return { message: "docs(changesets): empty changeset" };
	}
	const packages = draft.releases.map((release) => release.name).join(", ");
	return { message: `docs(changesets): ${packages}` };
};

const resolveVersionCommitMessage = (
	plan: ReleasePlan,
): ChangesetCommitMessage | undefined => {
	if (plan.releases.length === 0) {
		return undefined;
	}
	const packages = plan.releases
		.map((release) => `${release.name}@${release.newVersion}`)
		.join(", ");
	return { message: `Version Packages (${packages})` };
};

export const layer = Layer.succeed(
	ChangesetCommitHooks,
	ChangesetCommitHooks.of({
		resolveAddCommitMessage: (options) =>
			Effect.sync(() =>
				options.config.commit === false
					? undefined
					: resolveAddCommitMessage(options.draft),
			),
		resolveVersionCommitMessage: (options) =>
			Effect.sync(() =>
				options.config.commit === false
					? undefined
					: resolveVersionCommitMessage(options.plan),
			),
	}),
);
