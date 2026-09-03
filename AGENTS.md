# SeqCraft Agent Notes

## Non-negotiable contracts
- FEATURES.md controls scope.
- DESIGN.md controls UI/UX.
- IMPLEMENTATION.md controls architecture.
- Internal coordinates are 0-based half-open.
- Persistent agent changes are staged for human approval.

## Current phase
Phase 2 — Scientific Visualization

## Completed
- Phase 0: Repository audit, domain types.
- Phase 1: Documents and Import (AppShell, bio-parsers integration, correctness gates).
- Phase 2 (Linear Viewer): SequenceViewer virtualization, canonical ch-based base geometry, exact circular boundary validation, multi-segment feature separation, programmatic selection store.

## In progress
- Phase 2: Scientific Visualization

## Next
- Circular map integration.

## Decisions
- Linear viewer uses `ch` units and CSS monospace metrics for deterministic coordinate-to-screen mapping instead of pixel measuring.
- Alphabet inference is strictly rule-based based on IUPAC U and T boundaries.
- Circular origin-spanning features are correctly split into two logical segments `[start, len]` and `[0, end]`.

## UI Phase Execution Rule
During UI phases, implement only the atomic task explicitly requested by the user. Do not automatically continue to the next PLAN item. Stop after verification and report the result.

## Workspace Navigation
- Center workspace navigation completed (Sequence, Map, Compare).
- Active view is driven by `useWorkspaceStore` string state.
- Empty states implemented for upcoming Map and Compare modes.
- Next task left unspecified until the next user instruction.

## Inspector Synchronization
- Contextual Inspector completed.
- Precedence model established: Feature > Selection > Document.
- Selected feature architecture implemented, synchronizing visual selection in `SequenceViewer` and right-side metadata.

## 3D Map Rendering
- Installed `three`, `@react-three/fiber`, and `@react-three/drei`.
- Created basic 3D rendering pipeline for the Map view.
- Added `plasmid-geometry.ts` for polar coordinate resolution.
- Rendered basic `<PlasmidRing />` inside `<PlasmidMap3D />`.
- 3D biological feature arcs completed
- canonical clockwise plasmid coordinate mapping
- deterministic overlapping feature lanes
- 3D feature geometry upgraded to flat annular ribbons
- directional 3D feature ribbons completed
- segment-level ribbon component established
- circular biological endpoint semantics verified
- 3D ribbon arrow proportions refined
- 3D feature hover interaction completed
- floating feature labels completed
- Map and Sequence feature selection unified
- 3D persistent selected-feature state completed
- bounded 3D zoom controls completed
- feature-driven camera focus completed
- canonical Map reset view completed
- Sequence and 3D nucleotide selection synchronized
- circular selection geometry established
- coordinate ↔ angle round-trip established
- direct 3D nucleotide selection completed
- circular drag-selection semantics established
- Map and Sequence nucleotide interaction unified
- 3D pointer interaction priority finalized
- feature / nucleotide / camera gestures unified

## Restriction Analysis
- restriction enzyme domain established
- IUPAC-aware linear/circular site detection completed
- restriction cut coordinates normalized
- linear restriction-site track completed
- restriction-site Inspector context completed
- restriction end-type classification established
- 3D restriction-site markers completed
- restriction-site Map/Sequence selection unified
- restriction-site camera focus completed
- restriction digest engine completed
- linear/circular fragment simulation completed
- sticky/blunt digest-end semantics established
- digest-end orientation semantics completed
- sticky ends cloning-ready
- primer domain established
- primer scientific properties completed
- linear/circular exact primer binding completed
- PCR simulation engine completed
- linear/circular amplicon generation completed
- multi-binding PCR ambiguity detection completed
- two-primer PCR participation invariant established
- WebMCP bridge established
- read-only scientific WebMCP tools exposed
- active-document WebMCP context established
- WebMCP activity logging established
- current document.modelContext WebMCP contract adopted
- WebMCP execute callbacks verified
- WebMCP async registration lifecycle verified
- real browser WebMCP discovery verified
- local WebMCP runtime verified
- five SeqCraft tools discovered through document.modelContext
- agent-controlled scientific navigation completed
- focusSequenceRegion / showRestrictionSite / showFeature application commands
- seqcraft_focus_region / seqcraft_show_restriction_site / seqcraft_show_feature WebMCP tools
- eight SeqCraft tools discovered through document.modelContext
- navigation tools use readOnlyHint: false (UI state mutation)
- activity drawer with expandable tool execution history
- real browser agent navigation verified (EcoRI site, AmpR feature, region focus)

## MVP Workflows Completed

- Exact coordinate-aware interval intersection logic established for feature transfer during restriction cloning.

- Circular origin-spanning feature intersections mapped and correctly truncated.

- Open Reading Frame (ORF) scientific discovery logic completed (`nucleotide-sequence` wrapper).

