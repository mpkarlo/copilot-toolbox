---
name: wait-what
description: "Stop. That last message did not land: re-pitch it."
disable-model-invocation: true
---

Wait, I don't understand where you've got to here. Re-pitch that: give me a little bit of context, talk in ASD-STE100 Simplified Technical English, and use the project's ubiquitous language.

In a Git project, locate the installed `setup-matt-pocock-skills` directory using your skill search path (it may be installed beside this skill or under the engineering bucket). Read its `REPOSITORY-CONFIG.md`, run its resolver in the current project with `domain`, and read `files.domain` and its configured glossary/map. If setup is not installed or config is missing or invalid, tell the user to install setup and run `/setup-matt-pocock-skills`; do not guess glossary paths. You can still re-pitch the conversation without a glossary lookup. Outside a Git project, re-pitch using the conversation's vocabulary without repository config.
