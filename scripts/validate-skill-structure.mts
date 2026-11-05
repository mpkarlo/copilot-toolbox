import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";

type JsonObject = Record<string, unknown>;

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const promotedBuckets = ["engineering", "productivity"];

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readYamlObject(source: string, label: string, errors: string[]): JsonObject | undefined {
  const document = parseDocument(source, { uniqueKeys: true });
  if (document.errors.length > 0) {
    for (const error of document.errors) errors.push(`${label}: ${error.message}`);
    return undefined;
  }

  const value: unknown = document.toJS();
  if (!isObject(value)) {
    errors.push(`${label} must contain a YAML object.`);
    return undefined;
  }
  return value;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function readText(path: string, label: string, errors: string[]): string | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`${label} could not be read: ${message}`);
    return undefined;
  }
}

function validateSkillMetadata(
  root: string,
  bucket: string,
  skillName: string,
  errors: string[],
): void {
  const skillDirectory = join(root, "skills", bucket, skillName);
  const skillPath = join(skillDirectory, "SKILL.md");
  const skillContents = readText(skillPath, `${skillPath}`, errors);

  if (skillContents !== undefined) {
    const frontmatter = skillContents.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!frontmatter) {
      errors.push(`${skillPath} must begin with YAML frontmatter.`);
    } else {
      const metadata = readYamlObject(frontmatter[1], skillPath, errors);
      if (metadata) {
        if (metadata.name !== skillName) {
          errors.push(`${skillPath} name must match its directory name "${skillName}".`);
        }
        if (!nonEmptyString(metadata.description)) {
          errors.push(`${skillPath} description must be a non-empty string.`);
        }
        if (
          Object.hasOwn(metadata, "disable-model-invocation") &&
          typeof metadata["disable-model-invocation"] !== "boolean"
        ) {
          errors.push(`${skillPath} disable-model-invocation must be a boolean when present.`);
        }

        const openAiPath = join(skillDirectory, "agents", "openai.yaml");
        const openAiContents = readText(openAiPath, openAiPath, errors);
        if (openAiContents !== undefined) {
          const openAiMetadata = readYamlObject(openAiContents, openAiPath, errors);
          if (openAiMetadata) {
            const interfaceMetadata = openAiMetadata.interface;
            if (!isObject(interfaceMetadata)) {
              errors.push(`${openAiPath} interface must be a YAML object.`);
            } else {
              if (!nonEmptyString(interfaceMetadata.display_name)) {
                errors.push(`${openAiPath} interface.display_name must be a non-empty string.`);
              }
              if (!nonEmptyString(interfaceMetadata.short_description)) {
                errors.push(`${openAiPath} interface.short_description must be a non-empty string.`);
              }
            }

            const policy = openAiMetadata.policy;
            if (policy !== undefined && !isObject(policy)) {
              errors.push(`${openAiPath} policy must be a YAML object when present.`);
            } else if (metadata["disable-model-invocation"] === true) {
              if (!isObject(policy) || policy.allow_implicit_invocation !== false) {
                errors.push(
                  `${openAiPath} must disable implicit invocation for user-invoked skills.`,
                );
              }
            } else {
              if (Object.hasOwn(metadata, "disable-model-invocation")) {
                errors.push(
                  `${skillPath} must omit disable-model-invocation for model-invoked skills.`,
                );
              }
              if (policy !== undefined) {
                errors.push(`${openAiPath} must omit policy for model-invoked skills.`);
              }
            }
          }
        }
      }
    }
  }

  const docsPath = join(root, "docs", bucket, `${skillName}.md`);
  if (!existsSync(docsPath) || !lstatSync(docsPath).isFile()) {
    errors.push(`Missing promoted skill documentation page: ${docsPath}`);
  }
}

export function validateSkillStructure(root = repositoryRoot): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  let skillCount = 0;

  for (const bucket of promotedBuckets) {
    const bucketPath = join(root, "skills", bucket);
    if (!existsSync(bucketPath) || !lstatSync(bucketPath).isDirectory()) {
      errors.push(`Missing promoted skill bucket: ${bucketPath}`);
      continue;
    }

    for (const entry of readdirSync(bucketPath, { withFileTypes: true })) {
      const skillPath = join(bucketPath, entry.name);
      if (entry.isSymbolicLink()) {
        errors.push(`Unexpected promoted skill symlink: ${skillPath}`);
        continue;
      }
      if (!entry.isDirectory()) continue;

      skillCount += 1;
      const normalizedName = entry.name.toLowerCase();
      if (names.has(normalizedName)) {
        errors.push(`Promoted skill names must be unique: ${entry.name}`);
      }
      names.add(normalizedName);

      const skillFile = join(skillPath, "SKILL.md");
      if (!existsSync(skillFile) || !lstatSync(skillFile).isFile()) {
        errors.push(`Missing regular SKILL.md file: ${skillFile}`);
        continue;
      }

      validateSkillMetadata(root, bucket, entry.name, errors);
    }
  }

  if (skillCount === 0) errors.push("No promoted skills were found.");
  return errors;
}

function main(): void {
  const errors = validateSkillStructure();
  if (errors.length > 0) {
    console.error("Promoted skill structure validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log("Promoted skill metadata and documentation coverage are valid.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
