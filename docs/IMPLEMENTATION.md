# SeqCraft Proposed Implementation

This document translates `FEATURES.md` and `DESIGN.md` into an implementation plan. It is the engineering contract for the scientific MVP and its production-shaped account/control plane.

The goal is a production-shaped browser application, not a proof-of-concept. Scientific computation must remain deterministic and isolated from UI concerns; UI state must remain predictable; WebMCP must expose the same real workflows available to a human user.

---

## 1. Engineering goals

SeqCraft must be:

- **scientifically deterministic** — calculations come from the hardened `nucleotide-sequence` package or explicitly validated domain logic.
- **local-first with an optional control plane** — raw sequences and interactive science stay in the browser; identity and bounded metadata may use the Node API.
- **responsive under realistic plasmid workloads** — importing, navigating, annotating, restriction analysis, primers, PCR, ORFs, and comparison must not freeze the UI.
- **agent-native without being agent-dependent** — every important workflow remains usable manually.
- **strict about coordinates and units** — one internal coordinate convention, explicit units, no hidden conversions.
- **testable by layer** — scientific adapter, domain logic, rendering geometry, workflows, and WebMCP handlers can be tested independently.
- **easy to extend** — cloning methods, persistence, collaboration, and additional scientific modules should be addable later without rewriting the core.

---

# 2. Stack

## Application

- **React + TypeScript**
- **Vite**
- **Tailwind CSS**
- **shadcn/ui using the already-selected Base UI/Sera setup**
- **Zustand** for shared workspace/application state
- **Zod** for runtime validation at external boundaries
- **@tanstack/react-virtual** for large linear sequence/result rendering
- Existing shadcn icon family only; do not introduce a second icon library

## Scientific engine

- The exact hardened npm release of **`nucleotide-sequence`**
- Pin/lock the released version used for the hackathon
- Consume the package normally from npm; do not import its repository source
- Do not add SeqCraft product concepts back into that package

## Import

- FASTA through the hardened `nucleotide-sequence` parser
- GenBank through a maintained browser-compatible GenBank parser, normalized through our own adapter
- Raw DNA through our own input boundary + `nucleotide-sequence` validation

## Testing

- **Vitest**
- **React Testing Library**
- **Playwright** for critical user journeys
- Small deterministic fixture files committed to the repository
- No tests should require live external services

## Browser integration

- Current imperative **WebMCP** API
- Feature-detect WebMCP and keep the human UI functional when unavailable

## Control-plane backend

- **Node.js 20+ + TypeScript**
- **Express 5** with explicit security headers, origin allow-listing, request size limits, and rate limiting
- **Better Auth** mounted before JSON parsing, using secure same-origin cookies
- **Google OAuth** when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured
- **MongoDB Atlas** through one process-wide `MongoClient`; Better Auth uses its MongoDB adapter
- **Zod** at every API boundary
- Dependency-injected in-memory repositories for tests; tests never require live Atlas or OAuth

The browser app remains fully usable in guest/local mode when the API or credentials are unavailable.

---

# 3. Architectural boundaries

Use a local scientific data plane plus a remote control plane. The browser retains the four scientific layers.

```text
UI / Interaction
      │
      ▼
Application / Workflows
      │
      ▼
Domain Model
      │
      ▼
Scientific / Parsing Adapters
```

WebMCP enters through the **application/workflow layer**, never by mutating React components directly.

```text
Browser scientific data plane                 Node control plane

UI / WebMCP                                   HTTP API / Better Auth
      │                                                │
Application commands                          service + policy layer
      │                                                │
Domain + workers                              metadata repositories
      │                                                │
OPFS / IndexedDB (raw sequences)              MongoDB Atlas (no sequences)
```

The API must not expose a generic document upload endpoint. All metadata DTOs are allow-listed; never serialize a `SequenceDocument` directly across the network.

### UI layer

Owns:

- React components
- selection presentation
- panels
- map/track rendering
- dialogs/popovers
- keyboard/mouse interaction

It does not contain scientific formulas.

### Application layer

Owns user intents such as:

