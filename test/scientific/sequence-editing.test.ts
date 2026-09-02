import { describe, it, expect } from "vitest";
import { editSequence } from "../../src/scientific/sequence-editing";
import type { Feature } from "../../src/domain/feature";

describe("Coordinate-Aware Sequence Editing Engine", () => {
  const dummyFeatures: Feature[] = [
    {
      id: "f1",
      name: "Upstream Promoter",
      type: "promoter",
      strand: 1,
      segments: [{ start0: 0, end0Exclusive: 5 }],
      source: "manual"
    },
    {
      id: "f2",
      name: "Spanning CDS",
      type: "CDS",
      strand: 1,
      segments: [{ start0: 5, end0Exclusive: 25 }],
      source: "manual"
    },
    {
      id: "f3",
      name: "Downstream Terminator",
      type: "terminator",
      strand: 1,
      segments: [{ start0: 30, end0Exclusive: 40 }],
      source: "manual"
    }
  ];

  it("handles insertions and correctly shifts downstream and expands spanning features", () => {
    // 50bp template
    const seq = "A".repeat(50);
    const result = editSequence(seq, dummyFeatures, {
      type: "insert",
      index0: 10,
      sequence: "GGGGGG" // 6 bp
    });

    expect(result.newLength).toBe(56);
    expect(result.newSequence.slice(10, 16)).toBe("GGGGGG");

    // f1 (0-5) is upstream: unchanged
    const f1 = result.newFeatures.find(f => f.id === "f1")!;
    expect(f1.segments[0]).toEqual({ start0: 0, end0Exclusive: 5 });

    // f2 (5-25) spans index 10: expands to (5-31)
    const f2 = result.newFeatures.find(f => f.id === "f2")!;
    expect(f2.segments[0]).toEqual({ start0: 5, end0Exclusive: 31 });

    // f3 (30-40) is downstream: shifts to (36-46)
    const f3 = result.newFeatures.find(f => f.id === "f3")!;
    expect(f3.segments[0]).toEqual({ start0: 36, end0Exclusive: 46 });
  });

  it("handles deletions, shifts downstream features, and drops swallowed features", () => {
    const seq = "A".repeat(50);
    const testFeatures: Feature[] = [
      ...dummyFeatures,
      {
        id: "f_swallowed",
        name: "Target Region",
        type: "misc_feature",
        strand: 1,
        segments: [{ start0: 12, end0Exclusive: 18 }],
        source: "manual"
      }
    ];

    // Delete 10bp: [10, 20)
    const result = editSequence(seq, testFeatures, {
      type: "delete",
      start0: 10,
      end0Exclusive: 20
    });

    expect(result.newLength).toBe(40);
    // f_swallowed (12-18) was completely swallowed -> removed
    expect(result.newFeatures.some(f => f.id === "f_swallowed")).toBe(false);

    // f2 (5-25) spanned the entire deletion -> shrinks to (5-15)
    const f2 = result.newFeatures.find(f => f.id === "f2")!;
    expect(f2.segments[0]).toEqual({ start0: 5, end0Exclusive: 15 });

    // f3 (30-40) downstream -> shifts by -10 to (20-30)
    const f3 = result.newFeatures.find(f => f.id === "f3")!;
    expect(f3.segments[0]).toEqual({ start0: 20, end0Exclusive: 30 });
  });

  it("replaces sequence and transforms coordinates atomically", () => {
    const seq = "ATCGATCG" + "AAAAA" + "TGCATGCA";
    // Replace "AAAAA" (5bp at 8-13) with "GGGGGGGG" (8bp)
    const result = editSequence(seq, dummyFeatures, {
      type: "replace",
      start0: 8,
      end0Exclusive: 13,
      replacement: "GGGGGGGG"
    });

    expect(result.newLength).toBe(seq.length + 3);
    expect(result.newSequence.slice(8, 16)).toBe("GGGGGGGG");
  });

  it("reverses complement of a region and inverts feature strand", () => {
    // 30bp template
    const seq = "AAAAA" + "GATTACA" + "TTTTT"; // len 17
    const internalFeature: Feature[] = [
      {
        id: "f_internal",
        name: "Invertible Element",
        type: "promoter",
        strand: 1,
        segments: [{ start0: 5, end0Exclusive: 12 }], // "GATTACA"
        source: "manual"
      }
    ];

    const result = editSequence(seq, internalFeature, {
      type: "reverse_complement",
      start0: 5,
      end0Exclusive: 12
    });

    // "GATTACA" reverse complement is "TGTAATC"
    expect(result.newSequence.slice(5, 12)).toBe("TGTAATC");
    const fi = result.newFeatures.find(f => f.id === "f_internal")!;
    expect(fi.strand).toBe(-1);
    expect(fi.segments[0]).toEqual({ start0: 5, end0Exclusive: 12 });
  });

  it("rotates circular plasmid origin and splits origin-crossing features", () => {
    const seq = "ATGC" + "GATC" + "TTTT"; // 12bp
    const plasmidFeatures: Feature[] = [
      {
        id: "f_cross",
        name: "Origin Straddler",
        type: "CDS",
        strand: 1,
        segments: [{ start0: 2, end0Exclusive: 8 }], // len 6 (from 2 to 8)
        source: "manual"
      }
    ];

    // Rotate origin to index 4 ("GATC...")
    const result = editSequence(seq, plasmidFeatures, {
      type: "rotate_origin",
      newOrigin0: 4
    }, "circular");

    expect(result.newSequence).toBe("GATCTTTTATGC");
    // Original feature was 2..8 (len 6). With new origin at 4:
    // (2 - 4 + 12) % 12 = 10. End = 10 + 6 = 16 > 12.
    // Splits into [10, 12) and [0, 4)
    const fCross = result.newFeatures.find(f => f.id === "f_cross")!;
    expect(fCross.segments).toEqual([
      { start0: 0, end0Exclusive: 4 },
      { start0: 10, end0Exclusive: 12 }
    ]);
  });
});
