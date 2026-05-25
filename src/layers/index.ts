import { layer as bunServicesLayer } from "@effect/platform-bun/BunServices";
import { Layer } from "effect";
import { layer as changedPackageDetectionLayer } from "../internal/ChangedPackageDetectionLive.ts";
import { layer as changelogGeneratorLayer } from "../internal/ChangelogGeneratorLive.ts";
import { layer as changesetCatalogReaderLayer } from "../internal/ChangesetCatalogReaderLive.ts";
import { layer as changesetCommitHooksLayer } from "../internal/ChangesetCommitHooksLive.ts";
import { layer as changesetConfigReaderLayer } from "../internal/ChangesetConfigReaderLive.ts";
import { layer as changesetDocumentParserLayer } from "../internal/ChangesetDocumentParserLive.ts";
import { layer as changesetDocumentWriterLayer } from "../internal/ChangesetDocumentWriterLive.ts";
import { layer as changesetStatusReporterLayer } from "../internal/ChangesetStatusReporterLive.ts";
import { layer as changesetWorkspaceInitLayer } from "../internal/ChangesetWorkspaceInitLive.ts";
import { layer as cliOutputLayer } from "../internal/CliOutputLive.ts";
import { layer as dependentsGraphBuilderLayer } from "../internal/DependentsGraphBuilderLive.ts";
import { layer as filesystemLayer } from "../internal/FilesystemLive.ts";
import { layer as gitLayer } from "../internal/GitLive.ts";
import { layer as markdownFormatterLayer } from "../internal/MarkdownFormatterLive.ts";
import { layer as packageGitTaggerLayer } from "../internal/PackageGitTaggerLive.ts";
import { layer as packageVersionabilityPolicyLayer } from "../internal/PackageVersionabilityPolicyLive.ts";
import { layer as preReleaseStateManagerLayer } from "../internal/PreReleaseStateManagerLive.ts";
import { layer as processExecutionLayer } from "../internal/ProcessExecutionLive.ts";
import { layer as registryPublishLayer } from "../internal/RegistryPublishLive.ts";
import { layer as releasePlanApplierLayer } from "../internal/ReleasePlanApplierLive.ts";
import { layer as releasePlanAssemblerLayer } from "../internal/ReleasePlanAssemblerLive.ts";
import { layer as readableChangesetIdLayer } from "../internal/readable-changeset-id/layer.ts";
import { layer as versionIncrementLayer } from "../internal/VersionIncrementLive.ts";
import { layer as workspacePackageDiscoveryLayer } from "../internal/WorkspacePackageDiscoveryLive.ts";

const infrastructureLayer = Layer.mergeAll(
	readableChangesetIdLayer,
	changesetDocumentParserLayer,
	markdownFormatterLayer,
	versionIncrementLayer,
	dependentsGraphBuilderLayer,
	packageVersionabilityPolicyLayer,
	filesystemLayer,
	gitLayer,
	processExecutionLayer,
	cliOutputLayer,
).pipe(Layer.provide(bunServicesLayer));

export const cliLiveLayer = packageGitTaggerLayer.pipe(
	Layer.provideMerge(registryPublishLayer),
	Layer.provideMerge(changedPackageDetectionLayer),
	Layer.provideMerge(changesetStatusReporterLayer),
	Layer.provideMerge(changesetCommitHooksLayer),
	Layer.provideMerge(changelogGeneratorLayer),
	Layer.provideMerge(releasePlanApplierLayer),
	Layer.provideMerge(releasePlanAssemblerLayer),
	Layer.provideMerge(changesetCatalogReaderLayer),
	Layer.provideMerge(changesetDocumentWriterLayer),
	Layer.provideMerge(preReleaseStateManagerLayer),
	Layer.provideMerge(changesetWorkspaceInitLayer),
	Layer.provideMerge(changesetConfigReaderLayer),
	Layer.provideMerge(workspacePackageDiscoveryLayer),
	Layer.provideMerge(infrastructureLayer),
);

export const appLayer = Layer.mergeAll(cliLiveLayer, bunServicesLayer);
