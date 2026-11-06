import assert from "node:assert/strict";
import test from "node:test";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { delimiter, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "release-version-sync-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  for (const directory of [
    ".changeset",
    ".github/plugin",
    "plugins/copilot-toolbox",
    "scripts",
  ]) {
    mkdirSync(join(root, directory), { recursive: true });
  }

  const packageJson = JSON.parse(
    readFileSync(join(repositoryRoot, "package.json"), "utf8"),
  );
  packageJson.version = "0.1.0";
  writeFileSync(join(root, "package.json"), JSON.stringify(packageJson, null, 2));

  const packageLock = JSON.parse(
    readFileSync(join(repositoryRoot, "package-lock.json"), "utf8"),
  );
  packageLock.version = "0.1.0";
  packageLock.packages[""].version = "0.1.0";
  writeFileSync(join(root, "package-lock.json"), JSON.stringify(packageLock, null, 2));

  for (const path of [
    ".github/plugin/marketplace.json",
    "plugins/copilot-toolbox/plugin.json",
    "scripts/sync-package-lock.mjs",
    "scripts/sync-plugin-version.mjs",
  ]) {
    copyFileSync(join(repositoryRoot, path), join(root, path));
  }

  writeFileSync(
    join(root, ".changeset", "config.json"),
    JSON.stringify({
      changelog: false,
      commit: false,
      privatePackages: { version: true, tag: true },
      baseBranch: "main",
    }),
  );
  writeFileSync(
    join(root, ".changeset", "release-fixture.md"),
    '---\n"copilot-toolbox": minor\n---\n\nExercise the version lifecycle.\n',
  );
  return root;
}

function runVersion(root) {
  const npmCli = process.env.npm_execpath;
  assert.ok(npmCli, "Run this test through npm so npm_execpath is available.");
  const binDirectory = join(repositoryRoot, "node_modules", ".bin");
  const env = {
    ...process.env,
    PATH: [binDirectory, process.env.PATH].filter(Boolean).join(delimiter),
  };
  return spawnSync(process.execPath, [npmCli, "run", "version"], {
    cwd: root,
    env,
    encoding: "utf8",
  });
}

test("npm run version aligns both package-lock versions and preserves dependency data", (t) => {
  const root = fixture(t);
  const lockPath = join(root, "package-lock.json");
  const packageLockBefore = JSON.parse(readFileSync(lockPath, "utf8"));
  delete packageLockBefore.version;
  delete packageLockBefore.packages[""].version;

  const result = runVersion(root);

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const packageVersion = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  ).version;
  const packageLock = JSON.parse(readFileSync(lockPath, "utf8"));
  assert.equal(packageVersion, "0.2.0", `${result.stdout}\n${result.stderr}`);
  assert.equal(packageLock.version, packageVersion);
  assert.equal(packageLock.packages[""].version, packageVersion);
  delete packageLock.version;
  delete packageLock.packages[""].version;
  assert.deepEqual(packageLock, packageLockBefore);
});
