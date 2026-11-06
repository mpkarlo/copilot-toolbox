#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error("Could not locate npm. Run this script from an npm lifecycle script.");
  process.exitCode = 1;
} else {
  const result = spawnSync(
    process.execPath,
    [
      npmCli,
      "install",
      "--package-lock-only",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--offline",
    ],
    { cwd: repositoryRoot, stdio: "inherit" },
  );

  if (result.error) {
    console.error(`Could not synchronize package-lock.json: ${result.error.message}`);
    process.exitCode = 1;
  } else if (result.status === null) {
    console.error("npm did not complete package-lock synchronization.");
    process.exitCode = 1;
  } else if (result.status !== 0) {
    process.exitCode = result.status;
  }
}
