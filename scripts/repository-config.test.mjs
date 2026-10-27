import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (filename) => readFileSync(new URL(`../${filename}`, import.meta.url), "utf8");
const assertGuideReference = (filename, reference) => {
  const skillUrl = new URL(`../${filename}`, import.meta.url);
  assert.ok(read(filename).includes(reference), `${filename} is missing the shared guide reference`);
  assert.ok(existsSync(new URL(reference, skillUrl)), `${filename} has an unresolved guide reference`);
};
const setupDirectory = "skills/engineering/setup-matt-pocock-skills";
const setup = read(`${setupDirectory}/SKILL.md`);
const guide = read(`${setupDirectory}/REPOSITORY-CONFIG.md`);
const sharedReference = "../setup-matt-pocock-skills/REPOSITORY-CONFIG.md";
const engineeringConsumers = [
  "ask-matt", "code-review", "diagnosing-bugs", "domain-modeling",
  "implement", "implement-spec", "improve-codebase-architecture", "pr",
  "tdd", "to-spec", "to-tickets", "triage", "wayfinder",
];

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

test("Local-only preferences use one app-agnostic guide and a checkout-local path", () => {
  assert.equal(existsSync(new URL(`../${setupDirectory}/scripts/repository-config.mjs`, import.meta.url)), false);
  assert.match(guide, /Project mode remains the default/);
  assert.match(guide, /Use Git and existing file tools/);
  assert.match(guide, /git worktree list --porcelain -z/);
  assert.match(guide, /Missing preferences retain each skill's original behavior/);
  assert.match(guide, /Both locations contain preferences/);
  assert.match(guide, /ask which mode to use/);
  assert.match(guide, /If a selected preference file exists but cannot be read/);
  assert.match(guide, /Use configured glossary, map, and ADR paths/);
  assert.match(guide, /Changing the main checkout folder name or its parent changes the Local-only path/);
  assert.doesNotMatch(guide, /Copilot|repository-level Instructions|app-level instructions|Node\.js|SHA-256|short-hash|MATT_POCOCK_SKILLS_CONFIG_HOME/);
  assert.match(setup, /Local-only mode.*Do not edit project files/s);
});

test("every preference-consuming skill points to the shared guide", () => {
  for (const name of engineeringConsumers) {
    assertGuideReference(`skills/engineering/${name}/SKILL.md`, sharedReference);
  }
  assertGuideReference(
    "skills/productivity/wait-what/SKILL.md",
    "../../engineering/setup-matt-pocock-skills/REPOSITORY-CONFIG.md",
  );
  assertGuideReference("skills/engineering/codebase-design/DESIGN-IT-TWICE.md", sharedReference);
  assert.match(setup, /read \[REPOSITORY-CONFIG\.md\]\(\.\/REPOSITORY-CONFIG\.md\)/);
});

test("consumers keep their existing fallback behavior when Local-only config is absent", () => {
  const wayfinder = read("skills/engineering/wayfinder/SKILL.md");
  assert.match(wayfinder, /If no tracker has been provided, default to the local-markdown tracker/);
  for (const name of ["to-spec", "to-tickets", "implement-spec", "code-review"]) {
    const skill = read(`skills/engineering/${name}/SKILL.md`);
    assert.match(skill, /If not, tell the user to run `\/setup-matt-pocock-skills`/);
  }
});
