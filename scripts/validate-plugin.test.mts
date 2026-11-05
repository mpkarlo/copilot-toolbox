import assert from "node:assert/strict";
import test from "node:test";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { validatePluginRepository } from "./validate-plugin.mts";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const schemaSource = join(
  repositoryRoot,
  "schemas",
  "agent-plugins",
  "1.0.0",
  "plugin.schema.json",
);

function fixture(t: test.TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "plugin-validation-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const pluginDirectory = join(root, "plugins", "copilot-toolbox");
  const marketplaceDirectory = join(root, ".github", "plugin");
  const schemaDirectory = join(root, "schemas", "agent-plugins", "1.0.0");
  mkdirSync(pluginDirectory, { recursive: true });
  mkdirSync(marketplaceDirectory, { recursive: true });
  mkdirSync(schemaDirectory, { recursive: true });
  copyFileSync(schemaSource, join(schemaDirectory, "plugin.schema.json"));
  writeFileSync(join(pluginDirectory, "plugin.json"), JSON.stringify({
    "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    name: "copilot-toolbox",
    version: "1.3.1",
    description: "Test plugin",
  }));
  writeFileSync(join(pluginDirectory, "LICENSE"), "Test license\n");
  writeFileSync(join(root, "package.json"), JSON.stringify({
    name: "copilot-toolbox",
    version: "1.3.1",
  }));
  writeFileSync(join(marketplaceDirectory, "marketplace.json"), JSON.stringify({
    name: "copilot-toolbox",
    metadata: {
      description: "Test marketplace",
      version: "1.0.0",
    },
    owner: { name: "test-owner" },
    plugins: [{
      name: "copilot-toolbox",
      source: "plugins/copilot-toolbox",
      description: "Test plugin",
      version: "1.3.1",
    }],
  }));
  return root;
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(value));
}

test("validates the plugin schema and marketplace catalog", (t) => {
  assert.deepEqual(validatePluginRepository(fixture(t)), []);
});

test("rejects plugin fields not allowed by the published schema", (t) => {
  const root = fixture(t);
  const path = join(root, "plugins", "copilot-toolbox", "plugin.json");
  const plugin = readJson(path);
  plugin.unrecognized = true;
  writeJson(path, plugin);

  assert.match(validatePluginRepository(root).join("\n"), /additional properties/i);
});

test("rejects missing required catalog fields", (t) => {
  const root = fixture(t);
  const path = join(root, ".github", "plugin", "marketplace.json");
  const marketplace = readJson(path);
  marketplace.owner = {};
  writeJson(path, marketplace);

  assert.match(validatePluginRepository(root).join("\n"), /owner\.name/);
});

test("rejects catalog source paths that escape the repository", (t) => {
  const root = fixture(t);
  const path = join(root, ".github", "plugin", "marketplace.json");
  const marketplace = readJson(path);
  const plugins = marketplace.plugins as Array<Record<string, unknown>>;
  plugins[0].source = "../outside";
  writeJson(path, marketplace);

  assert.match(validatePluginRepository(root).join("\n"), /repository-relative path/);
});

test("rejects catalog source paths that do not contain a plugin manifest", (t) => {
  const root = fixture(t);
  const path = join(root, ".github", "plugin", "marketplace.json");
  const marketplace = readJson(path);
  const plugins = marketplace.plugins as Array<Record<string, unknown>>;
  plugins[0].source = "plugins/missing";
  writeJson(path, marketplace);

  assert.match(validatePluginRepository(root).join("\n"), /containing plugin\.json/);
});

test("rejects catalog source symlinks that resolve outside the repository", (t) => {
  const root = fixture(t);
  const outside = mkdtempSync(join(tmpdir(), "outside-plugin-"));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  writeFileSync(join(outside, "plugin.json"), "{}");
  symlinkSync(outside, join(root, "plugins", "linked"), "junction");

  const path = join(root, ".github", "plugin", "marketplace.json");
  const marketplace = readJson(path);
  const plugins = marketplace.plugins as Array<Record<string, unknown>>;
  plugins[0].source = "plugins/linked";
  writeJson(path, marketplace);

  assert.match(validatePluginRepository(root).join("\n"), /resolve to a directory inside the repository/);
});

test("rejects plugin manifest paths that resolve outside the repository", (t) => {
  const root = fixture(t);
  const outside = mkdtempSync(join(tmpdir(), "outside-manifest-"));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  const linkedDirectory = join(root, "plugins", "linked");
  mkdirSync(linkedDirectory);
  const path = join(root, ".github", "plugin", "marketplace.json");
  const marketplace = readJson(path);
  const plugins = marketplace.plugins as Array<Record<string, unknown>>;
  plugins[0].source = "plugins/linked";
  writeJson(path, marketplace);
  const pluginManifest = join(linkedDirectory, "plugin.json");
  symlinkSync(outside, pluginManifest, "junction");

  assert.match(validatePluginRepository(root).join("\n"), /plugin\.json must resolve to a file inside the repository/);
});

test("rejects inconsistent package and plugin versions", (t) => {
  const root = fixture(t);
  const path = join(root, "package.json");
  const packageJson = readJson(path);
  packageJson.version = "1.3.2";
  writeJson(path, packageJson);

  assert.match(validatePluginRepository(root).join("\n"), /version must match/i);
});
