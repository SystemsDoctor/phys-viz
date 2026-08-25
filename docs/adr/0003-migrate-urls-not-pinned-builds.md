# 3. Migrate old URLs; do not pin old builds

Date: 2026-08-25

## Status

Accepted

Resolves the second open decision in ARCHITECTURE.md §23.

## Context

A module's `schemaVersion` is bumped when a param key changes meaning
(§10). A link shared with a class last semester encodes the old
meaning. There are two ways to keep that link working: migrate the old
query string forward to the current build, or serve the shared link
from a pinned build of the module as it was.

Pinning would guarantee a course sees byte-identical behaviour across a
semester, but it means shipping and hosting every historical version of
every module, and it means a bug fix never reaches the links already
handed out. §14 already proposes migration and specifies the mechanism.

## Decision

Old URLs are **migrated forward**. `src/shell/state/migrations.ts` holds
`Record<moduleId, Record<fromVersion, (old) => new>>` and the shell
walks an old link up to the current `schemaVersion` on load. There are
no pinned per-module builds.

A link that cannot be migrated loads defaults and shows a
**non-blocking notice** — never an error page, never a white screen.

## Consequences

- Bumping a module's `schemaVersion` obliges the author to write the
  migration in the same change. A bump without a migration is an
  incomplete change, and reviewers should treat it as one.
- Migrations are append-only and are kept indefinitely. They are small
  pure functions and cheap to retain; deleting one silently breaks links
  that are already in students' bookmarks.
- Because migration is total, a module's *visual* behaviour may improve
  under an old link — a fix reaches every link ever shared. That is the
  intended trade: correctness over frozen reproducibility.
- If a course ever genuinely needs frozen behaviour for a semester, that
  is a new ADR superseding this one, and the honest implementation is a
  tagged deployment of the whole site, not per-module pinning.
- Contract assertion 8 (URL round-trip) covers the current version.
  Migrations need their own tests, per `fromVersion`, in the shell's unit
  tests — the contract suite cannot know last semester's schema.
