# SeqCraft Design System

SeqCraft should feel like a **scientific desktop tool in the browser**: precise, calm, information-dense, and predictable. The UI exists to help users inspect sequences and make decisions, not to decorate the data.

---

## 1. Core design principles

1. **Data first.** Sequence, coordinates, features, primers, restriction sites, and comparisons get visual priority.
2. **Dense, not cramped.** Prefer compact controls and fewer containers over large cards and excessive whitespace.
3. **One visual hierarchy.** Page shell → active document → scientific data → secondary metadata.
4. **State must be obvious.** Selected sequence, selected region, active tool, staged agent change, and unsaved state must never be ambiguous.
5. **Human and agent share the same workspace.** Agent actions should visibly affect the same UI the human uses.
6. **No hidden magic.** Scientific results should expose parameters, units, coordinates, and assumptions where relevant.
7. **Progressive disclosure.** Show the common controls first; advanced parameters belong in inspectors/popovers.
8. **Consistency beats novelty.** Reuse the same spacing, typography, control heights, icons, and interaction patterns everywhere.

---

## 2. App shell

Desktop-first layout:

```text
┌───────────────────────────────────────────────────────────────┐
│ Top bar: document name · topology · length · status          │
├──────────────┬──────────────────────────────┬─────────────────┤
│ Workspace    │ Main view                    │ Inspector       │
│ 220–260 px   │ flexible                     │ 280–320 px      │
│              │ Map | Sequence | Compare     │                 │
├──────────────┴──────────────────────────────┴─────────────────┤
│ Agent / task activity drawer — collapsed by default          │
└───────────────────────────────────────────────────────────────┘
```

Rules:

- Left sidebar: `240px` default.
- Right inspector: `300px` default.
- Center: `min-width: 0`, owns remaining width.
- Sidebars may resize, but clamp:
  - left: `200–320px`
  - right: `260–380px`
- Bottom activity drawer: `32px` collapsed header, `140–220px` expanded.
- Top bar height: `44px`.
- Main toolbar height: `36px`.
- No extra page-level cards around these regions. Borders separate structure.

At `< 1000px`, collapse the right inspector into a drawer.
At `< 760px`, collapse the workspace sidebar too. Mobile is secondary; preserve functionality rather than forcing the desktop layout into tiny columns.

---

## 3. Spacing system

Use a strict 4px base grid.

| Token | Size | Use |
|---|---:|---|
| `xs` | 4px | icon gaps, tight metadata |
| `sm` | 8px | compact controls |
| `md` | 12px | panel internals |
| `lg` | 16px | normal panel padding |
| `xl` | 24px | major section separation |
| `2xl` | 32px | rare large separation |

Rules:

- Panel padding: usually `12–16px`.
- Toolbar gaps: `6–8px`.
- Form label → control: `6px`.
- Section label → section content: `8px`.
- Never invent `13px`, `19px`, `27px`, etc. unless required by geometry.
- Avoid nested padding. If a panel already has padding, children should not each become padded cards.

---

## 4. Radius, borders, shadows

This is an editor, not a card gallery.

- Standard radius: `6px`.
- Dialog/popover radius: `8px`.
- Small badges: `4px`.
- Pills / `999px` radius: only statuses, tags, and segmented controls where the shape communicates grouping.
- Border: `1px`.
- Dividers should usually be borders, not separate decorative elements.
- No shadow on normal panels.
- Shadows only for floating layers: dialogs, popovers, menus, command palette.
- No glassmorphism, glow, gradient borders, or decorative blur.

Avoid stacking rounded containers:

```text
bad:
Card
 └─ Card
     └─ rounded box
         └─ pill

good:
Panel
 ├─ section heading
 ├─ content
 ├─ divider
 └─ content
```

---

## 5. Typography

Use system fonts; do not depend on downloadable fonts.

```css
--font-ui:
  Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
  "Segoe UI", sans-serif;

--font-mono:
  "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono",
  ui-monospace, monospace;
```

If Inter/JetBrains Mono are unavailable, the system fallback is expected.

### Scale

