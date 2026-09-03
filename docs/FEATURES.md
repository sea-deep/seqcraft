# SeqCraft Product Features

SeqCraft is a browser-based molecular biology workbench for inspecting DNA/plasmid sequences, planning common cloning/PCR workflows, comparing constructs, and collaborating with an AI agent through WebMCP.

The scientific MVP focuses on the most common sequence/plasmid tasks while keeping the workflow small enough to remain polished and reliable. The product release adds an optional account/control plane without weakening the local-first scientific workspace.

## Product platform contract

SeqCraft is a hybrid local-first application:

- Raw nucleotide/amino-acid sequence bytes, imported files, derived constructs, and base-level selections remain in browser-owned storage and memory.
- A Node.js API may store identity, profile, project metadata, preferences, redacted agent activity, and document descriptors that contain no sequence content.
- MongoDB Atlas is metadata-only. Sequence text, sequence chunks, file blobs, feature qualifier values that may contain sequence, and analysis payloads derived closely enough to reconstruct a sequence are forbidden.
- Authentication is optional for the deterministic demo and local scientific workspace. Accounts unlock cross-device preferences and metadata sync; they are not a prerequisite for judging or basic use.
- Google sign-in is supported when server credentials are configured. Missing secrets must produce an honest disabled/configuration state, never simulated production auth.
- Scientific work runs locally by default in deterministic browser workers. Server-side jobs are allowed only for bounded non-sequence work or an explicit future opt-in workflow with a separate privacy review.
- Every persistent agent-authored scientific change remains staged for human approval.

This contract is enforced at API schemas, persistence repositories, logging, and tests—not only in copy.

---

## 1. Sequence Workspace

- Open multiple sequence documents in one workspace.
- Switch between active sequences.
- Built-in demo plasmid and insert sequences for instant testing.
- Import:
  - FASTA
  - GenBank
  - raw DNA sequence
- Display basic sequence information:
  - name
  - length
  - topology: linear or circular
  - DNA/RNA classification
  - GC content
  - ambiguous-base count
- Rename imported sequences.
- Remove sequences from the workspace.

---

## 2. Sequence Visualization

### Linear Sequence View

- Base-by-base nucleotide display with coordinates.
- Fixed-width grouped sequence layout for readability.
- Select nucleotide ranges.
- Highlight selected regions.
- Navigate directly to a coordinate or feature.
- Display sequence-related tracks for:
  - annotations/features
  - primers
  - restriction sites
  - ORFs
- Display translation for a selected coding region.

### Circular Plasmid Map

- Circular map for circular DNA/plasmids.
- Display annotated features around the plasmid.
- Display primers.
- Display selected restriction sites.
- Display currently selected sequence region.
- Select a feature directly from the map.
- Circular map and linear sequence view remain synchronized.

---

## 3. Features and Annotations

- Display imported GenBank features.
- Support common feature types:
  - CDS
  - gene
  - promoter
  - terminator
  - origin
  - resistance marker
  - tag
  - miscellaneous feature
- Inspect feature:
  - name
  - type
  - coordinates
  - strand
  - length
  - notes/qualifiers
- Manually create annotations from a selected region.
- Edit annotation name/type/details.
- Delete annotations.
- Support forward and reverse-strand annotations.
- Highlight a feature in both map and sequence views.
- Small built-in known-feature library for auto-detecting common plasmid features.
- Auto-detection is limited to deterministic known-sequence matches and is not presented as gene prediction.
- Exact known-feature scanning checks both strands and circular origin-spanning matches, presents review-before-apply in the Features workspace, and is available read-only to WebMCP agents.

---

## 4. Restriction Enzyme Analysis

- Search a curated set of commonly used restriction enzymes.
- Show recognition sequence for each enzyme.
- Find restriction sites in the active sequence.
- Correctly handle circular plasmids.
- Display site count per enzyme.
- Filters for:
  - unique cutters
  - enzymes cutting once or twice
  - all selected enzymes
- Highlight restriction sites on the sequence.
- Show selected restriction sites on the plasmid map.
- Navigate from a restriction-site result to its exact location.
- Simulate restriction digest.
- Display resulting fragment sizes and cut positions.

---

## 5. Primer Tools

- Create forward or reverse primers from a selected sequence region.
- Display primers directly on the sequence.
- Primer properties:
  - name
  - strand
  - annealing sequence
  - optional 5' extension
  - binding coordinates
  - length
  - GC content
  - melting temperature
  - molecular weight
- Clearly separate the 5' extension from the template-binding region.
- Find primer binding sites on a sequence.
- Edit primer name and sequence details.
- Delete primers.

---

## 6. Primer Pairs and PCR Simulation

- Pair a forward and reverse primer.
- Verify primer orientation.
- Show predicted amplicon boundaries.
- Display:
  - amplicon length
  - forward-primer Tm
  - reverse-primer Tm
  - Tm difference
- Simulate the expected PCR product.
- Include 5' primer extensions in the resulting simulated product.
- Highlight the amplicon in the sequence view.
- Extract/open the simulated PCR product as a new sequence document.

---

## 7. ORF and Translation Analysis

- Find structural open reading frames across all six frames.
- Display ORFs as tracks over the sequence.
- Show:
  - strand
  - frame
  - coordinates
  - nucleotide length
- Support the validated genetic-code tables available in the sequence engine:
  - NCBI Table 1
  - NCBI Table 2
  - NCBI Table 11
