import { Effect, Layer } from "effect";
import {
  defaultVersionMode,
  snapshotVersionMode,
} from "../../src/domain/version-mode.ts";
import { ChangeCatalogReader } from "../../src/services/ChangeCatalogReader.ts";
import { ChangeCommitHooks } from "../../src/services/ChangeCommitHooks.ts";
import { ChangeConfigReader } from "../../src/services/ChangeConfigReader.ts";
import { ChangeDocumentWriter } from "../../src/services/ChangeDocumentWriter.ts";
import { ChangedPackageDetection } from "../../src/services/ChangedPackageDetection.ts";
import { ChangelogGenerator } from "../../src/services/ChangelogGenerator.ts";
import { ChangeStatusReporter } from "../../src/services/ChangeStatusReporter.ts";
import { ChangeWorkspaceInit } from "../../src/services/ChangeWorkspaceInit.ts";
import { CliOutput } from "../../src/services/CliOutput.ts";
import { Filesystem } from "../../src/services/Filesystem.ts";
import { Git } from "../../src/services/Git.ts";
import { PackageGitTagger } from "../../src/services/PackageGitTagger.ts";
import { PackageVersionabilityPolicy } from "../../src/services/PackageVersionabilityPolicy.ts";
import { PreReleaseStateManager } from "../../src/services/PreReleaseStateManager.ts";
import { ProcessExecution } from "../../src/services/ProcessExecution.ts";
import { RegistryPublish } from "../../src/services/RegistryPublish.ts";
import { ReleasePlanApplier } from "../../src/services/ReleasePlanApplier.ts";
import {
  type PreReleaseState,
  ReleasePlanAssembler,
} from "../../src/services/ReleasePlanAssembler.ts";
import { WorkspacePackageDiscovery } from "../../src/services/WorkspacePackageDiscovery.ts";
import {
  rootDir,
  stubConfig,
  stubDraft,
  stubReleasePlan,
  stubWorkspace,
} from "./fixtures.ts";

const noop = Effect.sync(() => {});
const noopFn = (_?: unknown, __?: unknown) => noop;

/** User-facing CLI services only — internal seams stay out. */
export const cliContractLayer = Layer.mergeAll(
  Layer.succeed(
    ChangeWorkspaceInit,
    ChangeWorkspaceInit.of({ scaffold: noopFn }),
  ),
  Layer.succeed(
    WorkspacePackageDiscovery,
    WorkspacePackageDiscovery.of({
      discover: () => Effect.succeed(stubWorkspace),
    }),
  ),
  Layer.succeed(
    ChangeConfigReader,
    ChangeConfigReader.of({
      read: () => Effect.succeed(stubConfig),
    }),
  ),
  Layer.succeed(
    ChangedPackageDetection,
    ChangedPackageDetection.of({
      detectVersionableChangedPackages: () => {
        const firstPackage = stubWorkspace.packages[0];
        return Effect.succeed(firstPackage === undefined ? [] : [firstPackage]);
      },
    }),
  ),
  Layer.succeed(
    PackageVersionabilityPolicy,
    PackageVersionabilityPolicy.of({
      shouldSkip: () => Effect.succeed(false),
    }),
  ),
  Layer.succeed(
    ChangeDocumentWriter,
    ChangeDocumentWriter.of({
      write: () => Effect.succeed(`${rootDir}/.changes/stub-slug.md`),
    }),
  ),
  Layer.succeed(
    ChangeCommitHooks,
    ChangeCommitHooks.of({
      resolveAddCommitMessage: () => Effect.sync((): undefined => undefined),
      resolveVersionCommitMessage: () =>
        Effect.sync((): undefined => undefined),
    }),
  ),
  Layer.succeed(
    CliOutput,
    CliOutput.of({
      info: noopFn,
      warn: noopFn,
      error: noopFn,
      log: noopFn,
      success: noopFn,
    }),
  ),
  Layer.succeed(
    Git,
    Git.of({
      add: noopFn,
      commit: noopFn,
      getChangedChangeFilesSinceRef: () => Effect.succeed([]),
      getChangedFilesSinceRef: () => Effect.succeed([]),
      tag: noopFn,
    }),
  ),
  Layer.succeed(
    ProcessExecution,
    ProcessExecution.of({
      run: () => Effect.succeed({ code: 0, stdout: "", stderr: "" }),
      spawnDetached: noopFn,
    }),
  ),
  Layer.succeed(
    PreReleaseStateManager,
    PreReleaseStateManager.of({
      read: () => Effect.sync((): PreReleaseState | undefined => undefined),
      enter: noopFn,
      exit: noopFn,
    }),
  ),
  Layer.succeed(
    ChangeCatalogReader,
    ChangeCatalogReader.of({
      readAll: () => Effect.succeed([{ ...stubDraft, id: "stub-change" }]),
      readSinceRef: () => Effect.succeed([]),
    }),
  ),
  Layer.succeed(
    ReleasePlanAssembler,
    ReleasePlanAssembler.of({
      assemble: (options) =>
        Effect.succeed(
          stubReleasePlan(options.versionMode ?? defaultVersionMode),
        ),
    }),
  ),
  Layer.succeed(
    ChangelogGenerator,
    ChangelogGenerator.of({
      generateEntries: () => Effect.succeed([]),
    }),
  ),
  Layer.succeed(ReleasePlanApplier, ReleasePlanApplier.of({ apply: noopFn })),
  Layer.succeed(
    ChangeStatusReporter,
    ChangeStatusReporter.of({
      report: () => Effect.succeed(stubReleasePlan()),
    }),
  ),
  Layer.succeed(
    Filesystem,
    Filesystem.of({
      readUtf8: () => Effect.succeed(""),
      writeUtf8: noopFn,
      exists: () => Effect.succeed(false),
      readDirectory: () => Effect.succeed([]),
      ensureDirectory: noopFn,
      remove: noopFn,
    }),
  ),
  Layer.succeed(RegistryPublish, RegistryPublish.of({ publish: noopFn })),
  Layer.succeed(
    PackageGitTagger,
    PackageGitTagger.of({
      tagWorkspacePackages: () => Effect.succeed(["pkg-a@1.0.0"]),
    }),
  ),
);

export const snapshotVersionModeForContract = snapshotVersionMode("contract");
