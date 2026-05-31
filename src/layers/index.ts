import { layer as bunServicesLayer } from "@effect/platform-bun/BunServices";
import { Layer } from "effect";
import { layer as changeCatalogReaderLayer } from "../internal/ChangeCatalogReaderLive.ts";
import { layer as changeCommitHooksLayer } from "../internal/ChangeCommitHooksLive.ts";
import { layer as changeConfigReaderLayer } from "../internal/ChangeConfigReaderLive.ts";
import { layer as changeDocumentParserLayer } from "../internal/ChangeDocumentParserLive.ts";
import { layer as changeDocumentWriterLayer } from "../internal/ChangeDocumentWriterLive.ts";
import { layer as changedPackageDetectionLayer } from "../internal/ChangedPackageDetectionLive.ts";
import { layer as changelogGeneratorLayer } from "../internal/ChangelogGeneratorLive.ts";
import { layer as changeStatusReporterLayer } from "../internal/ChangeStatusReporterLive.ts";
import { layer as changeWorkspaceInitLayer } from "../internal/ChangeWorkspaceInitLive.ts";
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
import { layer as readableChangeIdLayer } from "../internal/readable-change-id/layer.ts";
import { layer as versionIncrementLayer } from "../internal/VersionIncrementLive.ts";
import { layer as workspacePackageDiscoveryLayer } from "../internal/WorkspacePackageDiscoveryLive.ts";

const infrastructureLayer = Layer.mergeAll(
	readableChangeIdLayer,
	changeDocumentParserLayer,
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
	Layer.provideMerge(changeStatusReporterLayer),
	Layer.provideMerge(changeCommitHooksLayer),
	Layer.provideMerge(changelogGeneratorLayer),
	Layer.provideMerge(releasePlanApplierLayer),
	Layer.provideMerge(releasePlanAssemblerLayer),
	Layer.provideMerge(changeCatalogReaderLayer),
	Layer.provideMerge(changeDocumentWriterLayer),
	Layer.provideMerge(preReleaseStateManagerLayer),
	Layer.provideMerge(changeWorkspaceInitLayer),
	Layer.provideMerge(changeConfigReaderLayer),
	Layer.provideMerge(workspacePackageDiscoveryLayer),
	Layer.provideMerge(infrastructureLayer),
);

export const appLayer = Layer.mergeAll(cliLiveLayer, bunServicesLayer);
