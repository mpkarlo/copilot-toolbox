#!/usr/bin/env node
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  lstatSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {
  dirname,
  extname,
  join,
  normalize,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pathIsWithin } from "./path-is-within.mts";

const repo = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pluginRoot = join(repo, "plugins", "copilot-toolbox");
const sourceSkillsRoot = join(repo, "skills");
const outputSkillsRoot = join(pluginRoot, "skills");
const checkOnly = process.argv.includes("--check");

const promotedSkillBuckets = ["engineering", "productivity"];

function discoverSkillsInBucket(bucketPath) {
  const skills = [];
  for (const entry of readdirSync(bucketPath, { withFileTypes: true })) {
    const source = join(bucketPath, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Unexpected skill symlink: ${source}`);
    }
    if (!entry.isDirectory()) continue;

    const skillFile = join(source, "SKILL.md");
    if (!existsSync(skillFile) || !lstatSync(skillFile).isFile()) {
      throw new Error(`Skill is missing SKILL.md as a regular file: ${source}`);
    }
    skills.push({ name: entry.name, source });
  }
  return skills;
}

const promotedSkills = promotedSkillBuckets.flatMap((bucket) =>
  discoverSkillsInBucket(join(sourceSkillsRoot, bucket)));

const promotedSkillNames = new Set(promotedSkills.map(({ name }) => name));
const caseInsensitiveSkillNames = new Set(promotedSkills.map(({ name }) => name.toLowerCase()));
if (caseInsensitiveSkillNames.size !== promotedSkills.length) {
  throw new Error("Skill names must be unique in the Copilot plugin.");
}

function maskCode(markdown) {
  const masked = markdown.split("");
  const maskRange = (start, end) => {
    for (let index = start; index < end; index += 1) {
      if (masked[index] !== "\n" && masked[index] !== "\r") masked[index] = " ";
    }
  };
  let fence;
  let lineStart = 0;

  while (lineStart < markdown.length) {
    const newline = markdown.indexOf("\n", lineStart);
    const lineEnd = newline === -1 ? markdown.length : newline;
    const line = markdown.slice(lineStart, lineEnd).replace(/\r$/, "");
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);

    if (!fence && marker) {
      fence = { character: marker[1][0], length: marker[1].length };
      maskRange(lineStart, newline === -1 ? lineEnd : newline + 1);
    } else if (fence) {
      const closing = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      maskRange(lineStart, newline === -1 ? lineEnd : newline + 1);
      if (
        closing &&
        closing[1][0] === fence.character &&
        closing[1].length >= fence.length
      ) {
        fence = undefined;
      }
    }

    lineStart = newline === -1 ? markdown.length : newline + 1;
  }

  for (let index = 0; index < masked.length;) {
    if (masked[index] !== "`") {
      index += 1;
      continue;
    }
    let precedingBackslashes = 0;
    for (let cursor = index - 1; cursor >= 0 && masked[cursor] === "\\"; cursor -= 1) {
      precedingBackslashes += 1;
    }
    let length = 1;
    while (masked[index + length] === "`") length += 1;
    if (precedingBackslashes % 2 === 1) {
      index += length;
      continue;
    }

    let closing = index + length;
    while (closing < masked.length) {
      if (masked[closing] !== "`") {
        closing += 1;
        continue;
      }
      let closingLength = 1;
      while (masked[closing + closingLength] === "`") closingLength += 1;
      if (closingLength === length) break;
      closing += closingLength;
    }
    if (closing >= masked.length) {
      index += length;
      continue;
    }
    maskRange(index, closing + length);
    index = closing + length;
  }

  return masked.join("");
}