- import document
- create annotation
- select feature
- calculate restriction sites
- create primer
- pair primers
- simulate PCR
- compare documents
- stage agent proposal
- approve cloning preview

This layer is shared by UI commands and WebMCP handlers.

### Domain layer

Owns typed concepts:

- sequence document
- feature
- primer
- primer pair
- restriction site
- ORF result
- annotation proposal
- comparison result
- cloning proposal

### Adapter layer

Owns:

- `nucleotide-sequence`
- GenBank parser
- FASTA/raw sequence import
- worker bridge
- WebMCP browser API wrapper

No React imports below the UI/application boundary.

### Control-plane source layout

```text
server/
├── app.ts                    # Express composition, no listener side effect
├── index.ts                  # process bootstrap and graceful shutdown
├── auth.ts                   # Better Auth configuration
├── config.ts                 # validated environment contract
├── db/mongo.ts               # singleton client lifecycle
├── middleware/               # security, request IDs, errors, rate limits
├── modules/health/           # readiness/capability discovery
├── modules/projects/         # sequence-free metadata sync
├── repositories/             # Mongo and in-memory implementations
└── privacy/                  # DTO guards and redaction
```

Keep the existing frontend source layout at `src/`; do not churn the repository into a monorepo only for appearances.

---

# 4. Proposed source layout

```text
src/
├── app/
│   ├── AppShell.tsx
│   ├── routes.ts
│   └── providers.tsx
│
├── components/
│   ├── ui/                       # shadcn-generated components
│   ├── workspace/
│   ├── inspector/
│   ├── sequence/
│   │   ├── SequenceViewer.tsx
│   │   ├── SequenceLine.tsx
│   │   ├── CoordinateGutter.tsx
│   │   ├── FeatureTrack.tsx
│   │   ├── PrimerTrack.tsx
│   │   ├── RestrictionTrack.tsx
│   │   └── OrfTrack.tsx
│   ├── plasmid/
│   │   ├── CircularMap.tsx
│   │   ├── FeatureArc.tsx
│   │   └── MapLabels.tsx
│   ├── compare/
│   ├── primers/
│   ├── restriction/
│   ├── cloning/
│   └── agent/
│
├── domain/
│   ├── document.ts
│   ├── feature.ts
│   ├── primer.ts
│   ├── restriction.ts
│   ├── comparison.ts
│   ├── proposal.ts
│   └── coordinates.ts
│
├── scientific/
│   ├── nucleotide.ts             # only adapter to nucleotide-sequence
│   ├── restriction.ts
│   ├── pcr.ts
│   ├── compare.ts
│   └── known-features.ts
│
├── import/
│   ├── fasta.ts
│   ├── genbank.ts
│   ├── raw-sequence.ts
│   └── normalize-document.ts
│
├── workflows/
│   ├── import-document.ts
│   ├── annotations.ts
│   ├── primers.ts
│   ├── pcr.ts
│   ├── restriction-cloning.ts
│   └── comparison.ts
│
├── state/
│   ├── workspace-store.ts
│   ├── selectors.ts
│   └── activity-store.ts
│
├── workers/
│   ├── analysis.worker.ts
│   ├── client.ts
│   └── protocol.ts
│
├── webmcp/
│   ├── register.ts
│   ├── registry.ts
│   ├── schemas.ts
│   ├── handlers.ts
│   └── activity.ts
│
├── data/
│   ├── restriction-enzymes.ts
│   ├── known-features.ts
│   └── demo-workspace.ts
│
└── test/
    └── fixtures/
```

Do not create abstractions merely because this tree exists. A directory should contain real responsibility.

---

# 5. Core domain model

Use one internal coordinate convention everywhere:

```text
0-based, half-open [start, end)
```

Do not store UI-facing 1-based coordinates in domain state.

## Sequence document

A document is more than a sequence.

```ts
type Topology = "linear" | "circular"

interface SequenceDocument {
  id: string
  name: string
  topology: Topology
  sequence: ScientificSequence
  alphabet: "DNA" | "RNA" | "MIXED" | "UNKNOWN"
  features: Feature[]
  primers: Primer[]
  source: DocumentSource
  version: number
}
```

