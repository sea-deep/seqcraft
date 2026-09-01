# SeqCraft MVP Features

SeqCraft is a browser-based molecular biology workbench for inspecting DNA/plasmid sequences, planning common cloning/PCR workflows, comparing constructs, and collaborating with an AI agent through WebMCP.

The MVP focuses on the most common sequence/plasmid tasks while keeping the workflow small enough to remain polished and reliable.

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

# MVP Boundaries

The following are intentionally **not** part of the MVP:

- BLAST or remote sequence-database search
- NGS analysis
- Sanger chromatogram viewing
- multiple-sequence alignment
- phylogenetic trees
- CRISPR guide efficacy/off-target prediction
- genome-scale annotation
- codon optimization
- Gibson Assembly
- Golden Gate Assembly
- Gateway cloning
- TOPO cloning
- full arbitrary nucleotide editing
- real-time multiplayer collaboration
- user accounts
- cloud database/storage
- built-in chatbot
- external AI API requirement
- clinical or pathogenicity prediction
- disease interpretation

These can be considered only after the core SeqCraft workflow is complete and reliable.