- Translate a selected nucleotide region.
- Display nucleotide and amino-acid sequences together.
- ORFs are explicitly presented as structural ORFs, not predicted genes.

---

## 8. Sequence Comparison

- Compare two sequence documents.
- Align related sequences.
- Highlight:
  - substitutions
  - insertions
  - deletions
- Navigate through individual differences.
- Show the affected coordinates.
- Keep reference annotations visible while examining differences.
- Select a difference to focus the corresponding region in both sequences.
- Suitable for comparing expected and modified/observed constructs.
- Circular comparison is invariant to equivalent origin rotations and reverse-complement orientation.
- Diff annotations alongside bases and report affected CDS/protein consequences.
- Render a deterministic canonical 2D circular map with origin marker, separate reference/query feature tracks, strand arrows, diff highlights, and collision-managed labels.
- Produce structured geometry for SVG/canvas and stable JSON manifests for future Git/Gen integrations.
- Run canonicalization, alignment, annotation diffing, consequence analysis, and geometry generation outside the main UI thread.

---

## 9. PCR / Restriction-Cloning Planner

A focused cloning workflow for replacing or inserting a DNA region using PCR and restriction sites.

- Select:
  - backbone sequence
  - insert sequence
  - target region/feature
- Inspect restriction sites around the target region.
- Check whether candidate enzymes cut inside the insert.
- Choose compatible restriction sites.
- Design primer extensions containing the selected restriction sites.
- Review primer properties.
- Simulate the insert PCR product.
- Preview the proposed assembled construct.
- Verify:
  - insert orientation
  - junction sequence
  - reading frame where relevant
  - selected restriction sites
- Keep proposed construct changes separate from the current document until approved.
- Open the approved construct as a new sequence document.

The MVP includes this single cloning workflow. Other cloning methods are outside scope.

---

## 10. Agent Collaboration

SeqCraft exposes meaningful scientific actions to compatible WebMCP agents while keeping the same workspace usable manually.

The agent can:

- inspect the current workspace
- inspect sequence metadata
- inspect bounded sequence regions
- navigate/focus a sequence region
- list and inspect annotations
- find known features
- find restriction sites
- simulate restriction digests
- inspect/analyse primers
- find primer binding sites
- simulate PCR
- find ORFs
- translate sequence regions
- compare sequences
- propose annotations
- assist with the PCR/restriction-cloning workflow

### Human Approval

Agent actions that only inspect or navigate may happen immediately.

Persistent scientific/document changes are staged first, including:

- new annotations
- proposed construct changes

The user can:

- review
- apply
- reject

before the document is changed.

---

## 11. Agent Activity

- Collapsible agent activity panel.
- Show recent agent actions in order.
- Show success, failure, or awaiting-approval state.
- Expand an action to inspect important inputs/results.
- Surface errors in understandable language.
- Clearly show when an agent proposal is waiting for human approval.

---

## 12. Search and Navigation

- Search by:
  - sequence coordinate
  - feature name
  - primer name
  - restriction enzyme
  - nucleotide motif
- Jump directly to a matching region.
- Keep map, sequence view, and inspector synchronized with the current selection.

---

## 13. Demo Content

Ship with a deterministic demo workspace containing:

- a circular plasmid containing common annotated features
- a replaceable coding feature such as GFP
- an insert sequence such as mCherry
- suitable restriction sites
- example primers
- at least one construct comparison

The demo data must support the complete headline workflow without external services.

---

## 14. Next-Generation Molecular Biology Extensions (Client-Side USPs)

Client-side extensions implemented in SeqCraft adhering to the zero-cloud sequence privacy contract:

- **Type IIS Golden Gate Assembly & Domestication Engine**:
  - Multi-part Golden Gate assembly simulation for BsaI, BsmBI, BbsI, PaqCI, and SapI.
  - Automated domestication scanner detecting and mutating internal recognition sites.
  - Silent/synonymous mutation priority preserving 100% coding integrity.
- **In-Browser CRISPR Guide Radar & MMEJ Forecaster**:
  - Scanning of SpCas9 5'-NGG-3' protospacer adjacent motifs across sense and antisense strands, including circular origin-crossing windows.
  - Microhomology-mediated end joining (MMEJ) deletion forecasting and out-of-frame probability modeling.
- **Automated Robotics Protocol Compiler**:
  - Automated Opentrons OT-2 and Flex Python script synthesis with dead-volume calculation, 24-tube rack coordinates, and thermocycler elongation timings.
- **Dual-Use Biosecurity Screener**:
  - 100% client-side pre-order screening against HHS/USDA Select Agents and IGSC standards with downloadable compliance audit records.
- **In-Place Sequence Modification Suite**:
  - Local molecular transformations (insert, delete, replace, reverse complement, rotate origin) with deterministic coordinate transformation and strict human-in-the-loop staged approval.

---

# MVP Boundaries

The following are intentionally **not** part of the MVP:

- BLAST or remote sequence-database search
- NGS analysis
- Sanger chromatogram viewing
- multiple-sequence alignment
- phylogenetic trees
- genome-scale annotation
- Gateway cloning
- TOPO cloning
- real-time multiplayer collaboration
- cloud storage of raw or derived biological sequences
- server-side sequence computation without an explicit, separately reviewed opt-in privacy flow
- built-in chatbot
- external AI API requirement
- clinical or pathogenicity prediction
- disease interpretation

These can be considered only after the core SeqCraft workflow is complete and reliable.