`version` increments when persistent document state changes and is used to invalidate cached analyses.

`ScientificSequence` is an application-owned wrapper/handle around the hardened sequence package. Components should not construct package objects directly.

## Feature

```ts
interface Feature {
  id: string
  name: string
  type: FeatureType
  start0: number
  end0Exclusive: number
  strand: 1 | -1
  qualifiers: Record<string, string | string[]>
  source: "imported" | "manual" | "detected" | "agent"
}
```

For a circular feature crossing origin, represent the semantic interval explicitly rather than lying about it. Either:

- use a dedicated `wrapsOrigin: true`, or
- represent the feature as one logical feature with two render segments.

Do not silently convert it into two unrelated annotations.

## Primer

Keep binding sequence and 5' extension separate.

```ts
interface Primer {
  id: string
  name: string
  strand: 1 | -1
  annealingSequence: string
  extension5: string
  binding?: {
    start0: number
    end0Exclusive: number
  }
}
```

Scientific properties are derived, not duplicated as mutable state:

- length
- GC
- Tm
- molecular weight

## Staged proposal

All agent-created persistent changes use a proposal model.

```ts
interface StagedProposal {
  id: string
  kind: "annotation" | "construct"
  createdBy: "agent"
  status: "pending" | "applied" | "rejected"
  documentId: string
  payload: unknown
  summary: string
}
```

Approval is an application command, not a direct state mutation inside WebMCP execution.

---

# 6. State management

Use one Zustand workspace store for shared application state and one lightweight activity store for agent/task logs.

## Workspace store

Own:

```text
documents
document order
active document
current selection
current center view/tab
compare document pair
restriction enzyme filters
staged proposals
analysis status/cache keys
```

Keep ephemeral visual details local to components when they do not need cross-component synchronization.

Examples that should remain local:

```text
popover open
hovered label
temporary text field
menu state
```

Examples that belong in shared state:

```text
selected feature
selected base range
active document
focused region
active compare result
pending agent proposal
```

Use narrow selectors. Components must subscribe only to the state they actually render.

Do not put giant derived scientific results into one global object and cause the whole app to rerender.

---

# 7. Scientific adapter

`src/scientific/nucleotide.ts` is the only application module allowed to import the public scientific package directly.

It exposes application-friendly operations such as:

```text
validateSequence
sequenceMetadata
reverseComplement
gcContent
meltingTemperature
molecularWeight
findORFs
translateRegion
alignGlobal
alignLocal
findMotif
```

Benefits:

- isolates package API changes
- centralizes coordinate conversion
- centralizes error normalization
- prevents UI files from accumulating scientific assumptions
- makes WebMCP and manual UI use the exact same implementation

Never duplicate a calculation already provided by the package.

If SeqCraft needs a new product concept, implement it in SeqCraft by composing validated primitives.

---

# 8. Import pipeline

Every import passes through:

```text
input
  ↓
format parser
  ↓
validated normalized record
  ↓
SequenceDocument
  ↓
workspace
```

No parser writes directly into UI state.

## Raw DNA

1. Normalize line endings/whitespace allowed for raw paste.
2. Validate through the scientific adapter.
3. Reject invalid characters with position-aware feedback.
4. Infer alphabet.
5. Create a linear document by default.
6. Let user rename it after import.

## FASTA

1. Use the hardened FASTA parser.
2. Each FASTA record becomes a separate document.
3. Preserve header text as metadata but render it as untrusted plain text.
4. Default topology to linear because FASTA does not reliably encode topology.
5. Do not fabricate annotations.

## GenBank

Use a maintained parser for lexical flatfile parsing, then normalize into our domain.

Normalization must handle at minimum:

- LOCUS name
- molecule length
- circular/linear topology
- ORIGIN sequence
- FEATURES
- feature type
- feature location
- complement
- simple joined locations
- qualifiers such as:
  - label
  - gene
  - product
  - note
  - translation

Raw feature locations should be preserved for diagnostics when they cannot be normalized.

Unsupported complex remote/fuzzy locations should not crash import. Import the document, retain the raw qualifier/location, and mark that feature as unsupported for geometry if necessary.

