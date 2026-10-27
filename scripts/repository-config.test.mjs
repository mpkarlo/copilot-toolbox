import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { canonicalRemote, configRoot, configLocation, resolveRepository, requireConfig } from "../skills/engineering/setup-matt-pocock-skills/scripts/repository-config.mjs";

test("transport aliases share an identity without credentials; forks and hosts stay distinct", () => {
  const aliases = [
    "https://github.com/Owner/Repo.git",
    "git@github.com:owner/repo.git",
    "ssh://git@github.com:22/owner/repo/",
    "https://user:password@GITHUB.COM/owner/repo.git/",
  ];
  assert.deepEqual(aliases.map(canonicalRemote), Array(4).fill("github.com/owner/repo"));
  assert.equal(canonicalRemote("git@git.example:group/sub/Repo.git"), "git.example/group/sub/Repo");
  assert.notEqual(canonicalRemote("ssh://git@git.example:2222/group/Repo"), canonicalRemote("https://git.example/group/Repo"));
  assert.notEqual(configLocation("github.com/owner/repo").directory, configLocation("github.com/fork/repo").directory);
  assert.notEqual(configLocation("github.com/owner/repo").directory, configLocation("gitlab.com/owner/repo").directory);
  assert.match(path.basename(configLocation("github.com/owner/repo").directory), /^[a-f0-9]{64}$/);
  for (const url of ["file:///tmp/repo", "not-a-remote", "https://host/", "https://host/repo?token=secret"]) {
    assert.throws(() => canonicalRemote(url));
  }
});

test("config roots are platform-specific, absolute, and explicitly overridable", () => {
  assert.equal(configRoot({ platform: "win32", env: { LOCALAPPDATA: "C:\\Local" }, home: "C:\\Users\\me" }), "C:\\Local\\matt-pocock-skills");
  assert.equal(configRoot({ platform: "win32", env: {}, home: "C:\\Users\\me" }), "C:\\Users\\me\\AppData\\Local\\matt-pocock-skills");
  assert.equal(configRoot({ platform: "linux", env: {}, home: "/home/me" }), "/home/me/.config/matt-pocock-skills");
  assert.equal(configRoot({ platform: "linux", env: { XDG_CONFIG_HOME: "/config" }, home: "/home/me" }), "/config/matt-pocock-skills");
  assert.equal(configRoot({ platform: "darwin", env: {}, home: "/Users/me" }), "/Users/me/Library/Application Support/matt-pocock-skills");
  assert.equal(configRoot({ platform: "darwin", env: { MATT_POCOCK_SKILLS_CONFIG_HOME: "/override" } }), "/override");
  assert.equal(configRoot({ platform: "win32", env: { MATT_POCOCK_SKILLS_CONFIG_HOME: "D:\\Config" } }), "D:\\Config");
  assert.throws(() => configRoot({ platform: "linux", env: { MATT_POCOCK_SKILLS_CONFIG_HOME: "relative" } }), /must be absolute/);
  assert.throws(() => configRoot({ platform: "linux", env: { XDG_CONFIG_HOME: "relative" } }), /must be absolute/);
});

test("missing and empty config fail setup-first; only requested kinds are required", (t) => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), "skills-config-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const location = configLocation("github.com/owner/repo", { env: { MATT_POCOCK_SKILLS_CONFIG_HOME: temporary } });
  requireConfig(location, []);
  assert.deepEqual(readdirSync(temporary), []);
  assert.throws(() => requireConfig(location, ["tracker"]), /Run \/setup-matt-pocock-skills/);
  mkdirSync(location.directory, { recursive: true });
  writeFileSync(location.files.tracker, " \n");
  assert.throws(() => requireConfig(location, ["tracker"]), /Empty tracker/);
  writeFileSync(location.files.tracker, "# Explicit local tracker\n");
  requireConfig(location, ["tracker"]);
  assert.throws(() => requireConfig(location, ["tracker", "labels"]), /Missing labels/);
  assert.throws(() => requireConfig(location, ["unknown"]), /Unknown config kind/);
  mkdirSync(location.files.domain);
  assert.throws(() => requireConfig(location, ["domain"]), /Cannot read domain/);
});

test("Git resolution shares config across clones, subdirectories, and worktrees, not upstream", (t) => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), "skills-git-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const run = (cwd, ...args) => execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", stdio: "pipe" });
  const repo = path.join(temporary, "repo");
  mkdirSync(repo);
  run(repo, "init", "--quiet");
  const options = { env: { MATT_POCOCK_SKILLS_CONFIG_HOME: path.join(temporary, "config") } };
  const local = resolveRepository(repo, options);
  assert.match(local.identity, /^local:/);
  run(repo, "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--quiet", "--allow-empty", "-m", "fixture");
  const worktree = path.join(temporary, "worktree");
  run(repo, "worktree", "add", "--quiet", "-b", "fixture", worktree);
  assert.equal(resolveRepository(worktree, options).directory, local.directory);
  run(repo, "remote", "add", "origin", "https://github.com/fork/repo.git");
  run(repo, "remote", "add", "upstream", "https://github.com/owner/repo.git");
  const resolved = resolveRepository(worktree, options);
  assert.equal(resolved.identity, "github.com/fork/repo");
  assert.notEqual(resolved.directory, local.directory);
  const sub = path.join(worktree, "nested");
  mkdirSync(sub);
  assert.equal(resolveRepository(sub, options).directory, resolved.directory);
  assert.equal(resolveRepository(sub, options).repositoryRoot.replaceAll("\\", "/"), worktree.replaceAll("\\", "/"));
  const clone = path.join(temporary, "clone");
  mkdirSync(clone);
  run(clone, "init", "--quiet");
  run(clone, "remote", "add", "mirror", "git@github.com:fork/repo.git");
  assert.equal(resolveRepository(clone, options).directory, resolved.directory);
  run(clone, "remote", "add", "other", "https://gitlab.com/other/repo.git");
  assert.throws(() => resolveRepository(clone, options), /Multiple Git remotes/);
  run(repo, "config", "--add", "remote.origin.url", "https://github.com/different/repo.git");
  assert.throws(() => resolveRepository(repo, options), /multiple repository URLs/);
  assert.throws(() => resolveRepository(temporary, options), /Git repository metadata/);
});

