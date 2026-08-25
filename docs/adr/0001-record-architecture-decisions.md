# 1. Record architecture decisions

Date: 2026-08-25

## Status

Accepted

## Context

ARCHITECTURE.md §23 ("Open decisions") lists several questions this
project has deliberately deferred (MDX vs. markdown for explain panels,
module versioning/deprecation, whether modules ever compose, offline
use, GIF/video export, and the 2D-rendering strategy). New decisions of
similar weight — anything that changes the module contract, the URL
schema, or a binding cross-module convention — will come up throughout
the project's life.

## Decision

We will use Architecture Decision Records, as described by Michael
Nygard, to record any decision with project-wide, hard-to-reverse
consequences. Each ADR lives in `docs/adr/` as `NNNN-title-with-dashes.md`
and is never edited after acceptance — a later decision that supersedes
one gets its own new ADR that says so.

## Consequences

Anyone reviewing a change to `src/modules/types.ts`, the URL codec, or
`docs/PHYSICS_CONVENTIONS.md` can see why the current shape was chosen,
not just what it is.