Test against several real small GenBank fixtures, including a circular plasmid.

---

# 9. Linear sequence viewer

This is a custom renderer.

Do not render one React component per nucleotide.

## Layout model

Default:

```text
60 bases / line
6 groups × 10 bases
```

Compute line index:

```text
line = floor(position / 60)
```

Compute visible line range from the scroll viewport.

Use `@tanstack/react-virtual` to render only visible lines plus a small overscan.

Each `SequenceLine` renders:

1. coordinate gutter
2. grouped nucleotide text
3. selection/highlight layer
4. feature track(s)
5. primer track
6. restriction markers
7. ORF/translation track when enabled

For a plasmid-sized sequence, render text as a few spans per line, not per base.

## Selection

Pointer drag converts x-position into base index using measured monospace character width.

Selection becomes:

```ts
{ documentId, start0, end0Exclusive }
```

Selection is shared state so:

- inspector updates
- circular map highlights
- translation actions use it
- WebMCP `focus_region` can set it

Keyboard navigation should support arrows and Escape clearing selection after pointer functionality is stable.

---

# 10. Circular plasmid map

Build in SVG.

Do not use a generic chart library.

## Geometry

Use the equations defined in `DESIGN.md`.

Document coordinate:

```text
i / sequenceLength
```

maps to an angle around the circle.

Features become annular arcs/arrows.

## Lane layout

Assign features to a small number of deterministic lanes to prevent overlap.

Algorithm:

1. sort visible features by start coordinate
2. try first available lane with no angular overlap
3. cap visual lanes
4. overflow features remain accessible via inspector/search even if label is hidden

## Labels

Prioritize:

1. selected feature
2. CDS/gene
3. resistance/origin/promoter
4. other imported features

Do not show every restriction label simultaneously.

## Synchronization

Click map feature:

```text
set active feature
focus linear view
update inspector
```

Linear selection:

```text
highlight corresponding circular arc
```

Use a single application command for focus; do not maintain separate independent selections.

---

# 11. Annotations and known-feature detection

Manual annotations are normal document features with `source: "manual"`.

## Creating

1. user selects sequence region
2. chooses Add annotation
3. enters name/type/strand/notes
4. validate coordinates
5. commit one domain update
6. increment document version

## Auto-detection

Use a small, versioned local library of common deterministic feature sequences.

Each known feature contains:

```text
stable id
display name
feature type
canonical sequence
provenance/source note
```

Matching:

- exact forward match
- exact reverse-complement match
- circular-origin match when topology is circular

No fuzzy matching in the MVP.

Detected features are suggestions/results; avoid silently replacing imported annotations with duplicates.

Deduplicate by overlap + feature identity.

---

# 12. Restriction enzyme analysis

Use a curated, versioned enzyme dataset with provenance.

Each enzyme needs:

```ts
interface RestrictionEnzyme {
  name: string
  recognition: string
  forwardCutOffset: number
  reverseCutOffset: number
  overhang: "5prime" | "3prime" | "blunt"
}
```

Recognition patterns may contain IUPAC ambiguity codes.

## Site finding

1. derive active enzyme set
2. search both strands
3. support recognition sites spanning circular origin
4. normalize site coordinates
5. compute actual forward/reverse cut positions
6. group by enzyme
7. derive cutter count

UI filters are derived from counts.

## Digest simulation

For selected enzymes:

1. collect unique cut positions
2. sort positions
3. for linear DNA, fragments are boundaries between ends/cuts
4. for circular DNA, fragments wrap from final cut to first cut
5. preserve enzyme/cut metadata for navigation

No gel electrophoresis simulation in MVP.

---

# 13. Primer workflow

## Create primer

From selection:

1. choose forward/reverse
2. derive template-binding sequence
3. reverse-complement when required
4. set annealing sequence
5. leave 5' extension empty initially
6. compute properties via scientific adapter
7. store the primer object

## Properties

Always calculate Tm from the **annealing sequence**, not from non-binding 5' extensions.

Display assumptions/units consistent with the scientific package.

## Binding-site search

