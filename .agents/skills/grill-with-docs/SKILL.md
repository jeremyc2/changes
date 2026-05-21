---
name: grill-with-docs
description: Grilling session that challenges your plan against the existing domain language, sharpens terminology, and updates documentation (UBIQUITOUS_LANGUAGE.md, ADRs) inline as decisions crystallise. Use when user wants to stress-test a plan against their project's language and documented decisions.
---

<what-to-do>

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing.

If a question can be answered by exploring the codebase, explore the codebase instead.

</what-to-do>

<supporting-info>

## Domain awareness

During codebase exploration, also look for existing documentation:

- `UBIQUITOUS_LANGUAGE.md` for shared vocabulary.
- Existing ADRs using the format in [ADR-FORMAT.md](./ADR-FORMAT.md).
- Relevant reference repos under `reference_repositories`.

Do not create or update `CONTEXT.md` or `CONTEXT-MAP.md`; this repo uses `UBIQUITOUS_LANGUAGE.md` for shared vocabulary.

## During the session

### Challenge against the ubiquitous language

When the user uses a term that conflicts with the existing language in `UBIQUITOUS_LANGUAGE.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y - which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update UBIQUITOUS_LANGUAGE.md with permission

When a term is resolved, propose the exact `UBIQUITOUS_LANGUAGE.md` change and ask before editing it. Don't batch approved updates - capture them as they happen.

`UBIQUITOUS_LANGUAGE.md` should be totally devoid of implementation details. Do not treat it as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.

### Offer ADRs sparingly

Use [ADR-FORMAT.md](./ADR-FORMAT.md) for when to offer an ADR, where to put it, and how much to write.

</supporting-info>
