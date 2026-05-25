import { Effect, Layer } from "effect";
import { PackageVersionabilityPolicy } from "../services/PackageVersionabilityPolicy.ts";

export const layer = Layer.succeed(
	PackageVersionabilityPolicy,
	PackageVersionabilityPolicy.of({
		shouldSkip: (pkg, config) =>
			Effect.succeed(
				config.ignore.includes(pkg.packageJson.name) ||
					(pkg.packageJson.private === true &&
						config.privatePackages.version !== true) ||
					pkg.packageJson.version === undefined,
			),
	}),
);