Find exact annealing-sequence binding first.

For reverse primers, search the correct reverse-complement relationship explicitly.

Return all candidate binding sites with strand/orientation.

If multiple sites exist, show them instead of pretending specificity is unique.

No thermodynamic off-target prediction in MVP.

---

# 14. Primer pairs and PCR

A PCR pair must pass structural validation before simulation.

## Pair validation

Check:

- both primers have binding sites
- strands oppose correctly
- forward primer points toward reverse primer
- amplicon length is positive
- for circular templates, choose the directed path implied by primer orientation

## Product assembly

Result:

```text
forward 5' extension
+ amplified template region
+ reverse-primer extension represented in product orientation
```

The implementation must be covered by explicit known examples.

The simulated product becomes a new `SequenceDocument` only when the user chooses Extract/Open product.

Derived PCR summary:

- length
- forward Tm
- reverse Tm
- ΔTm
- start/end
- topology: linear

Do not invent PCR cycling temperatures/times in this MVP.

---

# 15. ORFs and translation

ORFs and translation come from the scientific adapter.

## ORFs

Cache by:

```text
document version
genetic code
minimum ORF length
relevant options
```

Render as track data, not permanent document features unless explicitly converted to an annotation.

## Translation

Selection-driven action:

1. validate selected length/frame
2. choose supported NCBI table
3. translate through adapter
4. show codon-aligned amino acids

Do not call ORFs genes.

---

# 16. Sequence comparison

Use two execution paths.

## Fast path

If sequences have equal length and the user requests simple comparison:

- direct index comparison
- classify substitutions
- O(n)

## Alignment path

For indels/unequal length:

- use hardened Needleman–Wunsch global alignment
- run through analysis worker for non-trivial inputs
- respect package memory guard
- convert aligned columns into:
  - match
  - substitution
  - insertion
  - deletion

Comparison result stores an index mapping between aligned columns and original reference/query coordinates.

UI uses this mapping to keep annotation coordinates tied to the reference.

Do not run full global alignment on arbitrary huge chromosomes. Surface the scientific engine's allocation error in user-friendly language.

---

# 17. PCR / restriction-cloning planner

This is a workflow orchestrator, not a new scientific engine.

The planner operates on a **proposal**, never mutates the backbone in place.

## Step 1 — define intent

Input:

- backbone document
- insert document
- target feature/region to replace or insertion position

## Step 2 — restriction analysis

Find candidate sites around target region and in insert.

Reject/flag enzymes that:

- cut undesirably inside insert
- produce incompatible ends
- cannot preserve intended orientation

## Step 3 — primer proposal

Generate primer templates with:

- annealing region
- selected enzyme recognition sequence in 5' extension

Do not pretend automatic primer design is globally optimal. Show the generated candidate and its Tm/GC.

## Step 4 — simulate PCR

Produce the insert amplicon.

## Step 5 — construct preview

Create an immutable preview document:

- remove/replace intended backbone region
- insert simulated product in requested orientation
- preserve unaffected backbone features
- add/update insert feature
- mark junctions

## Step 6 — verify

Check:

- orientation
- sequence length
- junction sequences
- internal chosen restriction sites
- reading frame when the operation is explicitly coding-frame sensitive

## Step 7 — approval

Human sees a summary/diff.

Only approval creates a new workspace document.

Never mutate the source backbone.

---

# 18. Analysis workers and cancellation

Main-thread responsiveness is non-negotiable.

Create one typed analysis worker protocol.

Candidate worker operations:

- large motif/restriction scan
- ORF scan on large documents
- alignment/comparison
- large auto-feature scan

Small plasmid operations may run inline when cheaper than worker messaging.

Every worker request has:

```text
request id
operation
payload
```

and returns:

```text
request id
success/result OR typed error
```

Support cancellation from:

- user cancel
- document changed
- WebMCP `AbortSignal`

If a document version changes while an analysis is running, stale results must be discarded.

---

# 19. Analysis cache

Cache deterministic derived results by:

```text
documentId
documentVersion
operation
normalized parameters
```

Examples:

```text
restriction sites
ORFs
known-feature scan
comparison
```

