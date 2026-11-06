import test from "node:test";
import assert from "node:assert/strict";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const syncScript = fileURLToPath(new URL("./sync-plugin-version.mjs", import.meta.url));

function fixture(t, pluginVersion, marketplaceVersion) {
  const root = mkdtempSync(join(tmpdir(), "copilot-version-sync-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, "plugins", "copilot-toolbox"), { recursive: true });
  mkdirSync(join(root, ".github", "plugin"), { recursive: true });
  mkdirSync(join(root, ".claude-plugin"), { recursive: true });
  copyFileSync(syncScript, join(root, "scripts", "sync-plugin-version.mjs"));
  writeFileSync(join(root, "package.json"), JSON.stringify({ version: "0.1.0" }, null, 2));
  writeFileSync(
    join(root, "plugins", "copilot-toolbox", "plugin.json"),
    JSON.stringify({ name: "copilot-toolbox", version: pluginVersion }, null, 2),
  );
  writeFileSync(
    join(root, ".github", "plugin", "marketplace.json"),
    JSON.stringify({
      plugins: [{ name: "copilot-toolbox", version: marketplaceVersion }],
    }, null, 2),
  );
  writeFileSync(
    join(root, ".claude-plugin", "plugin.json"),
    JSON.stringify({ version: "9.9.9" }, null, 2),
  );
  return root;
}

function run(root, ...args) {
  return spawnSync(process.execPath, [join(root, "scripts", "sync-plugin-version.mjs"), ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

test("sync updates only the Copilot manifest and marketplace entry", (t) => {
  const root = fixture(t, "1.0.0", "1.0.0");

  const result = run(root);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    JSON.parse(
      readFileSync(join(root, "plugins", "copilot-toolbox", "plugin.json"), "utf8"),
    ).version,
    "0.1.0",
  );
  assert.equal(
    JSON.parse(
      readFileSync(join(root, ".github", "plugin", "marketplace.json"), "utf8"),
    ).plugins[0].version,
    "0.1.0",
  );
  assert.equal(
    JSON.parse(readFileSync(join(root, ".claude-plugin", "plugin.json"), "utf8")).version,
    "9.9.9",
  );
  assert.equal(run(root, "--check").status, 0);
});

test("check mode reports how to correct mismatched Copilot versions without writing", (t) => {
  const root = fixture(t, "1.0.0", "2.0.0");
  const pluginPath = join(root, "plugins", "copilot-toolbox", "plugin.json");
  const marketplacePath = join(root, ".github", "plugin", "marketplace.json");
  const pluginBefore = readFileSync(pluginPath, "utf8");
  const marketplaceBefore = readFileSync(marketplacePath, "utf8");

  const result = run(root, "--check");

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /plugins[\\/]copilot-toolbox[\\/]plugin\.json.*Run `node scripts\/sync-plugin-version\.mjs` to update it/,
  );
  assert.match(
    result.stderr,
    /marketplace\.json.*Run `node scripts\/sync-plugin-version\.mjs` to update it/,
  );
  assert.equal(readFileSync(pluginPath, "utf8"), pluginBefore);
  assert.equal(readFileSync(marketplacePath, "utf8"), marketplaceBefore);
});

test("sync works without a legacy platform manifest", (t) => {
  const root = fixture(t, "1.0.0", "1.0.0");
  rmSync(join(root, ".claude-plugin", "plugin.json"));

  const result = run(root);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(run(root, "--check").status, 0);
});

test("check mode fails when only the marketplace version differs", (t) => {
  const root = fixture(t, "0.1.0", "1.0.0");
  const marketplacePath = join(root, ".github", "plugin", "marketplace.json");
  const before = readFileSync(marketplacePath, "utf8");

  const result = run(root, "--check");

  assert.equal(result.status, 1);
  assert.match(result.stderr, /marketplace\.json.*version is 1\.0\.0/);
  assert.equal(readFileSync(marketplacePath, "utf8"), before);
});

test("a missing catalog entry fails explicitly in sync and check modes", (t) => {
  const root = fixture(t, "0.1.0", "0.1.0");
  const marketplacePath = join(root, ".github", "plugin", "marketplace.json");
  writeFileSync(marketplacePath, JSON.stringify({ plugins: [] }, null, 2));
  const before = readFileSync(marketplacePath, "utf8");

  for (const args of [[], ["--check"]]) {
    const result = run(root, ...args);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Could not find copilot-toolbox/);
    assert.equal(readFileSync(marketplacePath, "utf8"), before);
  }
});
