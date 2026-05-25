/** How `version` resolves next package versions. */
export type VersionMode =
	| { readonly _tag: "default" }
	| { readonly _tag: "snapshot"; readonly tag?: string };

export const defaultVersionMode = {
	_tag: "default",
} as const satisfies VersionMode;

export const snapshotVersionMode = (tag?: string): VersionMode => ({
	_tag: "snapshot",
	...(tag === undefined ? {} : { tag }),
});
