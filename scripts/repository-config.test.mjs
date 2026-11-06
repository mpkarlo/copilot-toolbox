import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (filename) => readFileSync(new URL(`../${filename}`, import.meta.url), "utf8");
const assertGuideReference = (filename, reference) => {
  const skillUrl = new URL(`../${filename}`, import.meta.url);
  assert.ok(read(filename).includes(reference), `${filename} is missing the shared guide reference`);
  assert.ok(existsSync(new URL(reference, skillUrl)), `${filename} has an unresolved guide reference`);
};
const setupDirectory = "skills/engineering/cpt-configure";
const setup = read(`${setupDirectory}/SKILL.md`);
const guide = read(`${setupDirectory}/REPOSITORY-CONFIG.md`);
const sharedReference = "../cpt-configure/REPOSITORY-CONFIG.md";
const engineeringConsumers = [
  "ask-matt", "code-review", "diagnosing-bugs", "domain-modeling",
  "implement", "implement-spec", "improve-codebase-architecture", "pr",
  "tdd", "to-spec", "to-tickets", "triage", "wayfinder",
];

test("new setups recommend Local-only mode and preserve existing preferences", () => {
  assert.match(setup, /recommending \*\*Local-only mode\*\*/);
  assert.match(setup, /Keep the mode already used by this repository/);
  assert.match(setup, /If both locations contain preferences, ask which to use/);
  assert.match(setup, /without moving, merging, or deleting files in the previous location/);
  assert.match(setup, /Carry the saved PR\/MR request-surface value into the selected location/);
  assert.match(setup, /Preserve every unmentioned setting and custom instruction/);
  assert.match(setup, /retrieve the complete label list from the verified project/);
  assert.match(setup, /If lookup fails or the result is incomplete, report the error and stop/);
  assert.match(setup, /Do not expose the PR\/MR request-surface setting/);
  assert.match(setup, /plain-language Description/);
  for (const text of [
    "**Project mode:** update only the `## Agent skills` block in the existing `AGENTS.md`.",
    "If `AGENTS.md` does not exist, ask before creating it.",
    "Never update `CLAUDE.md`.",
    "See `docs/agents/issue-tracker.md`.",
    "See `docs/agents/triage-labels.md`.",
    "See `docs/agents/domain.md`.",
    "Skip this section entirely if the `triage` skill isn't installed",
    "Project mode, preserve the original offer to `git mv` legacy artifacts",
  ]) assert.ok(setup.includes(text), text);
});

test("Local-only preferences use one app-agnostic guide and a checkout-local path", () => {
  assert.equal(existsSync(new URL(`../${setupDirectory}/scripts/repository-config.mjs`, import.meta.url)), false);
  assert.match(guide, /`cpt-configure` recommends Local-only mode for a new setup/);
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
    "../../engineering/cpt-configure/REPOSITORY-CONFIG.md",
  );
  assertGuideReference("skills/engineering/codebase-design/DESIGN-IT-TWICE.md", sharedReference);
  assert.match(setup, /read \[REPOSITORY-CONFIG\.md\]\(\.\/REPOSITORY-CONFIG\.md\)/);
});

test("consumers keep their existing fallback behavior when Local-only config is absent", () => {
  const wayfinder = read("skills/engineering/wayfinder/SKILL.md");
  assert.match(wayfinder, /If no tracker has been provided, default to the local-markdown tracker/);
  for (const name of ["to-spec", "to-tickets", "implement-spec", "code-review"]) {
    const skill = read(`skills/engineering/${name}/SKILL.md`);
    assert.match(skill, /If not, tell the user to run `\/cpt-configure`/);
  }
});