| Role | Size | Weight | Line height |
|---|---:|---:|---:|
| micro/meta | 11px | 500 | 16px |
| secondary | 12px | 400–500 | 18px |
| normal UI | 13px | 400 | 20px |
| control/button | 13px | 500 | 18px |
| panel heading | 14px | 600 | 20px |
| document title | 16px | 600 | 22px |
| rare large title | 20px | 650 | 26px |

Sequence text:

```text
13–14px monospace
line-height: 1.65
font-variant-ligatures: none
```

Rules:

- Do not use 10px text for meaningful information.
- Avoid light font weights.
- Uppercase only tiny categorical labels, never full headings.
- Coordinates, sequence text, codons, enzyme sites, and numeric scientific values use monospace where alignment helps.

---

## 6. Color system

Use semantic tokens. Components should not hardcode arbitrary colors.

### Light

```css
--bg:             #F7F8FA;
--panel:          #FFFFFF;
--panel-muted:    #F1F3F6;
--text:           #171A1F;
--text-muted:     #626A76;
--border:         #D9DEE7;

--accent:         #2563EB;
--accent-soft:    #E8F0FF;

--success:        #16875D;
--warning:        #A66300;
--danger:         #C63737;
--info:           #2563EB;
```

### Dark

```css
--bg:             #0F1115;
--panel:          #15181E;
--panel-muted:    #1B1F27;
--text:           #E8EAF0;
--text-muted:     #989FAA;
--border:         #2A303A;

--accent:         #6EA0FF;
--accent-soft:    #182744;

--success:        #56C59A;
--warning:        #E5A84B;
--danger:         #F07878;
--info:           #6EA0FF;
```

### Scientific categorical colors

These are persistent data categories, not general UI accents.

```text
CDS / coding region      indigo
promoter                 amber
origin                   teal
resistance marker        red
primer                   cyan
misc annotation          violet
restriction site         neutral + accent marker
selection                accent blue
agent proposal           violet outline / tint
```

Rules:

- Never communicate meaning by color alone.
- Feature tracks also use labels, icons, line styles, or geometry.
- The UI accent is for interaction: focus, selection, active tabs, primary actions.
- Do not paint every card/header with the accent.
- Avoid rainbow palettes when only 2–3 categories are visible.

---

## 7. Controls

Desktop editor control heights:

- compact button/input: `30px`
- normal button/input: `34px`
- large primary action: `38px`
- icon button: `30×30px`
- touch layout: minimum `44×44px`

Icons:

- one icon family only.
- default icon: `16px`.
- secondary icon: `14px`.
- do not use icons when text is clearer.
- icon-only actions require tooltips and accessible labels.

Buttons:

- one primary action per local context.
- destructive actions use danger styling only when the action is actually destructive.
- avoid giant CTA buttons inside an editor.
- disabled controls must explain why via tooltip or adjacent text when non-obvious.

---

## 8. Sequence viewer

The sequence viewer is a custom component, not a collection of generic UI cards.

### Line structure

Default:

```text
60 bases / line
6 groups × 10 bases
```

Example:

```text
  1201  ATGCCTAGCA GCTTAGCTAA GCCATGCTTA CGGATCAAGC TTAGCGATCG ATGCTAAGCT
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━ CDS: mCherry ━━━━━━━━━━━━━━━━━━━━━━━
                         ↑ EcoRI
```

Rules:

- coordinate gutter has fixed width.
- base groups align vertically.
- do not wrap bases unpredictably based on browser width.
- allow 50/60/80 bases per line later, but default to 60.
- selection must remain visible when the pointer leaves.
- highlights must not reduce nucleotide contrast below readable levels.
- annotations occupy tracks below/above the base line instead of replacing the text background everywhere.

For long documents, virtualize sequence lines. Never create one React element per base for an entire large sequence.

### Coordinate math

Internal coordinates are `0-based, half-open [start, end)`.

Display coordinates may be 1-based, but conversion occurs only at the UI boundary:

```text
displayStart = start0 + 1
displayEnd   = end0Exclusive
```

Within a visible region:

```text
x(i) = leftPadding
     + ((i - visibleStart) / (visibleEnd - visibleStart)) * contentWidth
```

Never mix coordinate systems inside domain state.

---

## 9. Circular plasmid map

Use SVG.

Geometry:

