---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Read [REPOSITORY-CONFIG.md](../setup-matt-pocock-skills/REPOSITORY-CONFIG.md). Before fetching a tracker ticket reference, run its resolver in the current project with `tracker` and read the resolved file. If config is missing or invalid, stop the tracker operation and tell the user to run `/setup-matt-pocock-skills`; never guess a tracker. Local spec paths do not require a tracker. Fetch the ticket and state its title before starting. If the reference is ambiguous, ask.

Call the Skill tool with "tdd" where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, call the Skill tool with "code-review" to review the work.

Commit your work to the current branch.