test("CLI locates without writing; required config errors do not look like success", (t) => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), "skills-cli-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  execFileSync("git", ["-C", temporary, "init", "--quiet"], { stdio: "pipe" });
  const script = fileURLToPath(new URL("../skills/engineering/setup-matt-pocock-skills/scripts/repository-config.mjs", import.meta.url));
  const options = { cwd: temporary, env: { ...process.env, MATT_POCOCK_SKILLS_CONFIG_HOME: path.join(temporary, "config") }, encoding: "utf8", stdio: "pipe" };
  const result = JSON.parse(execFileSync(process.execPath, [script], options));
  assert.equal(result.repositoryRoot.replaceAll("\\", "/"), temporary.replaceAll("\\", "/"));
  assert.deepEqual(readdirSync(temporary), [".git"]);
  assert.throws(() => execFileSync(process.execPath, [script, "tracker"], options), (error) => {
    assert.equal(error.status, 1);
    assert.equal(error.stdout, "");
    assert.match(error.stderr, /Run \/setup-matt-pocock-skills/);
    return true;
  });
  assert.throws(() => execFileSync(process.execPath, [script, "--unknown"], options), /Usage:/);
});

test("CLI works from a symlinked skill install and reads config without changing project artifacts", (t) => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), "skills-install-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const repo = path.join(temporary, "project");
  mkdirSync(repo);
  execFileSync("git", ["-C", repo, "init", "--quiet"], { stdio: "pipe" });
  execFileSync("git", ["-C", repo, "remote", "add", "origin", "git@github.com:owner/repo.git"], { stdio: "pipe" });
  const installed = path.join(temporary, "installed skill");
  const source = fileURLToPath(new URL("../skills/engineering/setup-matt-pocock-skills", import.meta.url));
  symlinkSync(source, installed, process.platform === "win32" ? "junction" : "dir");
  const script = path.join(installed, "scripts", "repository-config.mjs");
  const options = { cwd: repo, env: { ...process.env, MATT_POCOCK_SKILLS_CONFIG_HOME: path.join(temporary, "preferences") }, encoding: "utf8", stdio: "pipe" };
  const located = JSON.parse(execFileSync(process.execPath, [script], options));
  mkdirSync(located.directory, { recursive: true });
  for (const [kind, template] of Object.entries({ tracker: "issue-tracker-local.md", labels: "triage-labels.md", domain: "domain.md" })) {
    writeFileSync(located.files[kind], readFileSync(path.join(source, template)));
  }
  const artifacts = { "AGENTS.md": "Existing instructions\n", "CLAUDE.md": "Existing pointer\n", "GLOSSARY.md": "Existing glossary\n" };
  for (const [filename, content] of Object.entries(artifacts)) writeFileSync(path.join(repo, filename), content);
  const result = JSON.parse(execFileSync(process.execPath, [script, "tracker", "labels", "domain"], options));
  assert.equal(result.identity, "github.com/owner/repo");
  assert.equal(result.directory, located.directory);
  assert.match(readFileSync(result.files.tracker, "utf8"), /Local Markdown/);
  for (const [filename, content] of Object.entries(artifacts)) {
    assert.equal(readFileSync(path.join(repo, filename), "utf8"), content);
  }
  assert.deepEqual(readdirSync(repo).sort(), [".git", ...Object.keys(artifacts)].sort());
});

test("tracker and domain consumers name the shared resolver and explicit config requirements", () => {
  const consumers = {
    "engineering/to-spec/SKILL.md": "tracker labels domain",
    "engineering/to-tickets/SKILL.md": "tracker labels domain",
    "engineering/triage/SKILL.md": "tracker labels domain",
    "engineering/wayfinder/SKILL.md": "tracker domain",
    "engineering/implement-spec/SKILL.md": "tracker domain",
    "engineering/implement/SKILL.md": "tracker",
    "engineering/code-review/SKILL.md": "tracker",
    "engineering/prototype/SKILL.md": "tracker",
    "engineering/domain-modeling/SKILL.md": "domain",
    "engineering/tdd/SKILL.md": "domain",
    "engineering/diagnosing-bugs/SKILL.md": "domain",
    "engineering/improve-codebase-architecture/SKILL.md": "domain",
    "engineering/pr/SKILL.md": "domain",
    "engineering/codebase-design/DESIGN-IT-TWICE.md": "domain",
    "productivity/wait-what/SKILL.md": "domain",
  };
  for (const [filename, kinds] of Object.entries(consumers)) {
    const content = readFileSync(new URL(`../skills/${filename}`, import.meta.url), "utf8");
    assert.match(content, /REPOSITORY-CONFIG\.md/, filename);
    assert.ok(content.includes(`\`${kinds}\``), `${filename} must require ${kinds}`);
    assert.match(content, /\/setup-matt-pocock-skills/, filename);
    assert.doesNotMatch(content, /should have been provided|default to the local-markdown tracker/, filename);
    for (const [, reference] of content.matchAll(/\]\(([^)]+REPOSITORY-CONFIG\.md)\)/g)) {
      assert.doesNotThrow(() => readFileSync(new URL(reference, new URL(`../skills/${filename}`, import.meta.url))), filename);
    }
  }
});