```text
cx = width / 2
cy = height / 2
R  = 0.34 × min(width, height)
```

Base coordinate to angle:

```text
θ(i) = -π/2 + 2π(i / sequenceLength)
```

Feature arc:

```text
θ1 = θ(start)
θ2 = θ(endExclusive)
```

If `end < start`, the feature crosses coordinate zero and is rendered as two arcs.

Rules:

- sequence backbone is neutral.
- features sit on one or two clean tracks.
- selected feature gets an outline/contrast change, not a glow.
- labels should follow available space; do not force every annotation onto the map.
- when labels collide, hide lower-priority labels and keep them accessible through hover/click/inspector.
- restriction-site labels stay sparse by default: show unique cutters or selected enzymes.
- map and linear sequence selection are synchronized.

---

## 10. Feature / annotation rendering

Feature geometry communicates strand:

```text
forward:  ━━━━━━━━━━━▶
reverse:  ◀━━━━━━━━━━━
```

Minimum visible feature width should be enough to click; very short features get a marker plus inspector details.

Feature inspector shows:

```text
name
type
coordinates
strand
length
qualifiers / notes
```

Avoid showing every qualifier inline in the main view.

Agent-created annotations enter a **staged** state first:

```text
Agent proposal
──────────────
Candidate promoter
821–846 (+)

[Reject] [Apply]
```

Staged data is visually distinct from committed annotations.

---

## 11. Restriction-site UX

Default panel:

```text
Restriction enzymes
[search]

✓ EcoRI      1
✓ BamHI      1
  HindIII    3
```

Filters:

```text
Unique cutters
1–2 cutters
All
```

Rules:

- show site count before details.
- selecting an enzyme highlights all its sites in map + sequence.
- clicking one result focuses that exact position.
- circular-origin matches are handled correctly.
- digest simulation outputs ordered fragment sizes and cut coordinates.
- do not fill the map with dozens of enzyme labels by default.

---

## 12. Primer UX

Primer is a first-class object.

Show:

```text
Name
5' extension
Annealing sequence
Strand
Binding coordinates
Length
GC %
Tm
Molecular weight
```

Visually separate:

```text
5' extension | annealing region
```

because extensions do not bind the original template.

Primer direction:

```text
forward  ─────────▶
reverse  ◀─────────
```

Primer pair view:

```text
F ─────────────────────────────▶
       predicted amplicon
◀───────────────────────────── R
```

Show:

```text
amplicon length
forward Tm
reverse Tm
ΔTm
```

Scientific values always include units.

---

## 13. Compare view

Comparison must prioritize differences, not decorative alignment.

Use fixed-width aligned sequence rows.

```text
Reference  ATGGCAT---ACCGT
Variant    ATGGCATGCCACCGT
                 +GCC
```

Difference semantics:

```text
substitution
insertion
deletion
match
```

Rules:

- matches remain visually quiet.
- mutations are emphasized.
- annotations remain visible against the reference.
- clicking a difference focuses both sequence views and updates inspector.
- never use red/green alone for reference-vs-variant meaning.

---

## 14. Inspector philosophy

Right inspector is contextual.

Its contents depend on selection:

```text
no selection       → document summary
feature selected   → feature details
bases selected     → region details + actions
primer selected    → primer properties
enzyme selected    → enzyme/site details
difference selected→ mutation details
```

Do not create separate modal dialogs for information that belongs in the inspector.

Use tabs only when two modes are genuinely parallel. Avoid tabs inside tabs.

---

## 15. Agent activity UX

Agent interaction is integrated into the workbench; no floating chatbot bubble.

Collapsed row:

```text
Agent activity · 3 tools used · 1 proposal waiting
```

Expanded:

```text
08:42:31  compare_sequences     ✓  1 difference
08:42:32  find_orfs             ✓  4 ORFs
08:42:33  stage_annotation      ●  awaiting approval
```

Rules:

- logs are concise.
- inputs/results expand on demand.
- scientific operations show important parameters.
- errors provide actionable recovery text.
- agent actions that only navigate/highlight may apply immediately.
- persistent scientific/document changes are staged for approval.
- activity state must not compete visually with the scientific data.

---

## 16. Motion

