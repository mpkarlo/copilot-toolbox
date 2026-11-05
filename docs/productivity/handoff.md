## What it does

`handoff` compacts the conversation you are in into a **handoff document**: one markdown file, written to your OS's temporary directory rather than into the workspace, that a fresh GitHub Copilot session or a colleague can read to pick the work up.

What it gives you is **portability**, not compression, so the skill is narrower than it sounds. You need a file only when the work has to *travel*: to a fresh Copilot session, a new directory, a colleague, or a side task you want to handle separately. If nothing is travelling, continue in the current conversation instead.

## When to reach for it

This skill is intended for explicit user requests. Type `/handoff` and pass a note about what the next session is for. Whether a Copilot product can load it depends on that product and version; see the [invocation guidance](../../.agents/invocation.md).

There are four triggers, and only four:

| Situation | Why a file |
| --- | --- |
| Moving work to a fresh Copilot session | The new session does not have the old [context](https://www.aihero.dev/ai-coding-dictionary/context) |
| Moving to a different directory or repo | A prototype directory is the common case |
| Sending the work to a colleague | They need something they can read |
| Forking a side task found mid-phase | You keep working; a second agent takes the fork |

For anything else, such as staying in the same conversation and moving from [grilling](https://www.aihero.dev/ai-coding-dictionary/grilling) to implementation, continue there without creating a handoff file. The local [ask-matt](../engineering/ask-matt.md) guide helps choose a skill when you reach a phase boundary.

## Branching is the use people skip

The skill's description reads like session resumption: write a summary, end here, resume there. Read that way, it looks like a generic session summary, so people skip it. The parallel-work case is the one worth knowing. You **stay in your session** and hand a copy of the accumulated context to another session or colleague.

That is what the detour through [prototype](../engineering/prototype.md) uses. You are deep in a design conversation, you hit a question that only running code will settle, and you do not want to spend the thread you built on finding out. Hand off the context, get the answer, and reference it from the original thread. The work crosses over twice, your original conversation stays live, and you re-explain nothing.

Continuing keeps the current conversation in place. A handoff writes a portable file so the work can move elsewhere.

## What travels, and what doesn't

The document carries the live thread (what's in flight, why, and what's next) plus a **suggested skills** section naming what the next agent should reach for. The skill redacts secrets before it writes the file.

It deliberately does not carry anything already written down. The document references specs, plans, ADRs, issues, commits and diffs by path or URL, and never copies them. That keeps the file small, and it keeps the settled detail in one place instead of two copies that drift apart.

## Common questions

**Handoff or continuing in this conversation?**
Continue in the same conversation if the work is staying here. Use `/handoff` when the work needs to travel to another session, directory, or person. The handoff file is portable; it does not summarize better just because it is a file.

**What does a handoff preserve?**
It captures the live thread as a **[secondary source](https://www.aihero.dev/ai-coding-dictionary/secondary-source)**, then points to existing specs, plans, ADRs, issues, commits, and diffs rather than copying them. The current conversation remains the **[primary source](https://www.aihero.dev/ai-coding-dictionary/primary-source)**.

**Where did my handoff file go?**
It goes to the temp directory, which is the most-reported problem with the skill. The skill resolves it as `$TMPDIR`, else `/tmp` (`%TEMP%` on Windows), but the paths are long. Ask for the path back and keep it before you move on. Temp is deliberate, because a handoff is a document in transit, not an artifact you maintain. Temp is also not durable, as the next question explains.

**My handoff vanished between sessions.**
Temporary directories may be cleared between sessions or after a reboot. If the next session isn't starting soon, copy the file somewhere durable before leaving. The same applies to anything the document *points at*: if a handoff references other files in temp, the next session can't follow it.

**How do I actually hand it to the next agent?**
Open a fresh Copilot session, if available, and point it at the path: read this file, then continue. Point at the file rather than pasting the summary into a shell command. The shell may mangle a summary that contains backticks or `$(...)` when interpolated into a command, silently truncating the brief.

**Is this the same as starting another session?**
No. Another session may not have this conversation's context. A handoff creates a *targeted* summary for a stated next task in a portable file. Use it when that session cannot inherit the original context.

**When does something belong in `AGENTS.md` instead?**
Ask whether it should guide future Copilot work in this repository. `AGENTS.md` is for standing repository instructions; a handoff is about one piece of work in flight and is no longer useful once that work lands. If you keep re-explaining a project convention, it belongs in `AGENTS.md`. A half-finished task belongs in a handoff.

**It captures the what, not the why.**
This is a fair criticism, and people raise it often. Two things help. Pass the argument (tell it what the next session is for), so the skill keeps the reasoning that bears on *that* rather than flattening it. And watch for confident claims the session never verified, such as "X isn't built" or "Y is done". The next agent trusts the document and does not re-check it, so a belief written as a fact becomes a false premise for everything that follows. Read the document before you hand it over, and downgrade anything you only assumed.

**Why is this distributed as a skill?**
It ships and updates through the Copilot plugin alongside the other promoted skills. Its metadata marks it as intended for explicit user requests, but does not guarantee that every Copilot product or version can load it; see the [invocation guidance](../../.agents/invocation.md).

## It's working if

- The document is a small fraction of the conversation, and the specs, issues and diffs appear in it as paths and URLs rather than as copied text.
- You can read it cold, without the original session open, and know what to do next.
- The fresh agent starts working instead of asking you to re-explain the setup.
- In the fork case, your original session is unchanged when you come back to it.
- The suggested-skills section names the skill you'd have reached for yourself.
- Nothing in it is a key, a token, or a password.

## Where it fits

`handoff` is a **reach-for-it-anytime standalone**. It works between sessions rather than inside a build chain. Its closest neighbour is [prototype](../engineering/prototype.md), because a prototype lives in its own directory and the round trip out and back is the move this skill is for. When you reach a boundary and are unsure which skill fits, the local [ask-matt](../engineering/ask-matt.md) guide routes you across the set.
