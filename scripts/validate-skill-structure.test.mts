import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateSkillStructure } from "./validate-skill-structure.mts";

function fixture(t: test.TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "skill-structure-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const skillDirectory = join(root, "skills", "engineering", "sample-skill");
  mkdirSync(join(skillDirectory, "agents"), { recursive: true });
  mkdirSync(join(root, "skills", "productivity"), { recursive: true });
  mkdirSync(join(root, "docs", "engineering"), { recursive: true });
  writeFileSync(
    join(skillDirectory, "SKILL.md"),
    "---\nname: sample-skill\ndescription: A sample skill.\n---\n\n# Sample Skill\n",
  );
  writeFileSync(
    join(skillDirectory, "agents", "openai.yaml"),
    'interface:\n  display_name: "Sample Skill"\n  short_description: "Inspect a sample"\n',
  );
  writeFileSync(join(root, "docs", "engineering", "sample-skill.md"), "## What it does\n");
  return root;
}

test("accepts valid promoted skill metadata and documentation", (t) => {
  assert.deepEqual(validateSkillStructure(fixture(t)), []);
});

test("requires frontmatter names to match their directory", (t) => {
  const root = fixture(t);
  writeFileSync(
    join(root, "skills", "engineering", "sample-skill", "SKILL.md"),
    "---\nname: wrong-name\ndescription: A sample skill.\n---\n",
  );

  assert.match(validateSkillStructure(root).join("\n"), /name must match its directory/);
});

test("requires a user-invoked skill to disable implicit invocation", (t) => {
  const root = fixture(t);
  writeFileSync(
    join(root, "skills", "engineering", "sample-skill", "SKILL.md"),
    "---\nname: sample-skill\ndescription: A sample skill.\ndisable-model-invocation: true\n---\n",
  );

  assert.match(
    validateSkillStructure(root).join("\n"),
    /must disable implicit invocation for user-invoked skills/,
  );
});

test("requires model-invoked skills to omit invocation metadata", (t) => {
  const root = fixture(t);
  const skillPath = join(root, "skills", "engineering", "sample-skill", "SKILL.md");
  const openAiPath = join(root, "skills", "engineering", "sample-skill", "agents", "openai.yaml");
  writeFileSync(
    skillPath,
    "---\nname: sample-skill\ndescription: A sample skill.\ndisable-model-invocation: false\n---\n",
  );
  writeFileSync(
    openAiPath,
    'interface:\n  display_name: "Sample Skill"\n  short_description: "Inspect a sample"\npolicy:\n  allow_implicit_invocation: true\n',
  );

  const errors = validateSkillStructure(root).join("\n");
  assert.match(errors, /must omit disable-model-invocation for model-invoked skills/);
  assert.match(errors, /must omit policy for model-invoked skills/);
});

test("accepts model-invoked skills with invocation metadata omitted", (t) => {
  assert.deepEqual(validateSkillStructure(fixture(t)), []);
});

test("requires each promoted skill to have a documentation page", (t) => {
  const root = fixture(t);
  rmSync(join(root, "docs", "engineering", "sample-skill.md"));

  assert.match(validateSkillStructure(root).join("\n"), /Missing promoted skill documentation page/);
});

test("requires interface labels and short descriptions", (t) => {
  const root = fixture(t);
  const openAiPath = join(root, "skills", "engineering", "sample-skill", "agents", "openai.yaml");
  writeFileSync(openAiPath, 'interface:\n  display_name: ""\n  short_description: " "\n');

  const errors = validateSkillStructure(root).join("\n");
  assert.match(errors, /interface\.display_name/);
  assert.match(errors, /interface\.short_description/);
});