function rewriteMarkdownLinks(markdown, sourceFile, destinationFile) {
  const rewrittenTarget = (destination) => {
    const isBracketed = destination.startsWith("<") && destination.endsWith(">");
    const linkTarget = isBracketed ? destination.slice(1, -1) : destination;
    const resolvedLinkTarget = linkTarget.replace(
      /\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g,
      "$1",
    );
    if (
      !resolvedLinkTarget ||
      resolvedLinkTarget.startsWith("#") ||
      resolvedLinkTarget.startsWith("//") ||
      /^[a-z][a-z\d+.-]*:/i.test(resolvedLinkTarget)
    ) {
      return destination;
    }

    const targetUrl = new URL(resolvedLinkTarget, pathToFileURL(sourceFile));
    if (targetUrl.protocol !== "file:") return destination;

    const sourceTarget = fileURLToPath(targetUrl);
    const targetSkill = promotedSkills.find(({ source }) =>
      pathIsWithin(source, sourceTarget));
    if (!targetSkill) return destination;

    const destinationTarget = join(
      outputSkillsRoot,
      targetSkill.name,
      relative(targetSkill.source, sourceTarget),
    );
    const relativeTarget = relative(dirname(destinationFile), destinationTarget)
      .split(sep)
      .map(encodeURIComponent)
      .join("/");
    const rewritten = `${relativeTarget}${targetUrl.search}${targetUrl.hash}`;
    if (normalize(linkTarget) === normalize(rewritten)) return destination;

    return isBracketed ? `<${rewritten}>` : rewritten;
  };

  const masked = maskCode(markdown);
  const replacements = [];
  const escaped = new Uint8Array(masked.length);
  let backslashes = 0;
  for (let index = 0; index < masked.length; index += 1) {
    if (masked[index] === "\\") {
      backslashes += 1;
      continue;
    }
    escaped[index] = backslashes % 2;
    backslashes = 0;
  }
  const isEscaped = (index) => escaped[index] === 1;
  const findClosingBracket = (start) => {
    let depth = 1;
    for (let index = start + 1; index < masked.length; index += 1) {
      if (isEscaped(index)) continue;
      if (masked[index] === "[") depth += 1;
      if (masked[index] === "]") {
        depth -= 1;
        if (depth === 0) return index;
      }
    }
    return -1;
  };
  for (let index = 0; index < masked.length; index += 1) {
    if (masked[index] !== "[" || isEscaped(index)) continue;
    const labelEnd = findClosingBracket(index);
    if (labelEnd === -1 || masked[labelEnd + 1] !== "(") continue;

    let destinationStart = labelEnd + 2;
    while (/\s/.test(masked[destinationStart] ?? "")) destinationStart += 1;
    let destinationEnd = destinationStart;
    if (masked[destinationStart] === "<") {
      destinationStart += 1;
      destinationEnd = destinationStart;
      while (
        destinationEnd < masked.length &&
        (masked[destinationEnd] !== ">" || isEscaped(destinationEnd))
      ) {
        destinationEnd += 1;
      }
      if (destinationEnd === masked.length) continue;
    } else {
      let parentheses = 0;
      while (destinationEnd < masked.length && !/\s/.test(masked[destinationEnd])) {
        if (isEscaped(destinationEnd)) {
          destinationEnd += 2;
          continue;
        }
        if (masked[destinationEnd] === "(") parentheses += 1;
        if (masked[destinationEnd] === ")") {
          if (parentheses === 0) break;
          parentheses -= 1;
        }
        destinationEnd += 1;
      }
    }
    if (destinationEnd === destinationStart) continue;

    const destination = markdown.slice(destinationStart, destinationEnd);
    const rewritten = rewrittenTarget(destination);
    if (rewritten !== destination) {
      replacements.push({ start: destinationStart, end: destinationEnd, content: rewritten });
    }
    index = labelEnd;
  }

  const referenceDefinition = /^ {0,3}\[[^\]\r\n]+\]:[ \t]*(<[^>\r\n]+>|[^ \t\r\n]+)/gm;
  for (const match of masked.matchAll(referenceDefinition)) {
    const destination = match[1];
    const rewritten = rewrittenTarget(destination);
    if (rewritten !== destination) {
      const offset = match.index + match[0].lastIndexOf(destination);
      const bracketOffset = destination.startsWith("<") ? 1 : 0;
      replacements.push({
        start: offset + bracketOffset,
        end: offset + destination.length - bracketOffset,
        content: bracketOffset ? rewritten.slice(1, -1) : rewritten,
      });
    }
  }

  let result = markdown;
  for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
    result = `${result.slice(0, replacement.start)}${replacement.content}${result.slice(replacement.end)}`;
  }
  return result;
}

function expectedContent(source, destination) {
  const content = readFileSync(source);
  if (extname(source).toLowerCase() !== ".md") return content;
  return Buffer.from(rewriteMarkdownLinks(content.toString("utf8"), source, destination));
}

function filesUnder(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const path = join(root, entry.name);
      return entry.isDirectory()
        ? filesUnder(path).map((child) => join(entry.name, child))
        : [entry.name];
    });
}

const expectedFiles = new Map();
for (const { name, source } of promotedSkills) {
  for (const file of filesUnder(source)) {
    expectedFiles.set(join(name, file), join(source, file));
  }
}

const licensePath = join(repo, "LICENSE");
const outputLicensePath = join(pluginRoot, "LICENSE");
if (!existsSync(licensePath)) {
  throw new Error("Repository LICENSE file is missing.");
}

if (checkOnly) {
  const actualFiles = filesUnder(outputSkillsRoot);
  const missing = [...expectedFiles.keys()].filter((file) => !actualFiles.includes(file));
  const extra = actualFiles.filter((file) => !expectedFiles.has(file));
  const changed = [...expectedFiles].filter(([file, source]) => {
    const target = join(outputSkillsRoot, file);
    return existsSync(target) && !expectedContent(source, target).equals(readFileSync(target));
  });
  const licenseMatches =
    existsSync(outputLicensePath) &&
    readFileSync(licensePath).equals(readFileSync(outputLicensePath));

  if (missing.length || extra.length || changed.length || !licenseMatches) {
    console.error("Copilot plugin bundle is out of sync.");
    if (missing.length) console.error(`Missing: ${missing.join(", ")}`);
    if (extra.length) console.error(`Unexpected: ${extra.join(", ")}`);
    if (changed.length) console.error(`Changed: ${changed.map(([file]) => file).join(", ")}`);
    if (!licenseMatches) console.error("LICENSE differs from the repository root.");
    process.exit(1);
  }

  console.log(`Copilot plugin bundle is in sync (${promotedSkills.length} skills).`);
  process.exit(0);
}

mkdirSync(pluginRoot, { recursive: true });
mkdirSync(outputSkillsRoot, { recursive: true });

for (const existing of readdirSync(outputSkillsRoot)) {
  if (!promotedSkillNames.has(existing)) {
    rmSync(join(outputSkillsRoot, existing), { recursive: true, force: true });
  }
}

for (const { name, source } of promotedSkills) {
  const destination = join(outputSkillsRoot, name);
  rmSync(destination, { recursive: true, force: true });
  cpSync(source, destination, { recursive: true });
}

for (const [file, source] of expectedFiles) {
  const destination = join(outputSkillsRoot, file);
  const content = expectedContent(source, destination);
  if (!content.equals(readFileSync(source))) writeFileSync(destination, content);
}

copyFileSync(licensePath, outputLicensePath);
console.log(`Synced ${promotedSkills.length} skills to plugins/copilot-toolbox.`);
