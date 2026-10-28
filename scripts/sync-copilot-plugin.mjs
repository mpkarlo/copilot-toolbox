#!/usr/bin/env node
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceManifestPath = join(repo, ".claude-plugin", "plugin.json");
const sourceManifest = JSON.parse(readFileSync(sourceManifestPath, "utf8"));
const pluginRoot = join(repo, "plugins", "copilot-toolbox");
const sourceSkillsRoot = join(repo, "skills");
const outputSkillsRoot = join(pluginRoot, "skills");
const checkOnly = process.argv.includes("--check");

// The portable plugin format needs skills at skills/<name>, while the source stays bucketed.
const skills = sourceManifest.skills.map((skillPath) => {
  const source = resolve(repo, skillPath);
  if (!source.startsWith(`${sourceSkillsRoot}${sep}`)) {
    throw new Error(`Skill path is outside skills/: ${skillPath}`);
  }
  if (!existsSync(join(source, "SKILL.md"))) {
    throw new Error(`Skill is missing SKILL.md: ${skillPath}`);
  }
  return { name: basename(source), source };
});

const names = new Set(skills.map(({ name }) => name));
if (names.size !== skills.length) {
  throw new Error("Skill names must be unique in the Copilot plugin.");
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
for (const { name, source } of skills) {
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
    return existsSync(target) && !readFileSync(source).equals(readFileSync(target));
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

  console.log(`Copilot plugin bundle is in sync (${skills.length} skills).`);
  process.exit(0);
}

mkdirSync(pluginRoot, { recursive: true });
mkdirSync(outputSkillsRoot, { recursive: true });

for (const existing of readdirSync(outputSkillsRoot)) {
  if (!names.has(existing)) {
    rmSync(join(outputSkillsRoot, existing), { recursive: true, force: true });
  }
}

for (const { name, source } of skills) {
  const destination = join(outputSkillsRoot, name);
  rmSync(destination, { recursive: true, force: true });
  cpSync(source, destination, { recursive: true });
}

copyFileSync(licensePath, outputLicensePath);
console.log(`Synced ${skills.length} skills to plugins/copilot-toolbox.`);
