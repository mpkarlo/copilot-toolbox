import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (filename) => readFileSync(new URL(`../${filename}`, import.meta.url), "utf8");
const setupDirectory = "skills/engineering/setup-matt-pocock-skills";
const setup = read(`${setupDirectory}/SKILL.md`);
const guide = read(`${setupDirectory}/REPOSITORY-CONFIG.md`);

test("Project mode remains the default with original instruction pointers", () => {
  assert.match(setup, /recommending \*\*Project mode\*\*/);
  assert.match(setup, /Keep the mode already used by this repository/);
  assert.match(setup, /Do not merge or migrate files unless the user explicitly requests it/);
  for (const text of [
    "If `CLAUDE.md` exists, edit it.",
    "Else if `AGENTS.md` exists, edit it.",
    "If neither exists, ask the user which one to create",
    "See `docs/agents/issue-tracker.md`.",
    "See `docs/agents/triage-labels.md`.",
    "See `docs/agents/domain.md`.",
    "Skip this section entirely if the `triage` skill isn't installed",
    "In Project mode, preserve the original offer to `git mv` legacy artifacts",
  ]) assert.ok(setup.includes(text), text);
});

test("Local-only mode uses a repository-level app reference without new dependencies", () => {
  assert.equal(existsSync(new URL(`../${setupDirectory}/scripts/repository-config.mjs`, import.meta.url)), false);
  assert.match(guide, /No Node\.js, package installation, or bundled executable is needed/);
  assert.match(guide, /Copilot App's repository-level Instructions setting/);
  assert.match(guide, /Do not put it in app-level instructions/);
  assert.match(guide, /load this guide manually/);
  assert.match(setup, /wait for the user to confirm it is added before claiming automatic discovery/);
  assert.match(setup, /Local-only mode, leave the artifacts unchanged/);
  assert.match(guide, /git rev-parse --show-toplevel/);
  assert.match(guide, /git rev-parse --git-common-dir/);
  assert.match(guide, /git worktree list --porcelain -z/);
  assert.match(guide, /bare or has no usable checkout/);
  assert.match(guide, /Missing preferences retain each skill's original setup guidance and fallbacks/);
  assert.match(guide, /report its exact path and the read error/);
  assert.match(guide, /ask which to use/);
  assert.match(guide, /Do not merge them or silently override either/);
  assert.match(guide, /Keep glossaries, ADRs, specs, tickets/);
});

test("configuration paths are generic and relative to the main checkout", () => {
  for (const filename of [
    "README.md",
    "docs/engineering/setup-matt-pocock-skills.md",
    `${setupDirectory}/SKILL.md`,
    `${setupDirectory}/REPOSITORY-CONFIG.md`,
  ]) {
    const content = read(filename);
    assert.match(content, /\.\.\\\.skills\\<main-checkout-folder-name>/, filename);
    assert.match(content, /\.\.\/\.skills\/<main-checkout-folder-name>/, filename);
    assert.doesNotMatch(content, /MATT_POCOCK_SKILLS_CONFIG_HOME|SHA-256|short-hash|skill-config|mpkarlo/, filename);
  }
});

test("consumer skills and seed templates preserve original behavior", () => {
  const files = [
    "engineering/to-spec/SKILL.md", "engineering/to-tickets/SKILL.md",
    "engineering/triage/SKILL.md", "engineering/implement-spec/SKILL.md",
    "engineering/implement/SKILL.md", "engineering/code-review/SKILL.md",
    "engineering/prototype/SKILL.md", "engineering/domain-modeling/SKILL.md",
    "engineering/tdd/SKILL.md", "engineering/diagnosing-bugs/SKILL.md",
    "engineering/improve-codebase-architecture/SKILL.md", "engineering/pr/SKILL.md",
    "engineering/codebase-design/DESIGN-IT-TWICE.md", "productivity/wait-what/SKILL.md",
    "engineering/wayfinder/SKILL.md",
    ...["domain.md", "issue-tracker-local.md", "issue-tracker-github.md", "issue-tracker-gitlab.md", "triage-labels.md"]
      .map((filename) => `engineering/setup-matt-pocock-skills/${filename}`),
  ].map((filename) => `skills/${filename}`);
  for (const filename of files) {
    assert.doesNotMatch(read(filename), /REPOSITORY-CONFIG\.md|repository-config\.mjs|Local-only mode|files\.(tracker|labels|domain)/, filename);
  }
  assert.match(read("skills/engineering/wayfinder/SKILL.md"), /If no tracker has been provided, default to the local-markdown tracker/);
  assert.match(read(`${setupDirectory}/issue-tracker-github.md`), /Infer the repo from `git remote -v`/);
  assert.match(read(`${setupDirectory}/issue-tracker-gitlab.md`), /Infer the repo from `git remote -v`/);
});
