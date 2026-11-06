import { Ajv2020 } from "ajv/dist/2020.js";
import type { AnySchema } from "ajv";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

type JsonObject = Record<string, unknown>;

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(
  repositoryRoot,
  "schemas",
  "agent-plugins",
  "1.0.0",
  "plugin.schema.json",
);
const semanticVersionPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readJson(path: string, label: string, errors: string[]): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`${label} could not be read as JSON: ${message}`);
    return undefined;
  }
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function fieldString(
  object: JsonObject,
  field: string,
  label: string,
  errors: string[],
): string | undefined {
  const value = object[field];
  if (!nonEmptyString(value)) {
    errors.push(`${label}.${field} must be a non-empty string.`);
    return undefined;
  }
  return value;
}

function semanticVersionField(
  object: JsonObject,
  field: string,
  label: string,
  errors: string[],
): string | undefined {
  const value = object[field];
  if (typeof value !== "string" || !semanticVersionPattern.test(value)) {
    errors.push(`${label}.${field} must be a valid semantic version.`);
    return undefined;
  }
  return value;
}

function isInside(root: string, path: string): boolean {
  const pathFromRoot = relative(root, path);
  return pathFromRoot === "" ||
    (pathFromRoot !== ".." &&
      !pathFromRoot.startsWith(`..${sep}`) &&
      !isAbsolute(pathFromRoot));
}

export function validatePluginRepository(root = repositoryRoot): string[] {
  const errors: string[] = [];
  const pluginPath = join(root, "plugins", "copilot-toolbox", "plugin.json");
  const marketplacePath = join(root, ".github", "plugin", "marketplace.json");
  const packagePath = join(root, "package.json");
  const packageLockPath = join(root, "package-lock.json");
  const plugin = readJson(pluginPath, "Plugin manifest", errors);
  const marketplace = readJson(marketplacePath, "Copilot marketplace", errors);
  const packageJson = readJson(packagePath, "package.json", errors);
  const packageLock = readJson(packageLockPath, "package-lock.json", errors);

  if (!isObject(plugin)) {
    errors.push("Plugin manifest must be a JSON object.");
  } else {
    const schema = readJson(schemaPath, "Agent Plugins schema", errors);
    if (isObject(schema)) {
      const ajv = new Ajv2020({ allErrors: true, strict: true });
      const validate = ajv.compile(schema as AnySchema);
      if (!validate(plugin)) {
        for (const error of validate.errors ?? []) {
          errors.push(
            `Plugin manifest ${error.instancePath || "/"} ${error.message ?? "is invalid"}.`,
          );
        }
      }
    }
  }

  if (!isObject(marketplace)) {
    errors.push("Copilot marketplace must be a JSON object.");
  }
  if (!isObject(packageJson)) {
    errors.push("package.json must be a JSON object.");
  }
  if (!isObject(packageLock)) {
    errors.push("package-lock.json must be a JSON object.");
  }
  if (!isObject(marketplace) || !isObject(plugin) || !isObject(packageJson)) {
    return errors;
  }

  fieldString(marketplace, "name", "Copilot marketplace", errors);
  const metadata = marketplace.metadata;
  const owner = marketplace.owner;
  if (!isObject(metadata)) {
    errors.push("Copilot marketplace.metadata must be an object.");
  } else {
    fieldString(metadata, "description", "Copilot marketplace.metadata", errors);
    fieldString(metadata, "version", "Copilot marketplace.metadata", errors);
  }
  if (!isObject(owner)) {
    errors.push("Copilot marketplace.owner must be an object.");
  } else {
    fieldString(owner, "name", "Copilot marketplace.owner", errors);
  }

  const packageName = fieldString(packageJson, "name", "package.json", errors);
  const packageVersion = semanticVersionField(packageJson, "version", "package.json", errors);
  const pluginName = fieldString(plugin, "name", "Plugin manifest", errors);
  const pluginVersion = fieldString(plugin, "version", "Plugin manifest", errors);

  if (isObject(packageLock)) {
    const lockVersion = semanticVersionField(
      packageLock,
      "version",
      "package-lock.json",
      errors,
    );
    const packages = packageLock.packages;
    if (!isObject(packages)) {
      errors.push("package-lock.json.packages must be an object.");
    }
    const rootPackage = isObject(packages) ? packages[""] : undefined;
    if (!isObject(rootPackage)) {
      errors.push('package-lock.json.packages[""] must be an object.');
    } else {
      const rootVersion = semanticVersionField(
        rootPackage,
        "version",
        'package-lock.json.packages[""]',
        errors,
      );
      if (rootVersion && packageVersion && rootVersion !== packageVersion) {
        errors.push('package-lock.json.packages[""].version must match package.json.version.');
      }
    }
    if (lockVersion && packageVersion && lockVersion !== packageVersion) {
      errors.push("package-lock.json.version must match package.json.version.");
    }
  }

  if (packageName && pluginName && packageName !== pluginName) {
    errors.push("Plugin manifest name must match package.json.name.");
  }

  const plugins = marketplace.plugins;
  if (!Array.isArray(plugins)) {
    errors.push("Copilot marketplace.plugins must be an array.");
    return errors;
  }

  const matchingPlugins = plugins.filter((entry) => isObject(entry) && entry.name === pluginName);
  if (matchingPlugins.length !== 1) {
    errors.push(`Copilot marketplace must contain exactly one plugin named "${pluginName ?? ""}".`);
  }

  for (const [index, entry] of plugins.entries()) {
    const label = `Copilot marketplace.plugins[${index}]`;
    if (!isObject(entry)) {
      errors.push(`${label} must be an object.`);
      continue;
    }

    fieldString(entry, "name", label, errors);
    fieldString(entry, "description", label, errors);
    const source = fieldString(entry, "source", label, errors);
    const version = fieldString(entry, "version", label, errors);
    if (entry.name === pluginName && version && packageVersion && version !== packageVersion) {
      errors.push(`${label}.version must match package.json.version.`);
    }

    if (source) {
      const sourceSegments = source.split("/");
      const sourcePath = resolve(root, ...sourceSegments);
      const pluginManifestPath = join(sourcePath, "plugin.json");
      if (
        isAbsolute(source) ||
        source.includes("\\") ||
        sourceSegments.some((segment) => segment === "." || segment === "..") ||
        !isInside(root, sourcePath)
      ) {
        errors.push(`${label}.source must be a repository-relative path without traversal.`);
      } else if (!existsSync(pluginManifestPath)) {
        errors.push(`${label}.source must point to a directory containing plugin.json.`);
      } else {
        try {
          const realRepositoryRoot = realpathSync(root);
          if (!isInside(realRepositoryRoot, realpathSync(sourcePath))) {
            errors.push(`${label}.source must resolve to a directory inside the repository.`);
          } else if (!isInside(realRepositoryRoot, realpathSync(pluginManifestPath))) {
            errors.push(`${label}.source plugin.json must resolve to a file inside the repository.`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`${label}.source could not be resolved: ${message}`);
        }
      }
    }
  }

  if (pluginVersion && packageVersion && pluginVersion !== packageVersion) {
    errors.push("Plugin manifest version must match package.json.version.");
  }

  return errors;
}

function main(): void {
  const errors = validatePluginRepository();
  if (errors.length > 0) {
    console.error("Plugin manifest validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log("Plugin manifest and Copilot marketplace are valid.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