Do not cache giant duplicated sequence strings.

Use a bounded cache and clear entries when a document is removed.

---

# 20. WebMCP architecture

WebMCP must be a thin semantic adapter over existing application commands.

Do not make separate "agent logic" versions of the product.

## Registration lifecycle

Feature-detect:

```text
document.modelContext
```

If absent:

- app stays fully functional
- show WebMCP unavailable status
- do not throw

Register tools contextually.

Base tool:

```text
get_workspace
```

When a document exists, expose sequence/document analysis tools.

When two compatible documents exist, expose comparison.

Use `AbortController`-backed registrations when capabilities change so stale tools are removed cleanly.

## Schemas

Define every input with Zod, then derive/maintain equivalent JSON Schema for WebMCP.

Handlers runtime-validate input even if the browser/agent is expected to validate it.

No tool accepts an arbitrary giant DNA string when a `documentId` can be used.

## Tool contract

Each handler:

1. validates input
2. resolves document(s)
3. executes the same application/scientific command used by UI
4. updates visible UI state when appropriate
5. logs activity
6. returns bounded structured data
7. honors cancellation

Use:

- `readOnlyHint: true` for inspections/analysis
- `readOnlyHint: false` for state-changing/staging operations
- `untrustedContentHint: true` whenever returned content can contain imported headers, annotations, names, notes, or other user-provided text

## Tool set

Implement the MVP tools around real product actions:

```text
get_workspace
get_sequence_info
get_sequence_region
focus_region
list_features
find_known_features
stage_annotation
find_restriction_sites
simulate_digest
analyze_primer
find_primer_binding_sites
simulate_pcr
find_orfs
translate_region
compare_sequences
```

Do not expose an agent-only tool unless there is a clear user workflow it serves.

## Bounded output

Examples:

- `get_sequence_region`: maximum bounded interval
- matches: limit + truncation marker
- ORFs: limit
- comparison differences: limit/cursor or summary + focused region

Never dump whole plasmids unnecessarily into model context.

---

# 21. Agent activity and approval

Every WebMCP execution creates an activity entry.

```ts
interface ActivityEntry {
  id: string
  tool: string
  startedAt: number
  durationMs?: number
  status: "running" | "success" | "error" | "awaiting-approval"
  summary: string
  inputSummary?: unknown
  resultSummary?: unknown
}
```

Do not store giant tool payloads in activity history.

For persistent proposals:

```text
WebMCP handler
  ↓
stage proposal
  ↓
visible Inspector/Activity UI
  ↓
human Apply / Reject
```

Navigation/highlighting may occur immediately.

---

# 22. Error model

Use typed domain/application errors, then translate them at the UI/WebMCP boundary.

Examples:

```text
InvalidSequenceError
UnsupportedGenBankLocationError
DocumentNotFoundError
InvalidPrimerPairError
NoBindingSiteError
AlignmentBudgetError
UnsupportedTopologyError
AnalysisCancelledError
```

WebMCP errors should be actionable:

Bad:

```text
operation failed
```

Good:

```text
The requested region is 18,220 bp; agent region reads are limited to 4,096 bp.
Request a smaller interval.
```

Do not leak stack traces into user-facing output.

---

# 23. Performance budgets

SeqCraft is optimized for plasmids and construct-scale sequences, not whole-genome browsing.

Targets:

- normal UI interaction should remain within one frame where practical
- no long scientific job blocks pointer/keyboard interaction
- first demo workspace render should feel immediate
- sequence scrolling must not degrade with sequence length because lines are virtualized
- circular map should render only meaningful features/labels, not thousands of DOM/SVG elements

Guardrails:

- no one-node-per-base document rendering
- no unbounded match result arrays in UI or WebMCP
- no accidental full-sequence copies in React state transformations
- no giant analysis result retained after document version changes
- large global alignment must obey the scientific package memory budget
- map/feature label generation must be capped

Recommended product behavior:

- optimize full interactive experience for typical plasmid/construct sizes
- for unusually large sequences, degrade gracefully: linear/virtualized viewing remains possible while expensive map/comparison operations can warn or refuse

