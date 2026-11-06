import MarkdownIt from "markdown-it";
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pathIsWithin } from "./path-is-within.mts";

type Link = { destination: string; line: number };

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const promotedBuckets = ["engineering", "productivity"];
const markdown = new MarkdownIt();

function collectMarkdownFiles(
  root: string,
  errors: string[],
  label = "skills",
): string[] {
  if (!existsSync(root)) {
    errors.push(`Missing ${label} directory: ${root}`);
    return [];
  }

  return readdirSync(root, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const path = join(root, entry.name);
      if (entry.isSymbolicLink()) {
        errors.push(`Unexpected symlink in skills tree: ${path}`);
        return [];
      }
      if (entry.isDirectory()) return collectMarkdownFiles(path, errors, label);
      return entry.isFile() && extname(entry.name).toLowerCase() === ".md" ? [path] : [];
    });
}

function linksIn(markdownText: string): Link[] {
  const tokens = markdown.parse(markdownText, {});
  const links: Link[] = [];

  for (const token of tokens) {
    if (!token.children) continue;
    for (const child of token.children) {
      const attribute = child.type === "image" ? "src" : child.type === "link_open" ? "href" : undefined;
      const destination = attribute ? child.attrGet(attribute) : null;
      if (destination) {
        links.push({
          destination,
          line: token.map?.[0] === undefined ? 1 : token.map[0] + 1,
        });
      }
    }
  }
  return links;
}

function isExternalOrAnchor(destination: string): boolean {
  return (
    destination.startsWith("#") ||
    destination.startsWith("//") ||
    /^[a-z][a-z\d+.-]*:/i.test(destination)
  );
}

function checkLinksInFiles(
  files: string[],
  containmentRoot: string,
  label: string,
  errors: string[],
): void {
  for (const sourceFile of files) {
    const markdownText = readFileSync(sourceFile, "utf8");
    for (const link of linksIn(markdownText)) {
      if (isExternalOrAnchor(link.destination)) continue;

      let targetPath: string;
      try {
        const targetUrl = new URL(link.destination, pathToFileURL(sourceFile));
        if (targetUrl.protocol !== "file:") continue;
        targetPath = fileURLToPath(targetUrl);
      } catch {
        errors.push(`${label} ${sourceFile}:${link.line} has an invalid local link: ${link.destination}`);
        continue;
      }

      if (!pathIsWithin(containmentRoot, targetPath)) {
        errors.push(`${label} ${sourceFile}:${link.line} escapes its allowed root: ${link.destination}`);
      } else if (!existsSync(targetPath)) {
        errors.push(`${label} ${sourceFile}:${link.line} points to a missing file: ${link.destination}`);
      } else {
        try {
          if (!pathIsWithin(realpathSync(containmentRoot), realpathSync(targetPath))) {
            errors.push(
              `${label} ${sourceFile}:${link.line} resolves outside its allowed root: ${link.destination}`,
            );
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(
            `${label} ${sourceFile}:${link.line} could not be resolved: ${link.destination} (${message})`,
          );
        }
      }
    }
  }
}

export function validateSkillLinks(root = repositoryRoot): string[] {
  const errors: string[] = [];
  const sourceFiles = promotedBuckets.flatMap((bucket) => {
    const bucketRoot = join(root, "skills", bucket);
    if (!existsSync(bucketRoot)) {
      errors.push(`Missing promoted skill bucket: ${bucketRoot}`);
      return [];
    }
    return readdirSync(bucketRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
      .flatMap((entry) => collectMarkdownFiles(join(bucketRoot, entry.name), errors));
  });
  const packagedFiles = collectMarkdownFiles(
    join(root, "plugins", "copilot-toolbox", "skills"),
    errors,
  );
  const documentationFiles = promotedBuckets.flatMap((bucket) =>
    collectMarkdownFiles(join(root, "docs", bucket), errors, "promoted documentation"));

  checkLinksInFiles(sourceFiles, root, "Source link", errors);
  checkLinksInFiles(documentationFiles, root, "Documentation link", errors);
  checkLinksInFiles(
    packagedFiles,
    join(root, "plugins", "copilot-toolbox"),
    "Packaged link",
    errors,
  );
  return errors;
}

function main(): void {
  const errors = validateSkillLinks();
  if (errors.length > 0) {
    console.error("Promoted skill link validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log("Promoted skill links resolve within their allowed roots.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
