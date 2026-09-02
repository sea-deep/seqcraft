# WebMCP Challenge submission kit

This document is the source of truth for the submission text and demo recording. Replace bracketed deployment/video placeholders before submitting.

## Product fit

Molecular biology software is rich in visual state and exact coordinates but difficult for general agents to operate safely. SeqCraft makes a real plasmid/sequence workbench agent-native: the agent can inspect the active construct, navigate the same 2D/3D workspace as the user, run deterministic restriction/PCR/ORF/comparison analysis, and stage a complete restriction-cloning proposal.

WebMCP is essential rather than decorative. Seventeen purpose-built tools expose semantic scientific actions directly from the page. They call the same application workflows as manual controls, update the visible workspace, keep a readable activity history, and preserve human approval for persistent scientific changes.

## What becomes possible

A scientist can ask an agent to find a feature, show its exact region, identify unique enzyme sites, simulate a digest, compare constructs, or prepare a directional clone without translating that intent into dozens of clicks. The user can immediately verify every result in the sequence/map/inspector UI. Raw sequences remain in the browser; the optional Node/Mongo control plane stores only identity and sequence-free metadata.

## WebMCP implementation

- Imperative tools are registered through `document.modelContext.registerTool`.
- Tools are feature-detected and the app remains manually usable without WebMCP.
- Each tool has a bounded JSON schema, an accurate side-effect annotation, structured errors, and an activity entry.
- Imported/user-authored results set `untrustedContentHint`.
- Inspection and analysis are read-only; navigation declares UI mutation; annotation/cloning creates an approval proposal.
- Internal coordinates are 0-based half-open. WebMCP tool coordinates are documented and returned as 1-based inclusive.

## Three-minute demo script

Target length: 2:30–2:50, with narration and visible pointer movement.

1. **0:00–0:20 — problem and privacy.** Open the demo plasmid. State that sequences stay local while the agent receives semantic, bounded capabilities.
2. **0:20–0:40 — discovery.** Ask: “What can you do in SeqCraft, and what needs my approval?” Show `seqcraft_get_capabilities` and the activity drawer.
3. **0:40–1:10 — agent drives the UI.** Ask the agent to find AmpR and show it on the 3D map. Show map, linear sequence, and inspector synchronizing.
4. **1:10–1:40 — deterministic science.** Ask for unique EcoRI/HindIII sites and a simulated digest. Show exact cut coordinates, fragments, and sticky-end chemistry.
5. **1:40–2:30 — ambitious workflow.** Ask the agent to prepare a restriction clone using the demo donor. Show fragment choice, directional compatibility, transferred annotations, and the approval modal. Emphasize that no document changed yet.
6. **2:30–2:50 — close.** Approve the proposal, open the recombinant construct, and state the value: conversational intent, visible scientific proof, private sequence data, human control.

## Submission checklist

- [ ] Public live URL: `[add URL]`
- [ ] Public YouTube demo under three minutes with clear audio: `[add URL]`
- [x] Public GitHub repository containing all source and assets: `https://github.com/sea-deep/seqcraft`
- [x] Open-source license is visible at repository root.
- [x] Setup instructions and optional env contract are documented.
- [x] `document.modelContext.registerTool` implementation is present in source.
- [x] App works free in guest mode without judge credentials.
- [ ] Production response includes `Origin-Agent-Cluster: ?1` and `Permissions-Policy: tools=(self)`.
- [ ] Verify all 17 SeqCraft tools in the judging browser.
- [ ] Run the exact recorded workflow against the public deployment.
- [ ] Fill the live URL, video URL, repo URL, and final screenshots before submission.
