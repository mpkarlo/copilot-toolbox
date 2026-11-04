import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const tagProtectionAdvisory =
  "no active tag protection rulesets found. Consider protecting tags to ensure immutable releases (Settings > Rules > Rulesets)";

export function checkWarnings(output: string): void {
  for (const line of output.split(/\r?\n/)) {
    if (!/\bwarn(?:ing)?\b/i.test(line)) continue;
    if (line.trim() === `warning\t\t${tagProtectionAdvisory}`) continue;
    throw new Error(`Blocking CLI warning: ${line}`);
  }
}

export function checkDiscovery(
  output: unknown,
  expectedNames: string[],
  skillsRoot: string,
): void {
  assert.ok(Array.isArray(output), "Copilot skill discovery must return an array.");
  const discoveredNames: string[] = [];
  for (const skill of output) {
    assert.ok(skill !== null && typeof skill === "object", "Invalid discovered skill.");
    if (skill.source !== "plugin") continue;
    assert.equal(typeof skill.name, "string", "Discovered skill must have a name.");
    assert.equal(skill.enabled, true, `Plugin skill is disabled: ${skill.name}`);
    assert.equal(typeof skill.path, "string", `Missing path for ${skill.name}`);
    assert.equal(
      realpathSync(skill.path),
      realpathSync(join(skillsRoot, skill.name)),
      `Skill was not loaded from the local bundle: ${skill.name}`,
    );
    discoveredNames.push(skill.name);
  }
  assert.deepEqual(discoveredNames.sort(), [...expectedNames].sort());
}

function run(command: string, args: string[], env = process.env): string {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    env: { ...env, NO_COLOR: "1" },
    encoding: "utf8",
    timeout: 120_000,
  });
  if (result.error) throw result.error;
  const output = `${result.stdout}${result.stderr}`;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed (${result.status}):\n${output}`);
  }
  checkWarnings(output);
  if (result.stderr) process.stderr.write(result.stderr);
  return result.stdout;
}

function main(): void {
  const ghVersion = run("gh", ["--version"]);
  const copilotVersion = run("copilot", ["--no-auto-update", "--version"]);
  console.log(ghVersion.trim());
  console.log(copilotVersion.trim());
  assert.match(ghVersion, /^gh version 2\.102\.1(?:\s|$)/, "Use GitHub CLI 2.102.1.");
  assert.match(
    copilotVersion,
    /^GitHub Copilot CLI 1\.0\.105(?:\.|\s|$)/,
    "Use Copilot CLI 1.0.105; --no-auto-update runs the installed binary, not a cached update.",
  );
  for (const bucket of ["engineering", "productivity"]) {
    process.stdout.write(run("gh", [
      "skill", "publish", "--dry-run", join("skills", bucket),
    ]));
  }
  console.log("Tag-protection advice is deferred; tag protection is not validated.");

  const pluginRoot = join(repositoryRoot, "plugins", "copilot-toolbox");
  const skillsRoot = join(pluginRoot, "skills");
  const expectedNames = ["engineering", "productivity"].flatMap((bucket) =>
    readdirSync(join(repositoryRoot, "skills", bucket), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name));
  const isolatedHome = mkdtempSync(join(tmpdir(), "copilot-toolbox-discovery-"));
  try {
    const env = { ...process.env, COPILOT_HOME: isolatedHome };
    const args = ["--no-auto-update", "--plugin-dir", pluginRoot];
    const plugins: unknown = JSON.parse(run("copilot", [...args, "plugin", "list", "--json"], env));
    const manifest = JSON.parse(readFileSync(join(pluginRoot, "plugin.json"), "utf8"));
    assert.ok(Array.isArray(plugins), "Copilot plugin discovery must return an array.");
    assert.deepEqual(
      plugins.filter((plugin) => plugin.source !== "builtin"),
      [{
        name: manifest.name,
        marketplace: "",
        version: manifest.version,
        enabled: true,
        source: "external",
      }],
      "Isolated discovery must load only the local plugin, at its declared version.",
    );
    checkDiscovery(
      JSON.parse(run("copilot", [...args, "skill", "list", "--json"], env)),
      expectedNames,
      skillsRoot,
    );
    console.log(`Copilot discovered the local plugin and ${expectedNames.length} promoted skills.`);
    console.log("Discovery does not establish skill invocation or agent behavior.");
  } finally {
    rmSync(isolatedHome, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
