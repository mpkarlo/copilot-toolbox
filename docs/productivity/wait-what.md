## What it does

You type `wait-what` when you did not understand a message. The [agent](https://www.aihero.dev/ai-coding-dictionary/agent) then re-pitches what it just said. It adds the context you were missing, writes in plain English, and uses the vocabulary from your project's `GLOSSARY.md`.

The skill's main instruction is deliberately short. It asks for missing context, simplified English, and the project's vocabulary instead of adding a long set of rules for the [model](https://www.aihero.dev/ai-coding-dictionary/model) to follow.

## When to reach for it

This skill is intended for explicit requests; ask for `/wait-what` when it is available. Only you know when you stopped following. Availability depends on the Copilot product and version; see the [invocation guidance](../../.agents/invocation.md).

Use it as soon as you notice you're skimming. For example, the agent has started to use jargon it invented, put five acronyms in one sentence, or explained a decision whose premise you never saw. It fixes the conversation you're already in. To stop the jargon arriving at all, use [grill-with-docs](../engineering/grill-with-docs.md), which builds the shared language upfront.

## The name is the mechanism

The leading word is **wait**. "Be concise" is an instruction about the agent's output, and the model obeys it by clipping words and losing you further. **Wait** is about *your* state. It says you stopped understanding here. An agent that hears "be brief" writes clipped fragments. An agent that hears "wait, you lost me" backs up and explains.

That difference is the whole skill. Every popular fix for verbosity names the *output*: `/tldr`, `/no-fluff`, `/talk-normal`. The model over-corrects into clipped fragments that are shorter and no clearer. Naming the *listener* asks for both halves at once: fewer words **and** the context you were missing.

The skill says re-pitch **that**, not "that last message". What lost you is usually bigger than one paragraph, so the agent decides how far back to go.

## It plugs into the language you already have

The skill asks for ASD-STE100 Simplified Technical English and the ubiquitous language in your project's `GLOSSARY.md`. If a `GLOSSARY-MAP.md` identifies multiple contexts, it points the agent to the relevant glossary. The skill does not require a particular global instruction file.

If you have no glossary for the context, ask the agent to re-pitch without project-specific vocabulary.

## It's working if

- The re-pitch is **shorter and clearer**, not shorter and blunter.
- It adds the premise you were missing, instead of only deleting words.
- Project nouns replace invented ones. The terms in your `GLOSSARY.md` come back.
- You can use it twice in a row, and it does not degrade into terseness.

## Prerequisites

Optional Local-only preferences are available when `setup-matt-pocock-skills` is installed alongside this skill; it follows a link to the shared guide, and otherwise retains the project's existing configuration and fallback behavior.

## Where it fits

You can use `wait-what` at any point, in any conversation, inside any other skill. It repairs one message after the fact. The real fix is a shared language agreed upfront, and that is [grill-with-docs](../engineering/grill-with-docs.md): a [grilling](https://www.aihero.dev/ai-coding-dictionary/grilling) session that runs [domain-modeling](../engineering/domain-modeling.md) as it goes, so it records the words you both use in your `GLOSSARY.md`. If you're unsure which skill fits the moment, [ask-matt](../engineering/ask-matt.md) routes you.