Do not market genome-browser-scale support.

---

# 24. Security and trust boundaries

The local workspace requires no remote API. Account features use the optional control-plane API.

Hard privacy invariants:

- never send or store `sequence.raw`, sequence chunks, imported file bodies, clipboard sequence content, or derived constructs
- never log authorization headers, cookies, request bodies, OAuth tokens, or biological content
- metadata endpoints use explicit DTOs with bounded string/array lengths and reject unknown keys
- project/document descriptors may contain ID, user-supplied display name, length, alphabet, topology, timestamps, and local opaque storage key only
- API responses use `Cache-Control: no-store` for identity/private data
- production cookies are secure, HTTP-only, same-site, and scoped to the application origin
- state-changing endpoints require an authenticated session and same-origin/CSRF protection
- secrets exist only in environment variables; `.env` is ignored and `.env.example` contains placeholders
- Mongo indexes and TTL retention are intentionally small; no change streams, polling loops, GridFS, or raw event dumps on the free tier

Backend-delegated jobs are not a loophole around privacy. Until a separate opt-in design is approved, they may accept only non-sequence metadata or bounded derived values that cannot reconstruct biological source data. Sequence-heavy analysis belongs in Web Workers/WASM.

Treat imported data as untrusted:

- filenames
- GenBank labels
- qualifiers
- descriptions
- pasted sequence names

Render them as text, never raw HTML.

Do not execute imported content.

WebMCP tool descriptions are static developer-authored strings; never concatenate imported/user content into tool descriptions.

Every WebMCP tool uses the same validated application command as the visible UI, declares read-only/destructive behavior truthfully, caps outputs, and marks imported/user-authored content as untrusted. Persistent changes always return an approval proposal rather than mutating a document immediately.

Returned imported content gets `untrustedContentHint`.

File import must have reasonable size/error handling and must fail cleanly.

---

# 25. Testing strategy

## Unit tests

Required for:

- coordinate helpers
- circular interval splitting
- GenBank normalization
- restriction cut coordinates
- circular-origin restriction matches
- digest fragments
- primer direction/binding
- PCR product assembly
- cloning preview
- comparison diff classification
- map geometry
- WebMCP input schemas

## Scientific adapter contract tests

For every adapter operation used by SeqCraft:

- known deterministic input
- expected result
- verifies wrapper semantics/coordinates

Do not re-test the entire scientific package internally; test that SeqCraft uses it correctly.

## Component tests

Focus on behavior:

- selecting a feature updates inspector
- sequence selection creates correct coordinates
- map click focuses linear view
- restriction filter changes rendered sites
- staged proposal renders Apply/Reject
- approving proposal creates expected state

Avoid enormous brittle snapshots.

## End-to-end Playwright flows

At minimum:

### Flow A — document inspection

```text
open demo
→ click GFP feature
→ sequence focuses
→ inspector shows correct coordinates
```

### Flow B — restriction analysis

```text
choose EcoRI
→ see site count
→ click site
→ sequence focuses site
→ digest displays fragments
```

### Flow C — primer/PCR

```text
create forward/reverse primers
→ pair them
→ simulate PCR
→ open product
```

### Flow D — compare

```text
compare reference and variant
→ mutation/indel shown
→ select difference
→ both views focus
```

### Flow E — cloning proposal

```text
choose backbone + insert
→ create restriction-cloning proposal
→ inspect preview
→ approve
→ new document appears
→ original remains unchanged
```

### Flow F — WebMCP

Keep handler-level tests independent of real browser-agent availability.

Also provide a manual/browser smoke checklist using a WebMCP-enabled browser to verify:

- registered tool list
- multi-tool workflow
- UI reacts to tool execution
- proposal approval
- cancellation/error behavior

---

# 26. CI and quality gates

Every push/PR should run:

```text
install from lockfile
lint
typecheck
unit/component tests
build
```

Run Playwright critical flows in CI once stable.

Before submission/release:

```text
clean install
all tests
production build
WebMCP manual smoke test
live deployment smoke test
```

No ignored TypeScript errors.

No `any` added merely to silence types at public/domain boundaries.

