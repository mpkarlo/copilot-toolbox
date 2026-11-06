#!/usr/bin/env node
// Copies package.json's version into the Copilot plugin manifest and catalog.
// Runs as part of `npm run version`, immediately after `changeset version`.
// With --check it changes nothing and exits 1 if any version differs.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const copilotPluginPath = join(repo, "plugins", "copilot-toolbox", "plugin.json");
const copilotMarketplacePath = join(repo, ".github", "plugin", "marketplace.json");

const { version } = JSON.parse(readFileSync(join(repo, "package.json"), "utf8"));
const checkOnly = process.argv.includes("--check");
let mismatches = 0;

const pluginSource = readFileSync(copilotPluginPath, "utf8");
const plugin = JSON.parse(pluginSource);

if (plugin.version !== version) {
  mismatches += 1;
  if (checkOnly) {
    console.error(
      `${copilotPluginPath} version is ${plugin.version}, package.json is ${version}. Run \`node scripts/sync-plugin-version.mjs\` to update it.`,
    );
  } else {
    const updated = pluginSource.replace(/("version"\s*:\s*")[^"]*(")/, `$1${version}$2`);
    if (JSON.parse(updated).version !== version) {
      console.error(`Could not find a version field to replace in ${copilotPluginPath}.`);
      process.exitCode = 1;
    } else {
      writeFileSync(copilotPluginPath, updated);
      console.log(`${copilotPluginPath} version ${plugin.version} -> ${version}`);
    }
  }
}

const marketplaceSource = readFileSync(copilotMarketplacePath, "utf8");
const marketplace = JSON.parse(marketplaceSource);
const copilotToolbox = marketplace.plugins.find(
  (plugin) => plugin.name === "copilot-toolbox",
);

if (!copilotToolbox) {
  console.error(`Could not find copilot-toolbox in ${copilotMarketplacePath}.`);
  mismatches += 1;
  process.exitCode = 1;
} else if (copilotToolbox.version !== version) {
  mismatches += 1;
  if (checkOnly) {
    console.error(
      `${copilotMarketplacePath} copilot-toolbox version is ${copilotToolbox.version}, package.json is ${version}. Run \`node scripts/sync-plugin-version.mjs\` to update it.`,
    );
  } else {
    const updated = marketplaceSource.replace(
      /("name"\s*:\s*"copilot-toolbox"[\s\S]*?"version"\s*:\s*")[^"]*(")/,
      `$1${version}$2`,
    );
    const updatedPlugin = JSON.parse(updated).plugins.find(
      (plugin) => plugin.name === "copilot-toolbox",
    );
    if (updatedPlugin?.version !== version) {
      console.error(`Could not find the copilot-toolbox version field in ${copilotMarketplacePath}.`);
      process.exitCode = 1;
    } else {
      writeFileSync(copilotMarketplacePath, updated);
      console.log(
        `${copilotMarketplacePath} copilot-toolbox version ${copilotToolbox.version} -> ${version}`,
      );
    }
  }
}

if (checkOnly && mismatches) process.exitCode = 1;
if (checkOnly && !mismatches) {
  console.log(`Copilot plugin manifest and marketplace use version ${version}.`);
}
