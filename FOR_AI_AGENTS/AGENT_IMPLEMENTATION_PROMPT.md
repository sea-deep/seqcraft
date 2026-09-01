You are implementing SeqCraft from the existing repository.

Before changing code, read these files completely:

1. `FEATURES.md`
2. `DESIGN.md`
3. `IMPLEMENTATION.md`
4. existing `AGENTS.md` if present
5. `package.json`, lockfile, TypeScript/Vite configuration, current source tree, tests, and git status

Treat the documents with this precedence:

1. `FEATURES.md` — locked MVP product scope: what must and must not exist.
2. `DESIGN.md` — locked UI/UX and visual behavior contract.
3. `IMPLEMENTATION.md` — proposed engineering architecture. Follow it by default, but you may change a technical choice if the current repository or a verified incompatibility gives a concrete reason.
4. `AGENTS.md` — living record of the actual implementation state and decisions.

Do not add features that are outside `FEATURES.md`.
Do not remove or simplify required features merely to finish faster.
Do not redesign the visual system outside `DESIGN.md`.
Do not modify the separate `nucleotide-sequence` package; consume its released npm artifact.

## Step 1 — Audit the repository

Inspect the current implementation before planning.

Determine:

- what scaffolding already exists
- installed dependencies and their versions
- shadcn/Base UI setup
- current source structure
- current TypeScript errors/warnings
- current tests
- whether any part of the proposed architecture already exists
- what parts of `IMPLEMENTATION.md` need adaptation to the real repository
- whether there are uncommitted user changes that must be preserved

Run the existing build/typecheck/tests before broad changes.

Do not overwrite working user code blindly.

## Step 2 — Produce the execution plan

Create `PLAN.md`.

Convert `IMPLEMENTATION.md` into an actionable repository-specific plan.

The plan must be phased and dependency-ordered.

For every phase include:

- goal
- exact feature slice delivered
- important files/modules expected to change
- dependencies, if any
- tests required
- acceptance gate
- dependencies on previous phases

Use the implementation phases as the starting structure, but adjust them based on the actual repository.

Keep tasks small enough that each task can be implemented, tested, and reviewed independently.

Do not make `PLAN.md` a speculative essay. It is an execution checklist.

Use status markers:

```text
[ ] pending
[~] in progress
[x] complete
[!] blocked
```

After the audit and plan are complete, begin implementation immediately. Do not wait for another approval unless a genuine external blocker makes progress impossible.

## Step 3 — Maintain `AGENTS.md` as a concise living record

If `AGENTS.md` does not exist, create it.

It must stay concise and useful to the next coding-agent session.

Use approximately this structure:

```md
# SeqCraft Agent Notes

## Non-negotiable contracts
- FEATURES.md controls MVP scope.
- DESIGN.md controls UI/UX.
- IMPLEMENTATION.md controls architecture unless a documented repository-specific reason requires deviation.
- Internal coordinates are 0-based half-open.
- Scientific calculations go through the nucleotide-sequence adapter.
- Persistent agent changes are staged for human approval.

## Current phase
<phase + one-line goal>

## Completed
- short factual bullets

## In progress
- current atomic task

## Next
- next 1–3 tasks only

## Decisions
- decision — reason

## Known issues / risks
- only unresolved facts

## Verification
- last commands run and whether they passed
```

Update `AGENTS.md` after each meaningful atomic task or small group of tightly related changes.

Do NOT turn it into a chronological diary.

Rules:

- 1–3 bullets per update are enough.
- replace stale `In progress` / `Next` entries rather than appending forever.
- keep durable architectural decisions.
- remove resolved temporary issues.
- record exact important test/build commands at phase gates.
- keep it small enough that a future agent can read it quickly.

`PLAN.md` holds the full checklist.
`AGENTS.md` holds the current implementation context.

## Step 4 — Implement vertically

Do not build disconnected infrastructure for several future phases at once.

For each atomic task:

1. inspect the relevant existing code
2. implement the smallest complete vertical behavior
3. add/adjust tests
4. run targeted tests
5. run typecheck/build when the task affects shared contracts
6. update `PLAN.md`
7. update `AGENTS.md`
8. continue to the next task

A feature is not complete because a component renders.

It must satisfy the Definition of Done in `IMPLEMENTATION.md`.

## Required engineering discipline

### Scientific logic