No failing tests left behind with `.skip` unless documented as intentionally unsupported.

---

# 27. Implementation phases

Do not build everything in parallel.

Each phase must leave the application runnable.

## Phase 0 — repository audit and foundation

- inspect current scaffold/dependencies
- reconcile with `DESIGN.md` and `FEATURES.md`
- install only approved missing dependencies
- establish source structure
- establish domain types and coordinate helpers
- establish workspace store
- add test/config baseline

**Gate:** build + typecheck + tests green.

## Phase 1 — documents and import

- raw DNA import
- FASTA import
- GenBank import/normalization
- workspace sidebar
- document metadata inspector
- built-in demo workspace

**Gate:** real GenBank plasmid opens with features/topology correctly normalized.

## Phase 2 — scientific visualization

- virtualized linear sequence viewer
- selection/focus
- feature track
- circular map
- synchronized map/sequence/inspector

**Gate:** selecting any imported feature works from map, sequence, and inspector without coordinate disagreement.

## Phase 3 — annotations and restriction analysis

- manual annotations
- known-feature scan
- restriction enzyme dataset
- site finding
- unique-cutter filters
- digest simulation
- map/linear visualization

**Gate:** circular-origin tests and digest math pass.

## Phase 4 — primers and PCR

- primer creation
- properties
- binding sites
- primer pair model
- PCR simulation
- product extraction

**Gate:** deterministic fixture yields exact expected amplicon sequence and length.

## Phase 5 — ORFs, translation, comparison

- ORF tracks
- translation
- direct same-length diff
- alignment-backed indel comparison
- comparison UI

**Gate:** expected/variant demo construct produces correct mutations/indels and coordinates.

## Phase 6 — cloning planner

- select backbone/insert/target
- restriction candidate analysis
- primer-extension proposal
- PCR product simulation
- immutable construct preview
- junction/frame checks
- approval creates a new document

**Gate:** complete GFP→mCherry demo works manually end-to-end.

## Phase 7 — WebMCP

- registration lifecycle
- schemas/handlers
- activity panel
- focus/navigation tools
- scientific analysis tools
- staged annotation/construct proposal
- bounded outputs
- cancellation
- trust annotations

**Gate:** the same cloning/inspection workflow works through an external WebMCP agent and visibly drives the UI.

## Phase 8 — hardening and demo polish

- loading/error/empty states
- keyboard/accessibility pass
- performance pass
- responsive inspector/sidebar behavior
- Playwright critical flows
- production deployment
- demo fixtures
- manual WebMCP smoke test

**Gate:** fresh visitor can run the demo without setup or external services.

---

# 28. Definition of done for any feature

A feature is not complete because its happy-path component renders.

It is complete when:

1. domain behavior is defined
2. invalid inputs are handled
3. scientific units/coordinates are explicit
4. UI follows `DESIGN.md`
5. it works from the shared application command/workflow
6. relevant WebMCP handler can reuse that workflow if exposed
7. tests cover critical behavior
8. loading/error/empty states exist
9. no obvious unbounded rendering/result behavior exists
10. documentation and tests are updated with completed work and any remaining caveats

---

# 29. Dependency policy

Add a dependency only when it replaces meaningful, non-domain boilerplate or provides a mature primitive.

Approved categories:

- UI accessibility primitives
- state management
- virtualization
- schema validation
- testing
- parsing where the parser is separately normalized/validated

Do not add:

- a second UI framework
- an all-in-one bioinformatics suite
- a generic AI SDK
- a backend framework
- a chart library solely for the plasmid map
- a sequence viewer that prevents us from implementing the product interaction model
- multiple packages solving the same job

Run `npm ls`/inspect dependency changes before finalizing each phase.

---

# 30. Final architectural rule

The application should always read conceptually as:

```text
Human UI ─┐
          ├──> Application workflows ──> Domain ──> Scientific adapters
WebMCP ───┘
```

Never:

```text
WebMCP → random React setter
UI     → duplicated scientific logic
```

If a WebMCP action cannot be represented as a normal SeqCraft application command, first question whether it belongs in the product.