- Multi-frame ORF Visualization (`OrfTrack.tsx`) added to `SequenceViewer`.

- WebMCP `seqcraft_find_orfs` tool established.

## Restriction Cloning
- restriction cloning domain established (proposals, candidates, ends)
- ligation compatibility engine completed (sticky/blunt end analysis)
- restriction cloning planner completed
- vector backbone / insert extraction logic established
- directional insertion simulation (forward/reverse complement logic) completed
- coordinate-aware feature mapping to recombinant circular vector completed
- human-in-the-loop cloning state management established (useCloningStore)
- application-level cloning actions exposed (prepare, approve, cancel)
- WebMCP `seqcraft_list_documents` completed
- WebMCP `seqcraft_prepare_restriction_clone` completed
- agent cloning requests correctly staged awaiting human approval
- `CloningApprovalModal` rendering candidate fragments, lengths, compatibility, and orientation toggle completed
- WebMCP tests expanded to 10 tools
- demo cloning donor generated successfully

## Next-Gen Molecular Biology USPs & WebMCP Extensions
- **Automated Wet-Lab Robotics Opentrons Protocol Compiler**:
  - `src/scientific/opentrons-compiler.ts`, `OpentronsExportDialog.tsx`
  - Generates executable Python scripts (Opentrons API v2.15) for OT-2 and Flex robots.
  - Automatically calculates 10% pipetting dead-volume overages, 24-tube rack coordinates, 96-well reaction maps, and thermocycler elongation timings (30 s/kb).
  - WebMCP tool: `seqcraft_generate_opentrons_protocol`.
- **In-Browser CRISPR Guide Radar & MMEJ Forecaster**:
  - `src/scientific/crispr.ts`, `CrisprDialog.tsx`
  - Scans SpCas9 5′-NGG-3′ PAMs on sense and antisense strands with thermodynamic quality scoring, poly-T transcription termination penalties, and microhomology-mediated end joining (MMEJ) repair deletion forecasting to maximize out-of-frame knockout probability.
  - WebMCP tool: `seqcraft_find_crispr_targets`.
- **Type IIS Golden Gate Assembly & Domestication Engine**:
  - `src/scientific/golden-gate.ts`, `GoldenGateDialog.tsx`
  - Directional multi-fragment scarless assembly (BsaI, BsmBI, BbsI, PaqCI, SapI) with 4nt overhang junction verification and visual error diagnostics.
  - Domestication optimizer eliminates internal recognition sites via synonymous/silent codon mutations that preserve 100% of the amino acid sequence.
  - WebMCP tools: `seqcraft_simulate_golden_gate`, `seqcraft_domesticate_sequence`.
- **Local Biosecurity Motif Pre-Screen**:
  - `src/scientific/biosecurity.ts`, `BiosecurityDialog.tsx`
  - Private, client-side diagnostic comparison against 17 curated k-mer examples; explicitly not a regulatory compliance determination.
  - Generates a JSON diagnostic report with coverage and limitation disclosures; commercial-provider and institutional screening remains required.
  - WebMCP tool: `seqcraft_screen_biosecurity`.
- **Active In-Place Sequence Manipulation Suite**:
  - `src/scientific/sequence-editing.ts`, `SequenceMutatorDialog.tsx`, `workspace-store.ts` (`mutateDocumentSequence`).
  - Supports 5 molecular operations: `insert`, `delete`, `replace`, `reverse_complement`, and `rotate_origin`.
  - Automatic biological coordinate arithmetic: downstream shifts $+L$, upstream invariant, spanning expansions, clipped edges, swallowed feature removal, and circular origin crossing splits.
  - Built-in catalog of standard biological motifs (His-6, FLAG, HA, Myc, TEV, Kozak, T7, (GGGGS)3 linker).
  - WebMCP tools: `seqcraft_edit_sequence`, `seqcraft_rotate_origin`.
- **WebMCP Ecosystem**:
  - Expanded to 24 scientific and agentic tools registered via `window.document.modelContext`.
  - Verified across real browser and unit/integration test suites.

## Interaction & Navigation Hardening
- Cross-route and seven-view editor navigation verified in a real browser at desktop and 390 px widths.
- Dashboard and editor command bars no longer overflow narrow viewports; project and inspector panels collapse at the documented breakpoints and remain mutually exclusive on narrow screens.
- Workspace/document navigation uses semantic, stateful tabs; dashboard documents and 2D map entities are keyboard-operable with accessible names and visible focus.
- Empty dashboard/editor states expose both import and deterministic demo-workspace paths.
- Editor commands are separated into analysis tools and construct workflows, with confirmation for irreversible in-place sequence actions.

## Deployment Notes
- Production deployments must serve `Origin-Agent-Cluster: ?1` and `Permissions-Policy: tools=(self)` to comply with WebMCP isolation requirements.

- real local browser WebMCP registration verified
