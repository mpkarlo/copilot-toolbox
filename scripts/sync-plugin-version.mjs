#!/usr/bin/env node
// Copies package.json's version into both plugin manifests and the Copilot catalog.
// Runs as part of `npm run version`, immediately after `changeset version`.
// With --check it changes nothing and exits 1 if any version differs.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const pluginPaths = [
  join(repo, ".claude-plugin", "plugin.json"),
  join(repo, "plugins", "copilot-toolbox", "plugin.json"),
];
const copilotMarketplacePath = join(repo, ".github", "plugin", "marketplace.json");

const { version } = JSON.parse(readFileSync(join(repo, "package.json"), "utf8"));
const checkOnly = process.argv.includes("--check");
let mismatches = 0;

for (const pluginPath of pluginPaths) {
  const source = readFileSync(pluginPath, "utf8");
  const plugin = JSON.parse(source);

  if (plugin.version === version) continue;

  mismatches += 1;
  if (checkOnly) {
    console.error(
      `${pluginPath} version is ${plugin.version}, package.json is ${version}. Run \`node scripts/sync-plugin-version.mjs\`.`,
    );
    continue;
  }

  const updated = source.replace(/("version"\s*:\s*")[^"]*(")/, `$1${version}$2`);
  if (JSON.parse(updated).version !== version) {
    console.error(`Could not find a version field to replace in ${pluginPath}.`);
    process.exitCode = 1;
    continue;
  }

  writeFileSync(pluginPath, updated);
  console.log(`${pluginPath} version ${plugin.version} -> ${version}`);
}

if (checkOnly && mismatches) process.exit(1);
if (checkOnly) console.log(`All plugin manifests use version ${version}.`);

const marketplaceSource = readFileSync(copilotMarketplacePath, "utf8");
const marketplace = JSON.parse(marketplaceSource);
const copilotToolbox = marketplace.plugins.find(
  (plugin) => plugin.name === "copilot-toolbox",
);

if (!copilotToolbox) {
  console.error(`Could not find copilot-toolbox in ${copilotMarketplacePath}.`);
  process.exit(1);
}

if (copilotToolbox.version !== version) {
  if (checkOnly) {
    console.error(
      `${copilotMarketplacePath} copilot-toolbox version is ${copilotToolbox.version}, package.json is ${version}. Run \`node scripts/sync-plugin-version.mjs\`.`,
    );
    process.exit(1);
  }

  const updated = marketplaceSource.replace(
    /("name"\s*:\s*"copilot-toolbox"[\s\S]*?"version"\s*:\s*")[^"]*(")/,
    `$1${version}$2`,
  );
  if (JSON.parse(updated).plugins.find((plugin) => plugin.name === "copilot-toolbox").version !== version) {
    console.error(`Could not find the copilot-toolbox version field in ${copilotMarketplacePath}.`);
    process.exit(1);
  }

  writeFileSync(copilotMarketplacePath, updated);
  console.log(`${copilotMarketplacePath} copilot-toolbox version ${copilotToolbox.version} -> ${version}`);
} else if (checkOnly) {
  console.log(`Copilot marketplace entry uses version ${version}.`);
}
