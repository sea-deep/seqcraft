# SeqCraft

SeqCraft is a local-first molecular biology workbench and WebMCP agent runtime. It provides sequence visualization, construct engineering, and cloning analysis, exposing 24 declarative tools to browser-integrated AI agents via `window.document.modelContext`.

[![Tests](https://img.shields.io/badge/tests-342%20passed-brightgreen.svg)](test)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](tsconfig.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/frontend-Render-black.svg)](https://seqcraft.onrender.com)
[![Backend](https://img.shields.io/badge/backend-Railway-darkblue.svg)](https://seqcraft.up.railway.app)

---

## Architectural Principles

### 1. Zero Sequence Exposure to Cloud Services
Biological sequence bytes (nucleotides and annotations) remain exclusively inside the browser runtime:
- In-memory execution in client React state and Web Workers.
- Persistent local storage via the Origin Private File System (OPFS) and IndexedDB (`idb-keyval`).
- The cloud backend (Express, Better Auth, MongoDB Atlas) manages user identity, sessions, and sequence-free project descriptors (name, length, topology, opaque local storage key). Raw sequence data is never transmitted to or stored on the server.

### 2. Coordinate Invariant & Circular Topology
- **Internal Model**: 0-based half-open intervals `[start, end)`.
- **User Interface & WebMCP Tools**: 1-based inclusive intervals `[start, end]`.
- **Origin-Spanning Features**: Circular plasmids crossing the index boundary are partitioned into canonical segments: `[start, length)` and `[0, end)`.
- **In-Place Mutation Arithmetic**: Insertions, deletions, substitutions, and origin rotations dynamically shift, trim, split, or remove downstream feature intervals according to biological boundaries.

### 3. Human Approval Gate for Persistent Agent Operations
- Inspection, analysis, and simulation tools execute idempotently with `readOnlyHint: true`.
- Workspace navigation tools mutate UI state with `readOnlyHint: false`.
- Construct creation and sequence editing stage a persistent proposal that requires explicit confirmation in the approval modal before modifying storage.

---

## Capabilities

| Capability | Module | Description |
| :--- | :--- | :--- |
| **Linear Viewer** | `src/components/sequence/SequenceViewer.tsx` | Virtualized rendering using monospace `ch` coordinate-to-screen metrics. Visualizes forward/reverse strands, translation frames, restriction cut sites, and ORFs. |
| **3D Plasmid Map** | `src/components/map/PlasmidMap3D.tsx` | WebGL canvas rendered via Three.js and `@react-three/fiber`. Polar coordinate ribbon arcs with directional terminal arrows, lane collision packing, and nucleotide drag-selection. |
| **Restriction Analysis** | `src/scientific/restriction-analysis.ts` | IUPAC-aware restriction site identification for linear and circular molecules. Classifies 5' overhang, 3' overhang, and blunt termini. |
| **In Vitro Digest Simulation** | `src/scientific/digest.ts` | Simulates multi-enzyme enzymatic cleavage, generating sorted linear fragment profiles with sticky/blunt overhang designations. |
| **Primer Binding & PCR** | `src/scientific/pcr.ts` | Nearest-neighbor thermodynamics, exact matching, mismatch detection, and multi-binding ambiguity detection. Linear and circular amplicon prediction. |
| **ORF Detection** | `src/scientific/orf.ts` | Six-frame open reading frame discovery across linear and circular topologies with configurable minimal codon thresholds. |
| **CRISPR Target Radar & MMEJ** | `src/scientific/crispr.ts` | Scans SpCas9 5'-NGG-3' PAMs on sense and antisense strands. Scores targets by GC balance, poly-T transcription hazards, and forecasts microhomology-mediated end joining (MMEJ) repair deletion profiles. |
| **Golden Gate Assembly** | `src/scientific/golden-gate.ts` | Simulates Type IIS directional assembly (BsaI, BsmBI, BbsI, PaqCI, SapI) with 4nt overhang compatibility verification. Proposes synonymous codon substitutions for domestication without altering amino acid translations. |
| **Opentrons Protocol Compiler** | `src/scientific/opentrons-compiler.ts` | Generates executable Python scripts (Opentrons API v2.15) for OT-2 and Flex liquid-handling robots. Calculates dead-volume overages, 24-tube rack layouts, and thermocycler ramp/elongation timing. |
| **Biosecurity Motif Screening** | `src/scientific/biosecurity.ts` | Client-side diagnostic comparison against curated k-mer references. Generates heuristic diagnostic reports for pre-synthesis evaluation. |
| **Construct Comparison** | `src/application/sequence-diff.ts` | Alignment and diff engine invariant to circular origin shifting and reverse-complement inversion. Identifies insertions, deletions, substitutions, and coding consequence shifts. |

---

## WebMCP Tool Interface

SeqCraft registers 24 structured tools via the browser's `document.modelContext.registerTool` API:

```
seqcraft_get_capabilities            Inspect registered tools, workflows, and approval requirements.
seqcraft_get_document_info           Retrieve active document metadata, length, topology, and features.
seqcraft_list_documents              List metadata for all documents in the active workspace.
seqcraft_focus_region                Navigate and highlight a 1-based nucleotide region [start1, end1].
seqcraft_show_restriction_site       Navigate to a specific restriction enzyme recognition site.
seqcraft_show_feature                Focus and select an annotated sequence feature by name.
seqcraft_find_known_features         Identify canonical plasmids, promoters, origins, and resistance markers.
seqcraft_detect_restriction_sites    Scan sequence for recognition sites across standard enzymes.
seqcraft_simulate_restriction_digest Cleave construct into fragments and compute terminal overhangs.
seqcraft_analyze_primers             Evaluate primer GC content, melting temperature (Tm), and binding sites.
seqcraft_simulate_pcr                Simulate linear or circular PCR amplification between two primers.
seqcraft_find_orfs                   Identify open reading frames across 6 frames above a codon limit.
seqcraft_find_crispr_targets         Scan for SpCas9 PAMs, score efficiency, and predict MMEJ deletions.
seqcraft_simulate_golden_gate        Simulate multi-part Type IIS Golden Gate assembly with overhang validation.
seqcraft_domesticate_sequence        Propose synonymous silent mutations to eliminate internal restriction sites.
seqcraft_generate_opentrons_protocol Compile Python protocol for Opentrons OT-2 / Flex robots.
seqcraft_screen_biosecurity          Run local heuristic diagnostic k-mer scan against regulated agent motifs.
seqcraft_compare_constructs          Run circular-invariant diff between reference and query documents.
seqcraft_prepare_restriction_clone   Stage a directional restriction cloning proposal for human approval.
seqcraft_propose_feature_annotation  Stage a feature annotation addition for human approval.
seqcraft_create_document             Create a new sequence document in the active workspace.
seqcraft_edit_sequence               Execute in-place insertion, deletion, replacement, or reverse-complement.
seqcraft_rotate_origin               Re-index a circular plasmid to a new 1-based start coordinate.
seqcraft_export_document             Export construct as FASTA, GenBank, or sequence-free JSON manifest.
```

---

## Quick Start

### Prerequisites
- Node.js 20.0.0 or higher
- npm 10.0.0 or higher

### Local Development

```bash
# Install dependencies
npm install

# Run frontend dev server (default port 5173) and backend (port 8787)
npm run dev:all
```

Navigate to `http://localhost:5173`. Without environment variables, SeqCraft operates in guest mode with local browser storage.

### Testing and Validation

```bash
# Run unit and integration tests (59 test suites, 342 tests)
npm test

# Run TypeScript compilation and production bundle build
npm run build

# Run ESLint validation
npm run lint
```

---

## Production Deployment

SeqCraft is decoupled into a static Single Page Application (frontend) and an API server (backend).

### Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment identifier (`development`, `test`, `production`) | `development` |
| `PORT` | API server listen port | `8787` |
| `APP_ORIGIN` | Allowed client origin for CORS and session validation | `http://localhost:5173` |
| `BETTER_AUTH_URL` | Canonical public backend URL | `http://localhost:8787` |
| `BETTER_AUTH_SECRET` | 32+ character signing key for session tokens and state | None |
| `MONGODB_URI` | MongoDB connection string (stores identity and project metadata) | None |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | None |
| `GOOGLE_CLIENT_SECRET`| Google OAuth client secret | None |
| `ALLOWED_ORIGINS` | Comma-separated list of additional allowed cross-site origins | None |

### Required Security Headers for WebMCP
Production reverse proxies must serve these headers to satisfy WebMCP isolation requirements:

```http
Origin-Agent-Cluster: ?1
Permissions-Policy: tools=(self)
```

### Production Start

```bash
npm run build
NODE_ENV=production npm start
```

---

## Documentation

Detailed architecture specifications and contracts are located in the `docs/` directory:

- [docs/FEATURES.md](docs/FEATURES.md): Functional boundaries and scientific capabilities.
- [docs/DESIGN.md](docs/DESIGN.md): User interface, color tokens, and layout guidelines.
- [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md): Technical architecture and state flow.
- [SECURITY.md](SECURITY.md): Security policy and vulnerability disclosure.

---

## License

[MIT](LICENSE)
