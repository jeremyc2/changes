import { Effect, Layer } from "effect";
import type { ChangeDraft } from "../domain/change-document.ts";
import {
	ChangeCommitHooks,
	type ChangeCommitMessage,
} from "../services/ChangeCommitHooks.ts";
import type { ReleasePlan } from "../services/ReleasePlanAssembler.ts";

const resolveAddCommitMessage = (
	draft: ChangeDraft,
): ChangeCommitMessage | undefined => {
	if (draft.releases.length === 0) {
		return { message: "docs(changes): empty change" };
	}
	const packages = draft.releases.map((release) => release.name).join(", ");
	return { message: `docs(changes): ${packages}` };
};

const resolveVersionCommitMessage = (
	plan: ReleasePlan,
): ChangeCommitMessage | undefined => {
	if (plan.releases.length === 0) {
		return undefined;
	}
	const packages = plan.releases
		.map((release) => `${release.name}@${release.newVersion}`)
		.join(", ");
	return { message: `Version Packages (${packages})` };
};

export const layer = Layer.succeed(
	ChangeCommitHooks,
	ChangeCommitHooks.of({
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