Motion exists only to explain state change.

Durations:

```text
hover/focus        80–120ms
panel/dropdown     120–160ms
drawer             160–200ms
focus-to-region    180–240ms
```

Rules:

- no bouncing.
- no spring animations for normal controls.
- no animated gradients.
- no entrance animation on every card/row.
- respect `prefers-reduced-motion`.
- focus-to-region may smoothly scroll, then briefly emphasize the target.

---

## 17. Empty, loading, and error states

Empty states should tell the user what to do next.

Good:

```text
No sequence loaded
Import FASTA/GenBank or open the demo plasmid.
[Import] [Open demo]
```

Bad:

```text
Nothing here yet ✨
```

Loading:

- use lightweight progress indicators.
- avoid skeletons for scientific data when a simple spinner/progress line is clearer.
- large analyses should show progress and remain cancellable.

Errors:

```text
Primer does not bind this template.
Check strand/orientation or choose another primer.
```

Never show raw stack traces in the normal UI.

---

## 18. Density and readability rules

- Main scientific workspace should use most of the screen.
- Avoid large empty hero-style areas.
- Do not place every statistic in a separate card.
- Prefer aligned key/value rows:
  ```text
  Length      5,214 bp
  GC          48.3 %
  Topology    Circular
  ```
- Secondary metadata uses muted text, not tiny text.
- Keep important actions close to the object they affect.
- Long labels truncate with tooltip; scientific sequences never truncate silently.
- Horizontal scrolling is acceptable for sequence/alignment data when preserving structure is more important than wrapping.

---

## 19. shadcn/Base UI usage

Use shadcn/Base UI for application chrome:

```text
Button
Dialog
Tooltip
Dropdown
Tabs
Resizable panels
Scroll areas
Popover
Command palette
Form controls
```

Do not force scientific visualization into generic components.

Custom components own:

```text
SequenceViewer
CircularMap
FeatureTrack
PrimerTrack
RestrictionTrack
CompareView
DigestView
```

Do not wrap every custom component in `Card`.

---

## 20. Accessibility

- Keyboard focus must always be visible.
- Every icon-only control gets `aria-label`.
- Color is never the sole semantic cue.
- Sequence selection must be keyboard-accessible where practical.
- Escape closes temporary overlays, not persistent panels.
- Standard tab order follows visual order.
- Contrast target: WCAG AA for normal text.
- Scientific text should maintain high contrast even under selections/highlights.
- Tooltips supplement labels; they never contain essential information unavailable elsewhere.

---

## 21. Performance rules

- Never render one DOM node per nucleotide for an entire large document.
- Virtualize sequence lines.
- Cache derived geometry, not giant duplicated sequence strings.
- Memoize expensive feature/map layout.
- SVG is appropriate for plasmid maps and feature tracks.
- Large analyses run outside critical React render paths.
- UI remains responsive while scientific operations execute.
- Results lists should be bounded/virtualized when large.

---

## 22. Visual anti-pattern checklist

Before merging UI work, reject it if it contains several of these:

- excessive rounded cards
- cards nested inside cards
- huge page titles consuming workspace height
- gradients/glows used without semantic reason
- pill-shaped controls everywhere
- random accent colors per component
- inconsistent icon sizes
- arbitrary spacing values
- tiny secondary text
- oversized buttons in dense toolbars
- decorative charts where a number/table is clearer
- modal dialogs for simple contextual details
- hover-only essential controls
- animations on every component mount
- fake dashboard KPI cards for ordinary metadata
- empty space added merely to make the page look “clean”
- separate visual styles for every new feature instead of reusing the system

If the scientific workspace looks quieter after removing a decorative element, remove it.

---

## 23. Implementation acceptance checklist

A screen is ready only if:

- alignment follows the 4px grid
- text uses the defined scale
- control heights are consistent
- semantic colors come from tokens
- all interaction states are visible
- selected object is unmistakable
- coordinates use the documented convention
- panel structure uses borders before cards
- keyboard focus works
- narrow laptop widths remain usable
- no major data is hidden behind hover
- loading/error/empty states exist
- scientific units and assumptions are visible where needed
- map, sequence, inspector, and agent state stay synchronized
