# SeqCraft

SeqCraft is a browser-native DNA engineering workbench with deterministic sequence analysis and a structured WebMCP interface that lets browser agents inspect, analyze, navigate, and propose changes to the same molecular model a human is working on.

[![Tests](https://img.shields.io/badge/tests-358%20passed-brightgreen.svg)](test)
[![Test Suites](https://img.shields.io/badge/test%20suites-63%20passed-brightgreen.svg)](test)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](tsconfig.json)
[![WebMCP](https://img.shields.io/badge/WebMCP-24%20tools-teal.svg)](src/webmcp/register-seqcraft-tools.ts)
[![Frontend](https://img.shields.io/badge/live%20app-Render-0F766E.svg)](https://seqcraft.onrender.com)
[![Backend](https://img.shields.io/badge/api-Railway-darkblue.svg)](https://seqcraft.up.railway.app/api/health)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## Capabilities at a Glance

* **Linear and 3D Plasmid Visualization**: Monospace `ch`-metric virtualized sequence rendering alongside a Three.js / WebGL 3D annular ribbon map with lane collision packing, directional feature arrows, and drag-selection.
* **Enzymatic Analysis & Digestion**: IUPAC-aware restriction site recognition for linear and circular topologies, complete with multi-enzyme in vitro digest fragment profiling and sticky/blunt overhang classification.
* **Type IIS Assembly & Domestication**: Directional Golden Gate assembly simulation (BsaI, BsmBI, BbsI, PaqCI, SapI) with cohesive overhang validation and automated synonymous codon substitutions that eliminate internal cut sites without modifying translated reading frames.
* **Thermodynamics, Primers & PCR**: Nearest-neighbor melting temperature ($T_m$) calculations, mismatch and ambiguity detection, and linear/circular amplicon simulation.
* **CRISPR Target Radar & MMEJ Forecasting**: Sense and antisense SpCas9 5′-NGG-3′ PAM scanning, GC content balancing, poly-T transcription termination checks, and microhomology-mediated end joining (MMEJ) repair deletion forecasting.
* **Laboratory Automation & Diagnostic Screening**: Direct Opentrons Python protocol compilation (OT-2 / Flex API v2.15) with dead-volume calculations, and offline heuristic biosecurity motif comparison against curated pathogen signatures.
* **Local-First Privacy Architecture**: All raw sequence bytes, annotations, and derived constructs remain strictly inside the browser runtime (IndexedDB and OPFS). The cloud control plane receives only sequence-free metadata descriptors.
* **Verified Agent Runs with Revision Locking**: 24 WebMCP tools registered via `window.document.modelContext`. Mutating operations stage pre-commit sequence transactions that evaluate biological invariants before requiring explicit human approval.

---

## Why SeqCraft Exists

Traditional molecular biology software interacts almost exclusively through desktop GUIs. While large language models can discuss genetics and design workflows, asking browser agents to operate graphical interfaces through multimodal screenshots or raw string pasting introduces serious failure modes: coordinate offsets drift, reading frames slip, and non-deterministic visual inference replaces mathematical precision.

SeqCraft addresses this by exposing its biological analysis engine directly to browser agents through **WebMCP** (`window.document.modelContext`).

Instead of clicking pixels or parsing screen text, an agent calls typed, developer-authored biological functions. Because human users and browser agents operate against the identical in-memory document model, agents can highlight visual regions, inspect enzyme cut sites, run assembly simulations, and stage sequence modifications directly in the human interface.

---

## WebMCP Integration

SeqCraft exposes 24 structured tools through the emerging WebMCP browser standard. Tools declare typed input schemas, execution constraints, and behavioral annotations (`readOnlyHint`, `untrustedContentHint`).

### Example Agent Trajectory

Consider a human delegating a construct preparation task:

```text
Human:
"Check whether this construct can be assembled with BsaI Golden Gate.
If an internal site blocks assembly, find a protein-preserving repair.
Do not modify the sequence without my approval."
```

The agent executes the following tool trajectory against the active document:

```text
Agent → SeqCraft (WebMCP)
  1. seqcraft_get_active_document
  2. seqcraft_analyze_restriction_sites   → detects 1 internal BsaI site
  3. seqcraft_simulate_golden_gate        → blocked: internal cut generates illegitimate junction
  4. seqcraft_focus_region                → navigates human viewport to internal site [482, 487]
  5. seqcraft_domesticate_sequence        → calculates synonymous GGTCTC → GGCCTC substitution
  6. seqcraft_edit_sequence               → stages SequenceTransaction (awaiting human approval)

Human (SeqCraft UI)
  Reviews staged transaction: CDS translation unchanged, coordinate delta 0 bp, internal site eliminated.
  Clicks "Apply" in approval interface.

Agent → SeqCraft (WebMCP)
  7. seqcraft_analyze_restriction_sites   → confirms 0 BsaI sites remain
  8. seqcraft_simulate_golden_gate        → assembly successful; junctions validated
  9. seqcraft_generate_opentrons_protocol → compiles Python liquid-handling script
```

---

## Verified Agent Run

Every WebMCP call executed in SeqCraft is tracked in an in-memory provenance timeline managed by `useActivityStore` and displayed in the **Agent Run** panel.

```text
✓  get active document            User Plasmid (4,812 bp)
✓  analyze restriction sites      1 site detected (BsaI)
✕  simulate golden gate           assembly blocked: internal cut
✓  focus region                   bases 482–487 highlighted
✓  domesticate sequence           found synonymous mutation (Gly-Leu)
◉  edit sequence                  staged transaction · awaiting human approval
✓  human approve sequence edit    applied · revision 1 → 2
✓  analyze restriction sites      0 sites (BsaI abolished)
✓  simulate golden gate           assembly valid (circular product)
✓  generate opentrons protocol    Python script compiled (OT-2)
```

### Provenance Tracking

For every tool execution, SeqCraft records:
* Call identifier, timestamp, and wall-clock duration in milliseconds.
* Tool name, categorization (`read`, `navigation`, `mutation`, `export`), and execution status (`success`, `error`, `awaiting_approval`, `rejected`).
* Sanitized arguments (nucleotide strings longer than 80 characters are truncated in logs to avoid memory bloat).
* Target `documentId`, `documentRevisionBefore`, and SHA-256 `sequenceHashBefore`.
* Post-execution `documentRevisionAfter` and SHA-256 `sequenceHashAfter` when modifications are applied.

### Pre-Commit Sequence Transactions

When an agent invokes a sequence modification tool (`seqcraft_edit_sequence`), the edit is **not** committed to the sequence buffer immediately. Instead, SeqCraft stages a `SequenceTransaction` object containing:

1. **Base Revision & Hash**: The document version number and SHA-256 hash at the moment of analysis.
2. **Operation Details**: The coordinate range (`start0`, `end0Exclusive`), action type (`insert`, `delete`, `replace`, `reverse_complement`), and replacement sequence.
3. **Biological Invariant Verification**: Before presentation to the user, SeqCraft executes automated checks against the proposed edit:
   * **Sequence Length Delta**: Verifies whether overall nucleotide count changes or coordinates remain stable.
   * **CDS Translation Check**: Translates affected coding sequences before and after mutation using `nucleotide-sequence` to verify whether the alteration is synonymous.
   * **Codon and Amino Acid Context**: Identifies the exact codon substitution (e.g., `GGT` $\rightarrow$ `GGC`) and amino acid effect (e.g., `Gly` $\rightarrow$ `Gly`).
   * **Enzyme Site Verification**: Confirms that the targeted restriction enzyme site is abolished without introducing secondary recognition sites.

### Revision-Locked Safety

If a human user edits the construct or switches documents while a transaction is pending, the transaction detects the discrepancy:

$$\text{activeDoc.version} \neq \text{tx.baseRevision} \quad \lor \quad \text{SHA256}(\text{activeDoc.raw}) \neq \text{tx.baseSequenceHash}$$

The transaction is flagged as `stale`, preventing execution:

```text
Stale transaction: Sequence changed after this proposal was analysed. Re-analysis required.
```

Subsequent verification calls remain independent agent operations logged in the trajectory.

---

## WebMCP Tool Reference

SeqCraft registers exactly 24 tools via `window.document.modelContext.registerTool`:

| Tool Name | Type | Access | Description |
| :--- | :--- | :--- | :--- |
| `seqcraft_get_capabilities` | Discovery | Read-only | Discovers supported workflows, coordinate contracts, privacy rules, and recommended agent call sequences. |
| `seqcraft_get_active_document` | Inspection | Read-only | Returns active construct metadata, topology, length, revision, and feature summaries. |
| `seqcraft_list_documents` | Inspection | Read-only | Lists metadata for all sequence documents in the active workspace. |
| `seqcraft_list_features` | Inspection | Read-only | Returns all annotated features on the active construct. |
| `seqcraft_list_primers` | Inspection | Read-only | Returns all primers associated with the active construct. |
| `seqcraft_detect_known_features` | Discovery | Read-only | Scans construct against canonical plasmid elements (promoters, origins, selection markers). |
| `seqcraft_focus_region` | Navigation | UI State | Highlights and scrolls viewport to a 1-based inclusive nucleotide range `[start1, end1]`. |
| `seqcraft_show_restriction_site` | Navigation | UI State | Navigates the linear and 3D map views to a specific restriction enzyme recognition site. |
| `seqcraft_show_feature` | Navigation | UI State | Centers viewport and selects an annotated sequence feature by identifier or name. |
| `seqcraft_analyze_restriction_sites`| Analysis | Read-only | Scans linear or circular sequences for restriction enzyme cut positions, overhang types, and cut frequencies. |
| `seqcraft_simulate_digest` | Simulation | Read-only | Cleaves construct with one or more enzymes, predicting sorted fragment sizes and terminal overhang compatibilities. |
| `seqcraft_analyze_primer` | Analysis | Read-only | Computes primer length, GC percentage, melting temperature ($T_m$), and binding sites across the construct. |
| `seqcraft_simulate_pcr` | Simulation | Read-only | Simulates linear or circular PCR amplification between forward and reverse primers, detecting ambiguous binding. |
| `seqcraft_find_orfs` | Analysis | Read-only | Detects open reading frames across all 6 translation frames above a minimum codon threshold. |
| `seqcraft_find_crispr_targets` | Analysis | Read-only | Identifies SpCas9 5′-NGG-3′ PAM sites, calculates GC balance scores, and forecasts MMEJ repair deletion profiles. |
| `seqcraft_simulate_golden_gate` | Simulation | Read-only | Simulates multi-part Type IIS assembly (BsaI, BsmBI, BbsI, PaqCI, SapI) with 4nt overhang compatibility checks. |
| `seqcraft_compare_documents` | Comparison | Read-only | Performs circular-invariant, reverse-complement-aware diffing between reference and query documents. |
| `seqcraft_domesticate_sequence` | Engineering| Read-only | Proposes silent synonymous mutations to eliminate internal restriction sites without changing amino acid translations. |
| `seqcraft_generate_opentrons_protocol`| Automation| Export | Compiles Python protocol scripts (API v2.15) for Opentrons OT-2 and Flex liquid handlers. |
| `seqcraft_screen_biosecurity` | Diagnostics| Read-only | Executes client-side diagnostic comparison against curated k-mer sequences of regulated pathogens. |
| `seqcraft_propose_annotation` | Annotation | Staged Mutation | Stages a new sequence feature annotation proposal for human review. |
| `seqcraft_prepare_restriction_clone`| Assembly | Staged Mutation | Stages a directional restriction cloning construct proposal for human review. |
| `seqcraft_edit_sequence` | Mutation | Staged Mutation | Stages an in-place insertion, deletion, replacement, or reverse-complement transaction for human review. |
| `seqcraft_rotate_origin` | Topology | Staged Mutation | Re-indexes position 1 of a circular plasmid to a new coordinate (requires human approval). |

---

## Scientific Capabilities

| Area | Capabilities | Implementation |
| :--- | :--- | :--- |
| **Coordinate System** | 0-based half-open `[start, end)` internally; 1-based inclusive `[start, end]` in UI & WebMCP. Origin-spanning circular features partitioned into canonical `[start, len)` and `[0, end)` segments. | `src/domain/document.ts`<br/>`src/scientific/canonical-sequence.ts` |
| **Restriction Enzymes** | IUPAC nucleotide pattern matching across standard NEB/Thermo libraries; categorizes 5′ overhangs, 3′ overhangs, and blunt termini; linear and circular cut mapping. | `src/scientific/restriction-analysis.ts`<br/>`src/data/restriction-enzymes.ts` |
| **In Vitro Digestion** | Multi-cut cleaving, fragment sizing, sticky-end orientation, and terminal overhang matching. | `src/scientific/digest.ts`<br/>`src/scientific/digest-ends.ts` |
| **PCR & Primers** | SantaLucia nearest-neighbor thermodynamic $T_m$ calculation, GC content evaluation, mismatch tolerance, multi-binding ambiguity detection, linear and circular amplicon prediction. | `src/scientific/pcr.ts`<br/>`src/scientific/primer-binding.ts`<br/>`src/scientific/primer-properties.ts` |
| **Translation & ORFs** | Six-frame translation (standard genetic code 1), circular wrap-around ORF detection, customizable minimal codon cutoffs. Powered by `nucleotide-sequence`. | `src/scientific/orf.ts`<br/>`src/scientific/protein-consequences.ts` |
| **Golden Gate Assembly** | Multi-fragment Type IIS assembly simulation (BsaI, BsmBI, BbsI, PaqCI, SapI) with 4nt overhang fidelity verification. Synonymous codon domestication preserving amino acid sequences. | `src/scientific/golden-gate.ts`<br/>`src/scientific/transaction-invariants.ts` |
| **CRISPR & MMEJ** | 20nt SpCas9 guide scanning with 5′-NGG-3′ PAM, GC balance scoring (40–60% optimal), poly-T run penalties ($T \ge 4$), and microhomology alignment forecasting deletion profiles. | `src/scientific/crispr.ts` |
| **Robotics Automation** | Executable Python protocol generation for Opentrons OT-2 and Flex robots (API v2.15), automated 10% dead-volume overage calculations, 24-tube rack layouts, and thermocycler ramp/elongation timing. | `src/scientific/opentrons-compiler.ts` |
| **Biosecurity Pre-Screen** | Offline diagnostic comparison against 17 curated pathogenic k-mer signatures. Generates structured JSON diagnostic reports with scope disclosures. | `src/scientific/biosecurity.ts` |
| **Construct Comparison** | Alignment engine invariant to circular origin shifts and reverse-complement orientation. Identifies insertions, deletions, substitutions, and coding consequence impacts. | `src/scientific/biological-sequence-diff.ts`<br/>`src/workers/sequence-diff.worker.ts` |

Detailed mathematical formulations, thermodynamic parameters, and coordinate contracts are documented in [docs/FEATURES.md](docs/FEATURES.md) and the in-app Reference Manual (`/docs`).

---

## Browser-Native Architecture

SeqCraft operates on a local-first model where biological sequence computations happen directly within the client browser.

```mermaid
flowchart LR
    subgraph Browser["Browser Runtime (Private Boundary)"]
        H["Human User"] --> UI["SeqCraft React Workspace"]
        A["Browser Agent"] -->|WebMCP Tools| MC["window.document.modelContext"]
        MC --> REG["WebMCP Registry & Activity Logger"]
        REG --> TX["SequenceTransaction & Invariant Engine"]
        TX -->|Human Gate| MOD["Approval Modal"]
        MOD -->|Commit| WS["Workspace Store (Zustand)"]
        UI --> WS
        WS --> SE["Deterministic Sequence Engine"]
        SE --> W["Web Workers\n(FASTA Stream / Sequence Diff)"]
        WS --> IDB[("IndexedDB (idb-keyval)\nDocument Metadata & Sequences")]
        SE --> OPFS[("Origin Private File System\nChunked Sequence Storage")]
    end
    subgraph Cloud["Cloud Control Plane (Optional Sync)"]
        WS -.->|Sync Metadata Only\nStrict 32KB JSON Body| API["Express Server & Better Auth"]
        API --> DB[("MongoDB Atlas\nProject Descriptors Only")]
    end
```

### Architectural Boundaries

* **Unified Domain Core**: The user interface and WebMCP tools call the identical scientific functions and Zustand store actions. An agent cannot perform actions that the underlying domain engine does not support.
* **Web Worker Concurrency**: Computationally intensive tasks run on dedicated background threads:
  * `fasta-importer.worker.ts`: Streams large FASTA files directly into OPFS without blocking the UI thread.
  * `sequence-diff.worker.ts`: Computes Myers diffs and circular alignments off the main thread.
* **Local Sequence Storage**: Sequence bytes and feature tables are persisted exclusively inside the browser:
  * In-memory documents: Stored in IndexedDB via `idb-keyval`.
  * Large chunked documents: Streamed and stored in the Origin Private File System (OPFS).
* **Strict Network Privacy Boundary**: Biological sequence strings, imported file bodies, derived constructs, digests, and trace files **never** leave the browser. The Express backend and MongoDB database handle user authentication (Better Auth) and project metadata descriptors only:
  ```typescript
  // Allowed server document descriptor (server/privacy/project-metadata.ts)
  {
    id: string;
    name: string;
    length: number;
    alphabet: 'dna' | 'rna' | 'mixed' | 'protein' | 'unknown';
    topology: 'linear' | 'circular';
    localStorageKey: string; // opaque client-side reference
  }
  ```
  This constraint is strictly validated by Zod schemas and enforced by a 32 KB request body limit on all API routes. There is no document or sequence upload endpoint.

---

## Sequence Transactions and Safety

To prevent silent biological degradation, mutating operations require human authorization.

```text
PROPOSED SEQUENCE TRANSACTION
Position:           1,482
Change:             A → C
DNA:                GGTCTC → GGCCTC
Protein:            Gly-Leu → Gly-Leu (✓ synonymous, translation unchanged)
Length:             4,812 bp → 4,812 bp (delta: 0 bp)
Coordinates:        ✓ feature coordinates stable
Enzyme sites:       BsaI: 1 → 0 (abolished)
Base revision:      1 (SHA-256: e3b0c44298fc...)
Status:             awaiting human approval
```

### Safety Guarantees

* **Deterministic Invariant Checks**: Every staged edit evaluates protein coding consequences across overlapping CDS features before the human review dialog opens.
* **Revision and Hash Locking**: Staged transactions capture the document version number and sequence SHA-256 digest at creation time. If the underlying sequence changes before approval, the transaction is immediately invalidated as stale.
* **Coordinate Stability Verification**: Insertions and deletions shift downstream feature coordinates using validated interval arithmetic (`src/scientific/sequence-editing.ts`), while substitutions preserve exact feature coordinate parity.

---

## Quick Start

### Hosted Deployments

* **Frontend Application**: [https://seqcraft.onrender.com](https://seqcraft.onrender.com)
* **Backend API**: [https://seqcraft.up.railway.app](https://seqcraft.up.railway.app) (Health check: [`/api/health`](https://seqcraft.up.railway.app/api/health))

### Prerequisites

* Node.js 20.0.0 or higher
* npm 10.0.0 or higher

### Installation & Local Run

```bash
# Clone the repository
git clone https://github.com/sea-deep/seqcraft.git
cd seqcraft

# Install dependencies
npm install

# Run frontend (port 5173) and backend API (port 8787) concurrently
npm run dev:all
```

Open `http://localhost:5173` in your browser.

Without backend configuration or credentials, SeqCraft runs in **guest mode**, using local browser storage (IndexedDB and OPFS) with full scientific and WebMCP functionality.

---

## Using WebMCP

SeqCraft registers tools via `window.document.modelContext`.

### Browser Environment

* **Supported Browsers**: WebMCP is currently available in experimental Chromium builds supporting the Model Context API, or in any modern browser via the included `@mcp-b/webmcp-polyfill` (initialized automatically at application bootstrap).
* **Security Headers**: In production deployments, reverse proxies must serve:
  ```http
  Origin-Agent-Cluster: ?1
  Permissions-Policy: tools=(self)
  ```

### Inspecting WebMCP via DevTools

You can inspect the active WebMCP registry directly in the browser developer console:

```javascript
// Check WebMCP runtime registration status
await window.__SEQCRAFT_WEBMCP__.status();
// Returns: { available: true, registered: true, secureContext: true, modelContextAvailable: true }

// List all 24 registered SeqCraft tools and schemas
await window.__SEQCRAFT_WEBMCP__.listTools();

// Or access document.modelContext directly
await document.modelContext.getTools();
```

---

## Development

```bash
# Run unit and integration tests (63 test files, 358 tests)
npm test

# Build client and server bundles
npm run build

# Build client bundle only
npm run build:client

# Typecheck server codebase
npm run typecheck:api
```

---

## Project Structure

```text
seqcraft/
├── src/
│   ├── domain/           # Core biological and application domain types
│   ├── scientific/       # 23 deterministic biological analysis modules
│   │   ├── restriction-analysis.ts   # IUPAC restriction recognition
│   │   ├── golden-gate.ts            # Type IIS assembly & domestication
│   │   ├── pcr.ts                    # Thermodynamic primer & PCR simulation
│   │   ├── crispr.ts                 # SpCas9 PAM radar & MMEJ forecaster
│   │   ├── opentrons-compiler.ts     # Liquid-handling protocol generation
│   │   ├── biosecurity.ts            # Diagnostic pathogen motif scan
│   │   ├── sequence-editing.ts       # Coordinate interval arithmetic
│   │   └── transaction-invariants.ts # Pre-commit invariant evaluation
│   ├── webmcp/           # 24 WebMCP tools registered via document.modelContext
│   ├── storage/          # Browser persistence (OPFSBackend & IndexedDB)
│   ├── workers/          # Web Workers for streaming FASTA and sequence diffs
│   ├── state/            # Zustand state stores (workspace, activity, cloning)
│   ├── components/       # React UI components
│   │   ├── sequence/     # Virtualized monospace sequence viewer
│   │   ├── map/          # Three.js 3D plasmid & 2D circular canvas
│   │   └── agent-run/    # Activity timeline & transaction review panel
│   └── pages/            # Top-level application routes & documentation
├── server/               # Express backend with Better Auth & MongoDB Atlas
│   ├── app.ts            # Server endpoints with 32KB request limit
│   └── privacy/          # Strict Zod schemas enforcing zero sequence exposure
├── docs/                 # Engineering specifications
│   ├── FEATURES.md       # Functional scope & scientific contracts
│   ├── DESIGN.md         # Design system, tokens, and UX guidelines
│   └── IMPLEMENTATION.md # Architecture, state flow, and coordinate models
├── test/                 # Test suite (63 test files, 358 tests)
├── SECURITY.md           # Data boundary & disclosure policy
└── package.json          # Dependencies and scripts
```

---

## Integration with `nucleotide-sequence`

SeqCraft uses the separately published [`nucleotide-sequence`](https://www.npmjs.com/package/nucleotide-sequence) npm package (v2.0.0) as its foundational nucleotide parsing and translation library.

```bash
npm install nucleotide-sequence
```

Example usage within SeqCraft:

```typescript
import { Seq, Translation } from 'nucleotide-sequence';

// Initialize biological sequence with strict IUPAC validation
const dna = new Seq('DNA').read('ATGGGTCTCTAA');

// Deterministic translation using standard genetic code
const protein = Translation.translate(dna, 1);
console.log(protein); // "MGL*"
```

`nucleotide-sequence` powers SeqCraft's codon substitution validation, reading frame alignment, and IUPAC degenerate base handling.

---

## Scientific Scope and Limitations

* **Genetic Code Assumptions**: Open reading frame detection and CDS verification currently assume standard genetic code 1 (canonical nuclear eukaryotic / bacterial translation table). Alternative genetic codes (e.g., mitochondrial, mycoplasma) are not yet configurable.
* **Thermodynamic PCR Parameters**: Melting temperatures ($T_m$) are calculated using nearest-neighbor enthalpy and entropy parameters under standard monovalent cation conditions. They serve as in silico estimates and do not replace physical annealing temperature gradient optimization in the wet lab.
* **CRISPR Scoring Boundaries**: CRISPR guide evaluation identifies SpCas9 5′-NGG-3′ PAM sites, flags GC imbalance, checks for poly-T termination signals, and forecasts microhomology-mediated repair deletion patterns. It does not perform genome-wide off-target mismatch alignment searches.
* **Biosecurity Pre-Screening Scope**: The biosecurity screening tool is an offline diagnostic check comparing k-mer substrings against 17 curated pathogenic and toxin signatures. **It does not constitute regulatory compliance screening.** Commercial gene synthesis providers and institutions must continue to perform formal biosecurity screening under applicable national and international regulatory frameworks.
* **Coordinate Invariant**: Internal data structures use 0-based half-open intervals `[start, end)`. User-facing interfaces, dialogs, and WebMCP parameters accept 1-based inclusive intervals `[start, end]` unless specifically labeled otherwise.

---

## Documentation

* [docs/FEATURES.md](docs/FEATURES.md) — Functional scope, biological domain rules, and capability matrix.
* [docs/DESIGN.md](docs/DESIGN.md) — UI architecture, visual tokens, and responsive layout guidelines.
* [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) — System architecture, state management, and coordinate flow.
* [SECURITY.md](SECURITY.md) — Security policy, privacy boundary specifications, and vulnerability disclosure.

---

## Contributing

Contributions are welcome. Please ensure that all tests pass (`npm test`) and the project builds cleanly (`npm run build`) before opening a pull request.

---

## Security

SeqCraft enforces an isolated local data boundary: biological sequence strings, annotations, and derived constructs remain strictly in browser storage and are never transmitted to any external server. For security inquiries or vulnerability reports, please consult [SECURITY.md](SECURITY.md).

---

## License

This project is licensed under the [MIT License](LICENSE).
