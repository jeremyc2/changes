# Changes

Changes is an Effect v4 implementation of the changes CLI.

It keeps the familiar release workflow: contributors record release intent in
`.changes/*.md` files, maintainers combine those files into a release plan,
then the changes CLI applies version updates, changelog entries, npm publishing,
and git tags.

The implementation is deliberately service-oriented. User-facing commands depend
on Effect services for git, npm publishing, filesystem access, prompts, package
discovery, release-plan assembly, changelog generation, and output. That keeps
the command workflows testable without shelling out to real tools.

Initialized with the [Bootstrap Effect Agent Skill](https://github.com/jeremyc2/skills/blob/main/bootstrap-effect/SKILL.md).

## Status

The command surface mirrors the main Changesets release loop. Behavior is
checked against `reference_repositories/changesets`, while code design follows
the Effect v4 patterns in `reference_repositories/effect-smol`.

The current implementation covers the core local release workflow. Remaining
parity work should be tracked as specific feature gaps.

Commands:

- `changes init`
- `changes add`
- `changes version`
- `changes publish`
- `changes status`
- `changes pre enter`
- `changes pre exit`
- `changes tag`

## Requirements

- [Bun](https://bun.sh/) for local development and test execution
- Git for changed-file detection and release tags
- npm for `changes publish`

## Quick Start

Install dependencies:

```sh
bun install
```

Run the local changes CLI:

```sh
bun dev --help
```

During local development, use `bun dev` anywhere this README shows the
installed `changes` binary:

```sh
bun dev init
bun dev add
bun dev version
```

## Release Workflow

Initialize a repository once:

```sh
changes init
```

Add a change while working on a release-impacting update:

```sh
changes add
```

Check what would be released:

```sh
changes status --verbose
```

Apply the accumulated changes to package versions and changelogs:

```sh
changes version
```

Publish packages and create git tags:

```sh
changes publish
```

Push the release commit and tags from your own git workflow after publishing.

## Change Files

A change file is a Markdown file under `.changes/` with frontmatter listing the
packages and semver bump types, followed by the release summary:

```md
---
"pkg-a": patch
"pkg-b": minor
---

Describe the change in human terms.
```

Supported bump types are `major`, `minor`, `patch`, and `none`.

An empty change file is valid when a workflow needs a change file but no package
should be released:

```md
---
---
```

## Commands

### `changes init`

Creates `.changes/config.json` and `.changes/README.md`.

The generated config starts with changes defaults, including
`baseBranch: "main"`, changelog generation enabled, commit hooks disabled,
private packages skipped for versioning and tagging, and `changedFilePatterns`
set to `["**"]`.

### `changes add`

Prompts for packages, bump types, and a summary, then writes a new
`.changes/<id>.md` file.

Flags:

- `--since <ref>` detects changed packages against a specific git ref instead of
  the configured base branch.
- `--message <text>` supplies the summary without prompting for it.
- `--open` opens the created change file in an editor after writing it.
- `--empty` writes a change file with no package releases.

If the config enables commit hooks, `add` stages and commits the generated
change file.

### `changes version`

Reads all current changes, assembles a release plan, updates package versions,
updates internal dependency ranges including supported `workspace:` ranges,
appends generated changelog entries when configured, and removes consumed change
files.

Flags:

- `--ignore <pkg-a,pkg-b>` skips specific packages while assembling the release
  plan.
- `--snapshot` writes snapshot-style versions instead of normal semver bumps.

### `changes publish`

Publishes planned public releases to npm from each package directory and creates
package git tags. `publishConfig.directory` and `publishConfig.access` are
respected when present.

Flags:

- `--tag <dist-tag>` forwards an npm dist-tag.
- `--otp <code>` forwards an npm one-time password.
- `--no-git-tag` skips git tag creation.

### `changes status`

Reports unreleased changes and the releases they imply. Generated
`.changes/README.md` files are ignored, and the command fails when there are
no changes to report.

Flags:

- `--since <ref>` only reports changes touched since a git ref.
- `--verbose` prints a compact count of changes and releases.
- `--output <path>` writes JSON containing the change count and release versions.

### `changes pre`

Manages prerelease mode:

```sh
changes pre enter next
changes pre exit
```

`enter` accepts an optional tag and defaults to `next`. Entering prerelease mode
records the initial versions of discovered workspace packages in
`.changes/pre.json`.

### `changes tag`

Creates git tags for the current package versions. Monorepos use the
`<package-name>@<version>` format; single-package repositories use `v<version>`.

## Configuration

`changes init` writes `.changes/config.json`. The reader understands these
changes config fields:

- `changelog`
- `commit`
- `fixed`
- `linked`
- `access`
- `baseBranch`
- `changedFilePatterns`
- `prettier`
- `privatePackages`
- `ignore`
- `updateInternalDependencies`
- `bumpVersionsWithWorkspaceProtocolOnly`
- `snapshot`

Workspace package discovery supports a root package, array or object-form
`package.json` workspaces, nested workspace globs, pnpm workspace package blocks,
pnpm exclusions, and package manager detection from workspace files and lockfiles.

## Development

Useful commands:

```sh
bun run typecheck
bun run test
bun run test:watch
bun run check
bun run references:update
```

`bun run check` runs Biome with `--write`, so expect it to format files.

Reference repositories live under `reference_repositories/`:

- `reference_repositories/changesets` for Changesets behavior and docs
- `reference_repositories/effect-smol` for Effect v4 usage examples

## Architecture

The command layer is in `src/commands/index.ts` and the Effect CLI wiring is in
`src/cli/commands.ts`.

Domain types live in `src/domain/`. Service contracts live in `src/services/`.
Live service implementations live in `src/internal/`, with pure helpers under
`src/internal/pure/`.

Tests are split by risk and dependency boundary:

- `test/unit/` covers pure parsing, semver, glob, and readable-id behavior.
- `test/contract/` provides mock services for user-facing CLI workflows.
- `test/live/` exercises the real application layer where shell and filesystem
  behavior matter.