- All nucleotide calculations must go through the scientific adapter around the released `nucleotide-sequence` package.
- Do not copy formulas into React components.
- Do not reimplement reverse complement, GC, Tm, molecular weight, ORF finding, translation, or pairwise alignment if the package already provides it.
- Keep application/domain workflows separate from scientific primitives.

### Coordinates

Use exactly one internal convention:

`0-based, half-open [start, end)`

Any 1-based display conversion occurs only at the presentation boundary.

Add tests whenever coordinate conversion, circular wrapping, reverse strand, alignment mapping, PCR boundaries, or feature positions are involved.

### UI

Follow `DESIGN.md`.

In particular:

- no generic card-grid dashboard
- no excessive rounded containers
- no decorative gradients/glows
- use the defined spacing/type/color system
- sequence/map/inspector selection must remain synchronized
- scientific data gets visual priority
- shadcn/Base UI is for application chrome; scientific visualizations are custom components
- large sequence rendering must be virtualized
- never render one React node per base for the full document

### State

Shared user/document state belongs in the application store.

Local transient UI state stays local.

WebMCP handlers and UI actions must call the same application/domain workflows rather than maintaining duplicate logic.

### WebMCP

Do not implement WebMCP as an isolated demo layer.

Expose real SeqCraft capabilities.

Requirements:

- feature-detect `document.modelContext`
- app still works when unavailable
- runtime-validate tool arguments
- contextual/dynamic tool registration where appropriate
- bounded tool output
- no giant raw sequence payloads when document IDs/ranges suffice
- use read-only annotations correctly
- mark imported/user-controlled returned text as untrusted content
- honor WebMCP cancellation signals
- persistent document changes are staged; they are not silently committed
- tool calls visibly affect the same UI the human uses
- agent activity is logged concisely

### Performance

Do not postpone performance architecture until the end.

From the first sequence viewer implementation:

- virtualize lines
- bound result sets
- avoid whole-sequence copying in React transforms
- move genuinely expensive analysis off the main thread
- cancel/discard stale analysis when the source document changes
- respect alignment memory errors from the scientific package

### Imports

All imported content is untrusted data.

- render imported labels/notes as text
- do not inject raw HTML
- normalize parser output into SeqCraft's domain model
- preserve unsupported GenBank location text rather than inventing coordinates
- malformed input must fail with a useful error, not partially corrupt workspace state

## Testing expectations

Use tests as part of implementation, not as a cleanup phase.

At minimum maintain:

- domain/unit tests
- scientific adapter contract tests
- parser normalization tests
- circular-coordinate tests
- rendering/interaction component tests
- workflow tests
- WebMCP handler tests
- Playwright critical journeys once the relevant phases exist

Avoid large brittle snapshots.

Every bug found during implementation should receive a regression test when practical.

## Phase gates

At the end of each phase:

1. run all targeted tests
2. run full unit/component suite
3. run TypeScript validation
4. run production build
5. manually inspect the delivered workflow
6. mark the phase complete in `PLAN.md`
7. update `AGENTS.md` with:
   - what is now actually working
   - remaining risk
   - next phase

Do not mark a phase complete if its acceptance gate from `IMPLEMENTATION.md` is not met.

## Dependency policy

Before adding any package:

- inspect whether the project already has an equivalent
- verify the package is needed
- prefer a focused mature dependency over bespoke infrastructure when it is not part of SeqCraft's differentiating domain logic
- do not add a second UI framework, AI SDK, backend framework, generic chart system, or competing state library
- do not replace the existing Base UI/shadcn setup

Document meaningful dependency decisions in `AGENTS.md`.

## Git/worktree safety

- preserve unrelated user changes
- no destructive resets
- no force pushes
- no deleting user files merely because they are unfamiliar
- keep generated junk out of the repository
- do not commit secrets
- inspect `git diff` frequently

Do not automatically publish or release anything unless explicitly asked later.

## Completion behavior

Continue phase-by-phase until the MVP in `FEATURES.md` is implemented or a genuine blocker prevents progress.

When you finish a work session, do not give a vague summary.

Report:

- current phase
- tasks completed
- tests/build commands and results
- important files changed
- unresolved issues
- exact next task already recorded in `AGENTS.md`

The repository itself — `PLAN.md`, `AGENTS.md`, tests, and working code — must remain sufficient for a different coding agent to resume without reconstructing the project from chat history.
