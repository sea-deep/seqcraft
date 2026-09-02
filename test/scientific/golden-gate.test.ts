import { describe, it, expect } from "vitest";
import { 
  TYPE_IIS_ENZYMES,
  digestPartWithTypeIIS, 
  assembleGoldenGate, 
  domesticateSequence 
} from "../../src/scientific/golden-gate";
import { Translation } from "nucleotide-sequence";
import { ScientificSequence } from "../../src/scientific/nucleotide";

describe("Golden Gate (Type IIS) Multi-Part Assembly & Domestication", () => {
  const bsai = TYPE_IIS_ENZYMES.find(e => e.id === "bsai")!;

  it("extracts 4nt 5' sticky overhangs and scarless body sequence", () => {
    // Part 1: BsaI(GGTCTC) + A + [ATGC (left overhang)] + [BODY] + [GCTA (right overhang)] + GAGACC (rev BsaI)
    // For BsaI, topCutOffset=1, overhangLength=4.
    // Left: GGTCTC + A + ATGC (indices: GGTCTC is 6, A is 1, ATGC is 4 -> starts at 6+1=7)
    // Right: GCTA + A + GAGACC (bottom cut offset is 5 -> revIdx - 5 is rightOverhang start)
    const seq = "GGTCTCA" + "ATGC" + "TTAACCGG" + "GCTA" + "AGAGACC";
    const part = {
      id: "part-1",
      name: "Part-1-Promoter",
      sequence: seq
    };

    const res = digestPartWithTypeIIS(part, bsai);
    expect(res.success).toBe(true);
    expect(res.digested).toBeDefined();
    expect(res.digested!.leftOverhang).toBe("ATGC");
    expect(res.digested!.rightOverhang).toBe("GCTA");
    expect(res.digested!.bodySequence).toBe("ATGCTTAACCGGGCTA");
  });

  it("assembles 2 compatible Golden Gate parts into a circular construct", () => {
    // Part 1: Left ATGC, Right GCTA
    const seq1 = "GGTCTCA" + "ATGC" + "AAAA" + "GCTA" + "AGAGACC";
    // Part 2: Left GCTA, Right ATGC
    const seq2 = "GGTCTCA" + "GCTA" + "TTTT" + "ATGC" + "AGAGACC";

    const part1 = { id: "p1", name: "Fragment-A", sequence: seq1 };
    const part2 = { id: "p2", name: "Fragment-B", sequence: seq2 };

    const assembly = assembleGoldenGate([part1, part2], bsai, "circular");
    expect(assembly.success).toBe(true);
    expect(assembly.junctions.length).toBe(2);
    expect(assembly.junctions.every(j => j.isCompatible)).toBe(true);
    // Circular construct should contain AAAA and TTTT joined by GCTA and ATGC junctions
    expect(assembly.recombinantSequence).toContain("AAAA");
    expect(assembly.recombinantSequence).toContain("TTTT");
  });

  it("rejects assembly with incompatible overhangs and provides junction diagnostics", () => {
    // Part 1: Left ATGC, Right GCTA
    const seq1 = "GGTCTCA" + "ATGC" + "AAAA" + "GCTA" + "AGAGACC";
    // Part 2 with mismatched left overhang CCCC instead of GCTA
    const seq2 = "GGTCTCA" + "CCCC" + "TTTT" + "ATGC" + "AGAGACC";

    const part1 = { id: "p1", name: "Fragment-A", sequence: seq1 };
    const part2 = { id: "p2", name: "Fragment-B", sequence: seq2 };

    const assembly = assembleGoldenGate([part1, part2], bsai, "circular");
    expect(assembly.success).toBe(false);
    expect(assembly.errorMessage).toContain("Incompatible Golden Gate junction");
  });

  it("domesticates internal Type IIS sites using synonymous codon substitutions", () => {
    // Coding sequence in Frame 1 with an internal BsaI site: GGTCTC
    // GGT = Gly (G), CTC = Leu (L).
    // BsaI site can be mutated to GGC (Gly) or CTA/TTG/CTG (Leu) to preserve GL
    const codingSeq = "ATG" + "GGTCTC" + "TAA"; // Met - Gly - Leu - Stop
    
    const beforeAA = Translation.translate(new ScientificSequence(codingSeq).engineSeq);
    expect(beforeAA).toBe("MGL*");

    const dom = domesticateSequence(codingSeq, bsai, 1);
    expect(dom.hasInternalSites).toBe(true);
    expect(dom.domesticatedSequence).not.toContain("GGTCTC");
    expect(dom.domesticatedSequence).not.toContain("GAGACC");

    // Scientific Invariant: Translation must remain 100% identical!
    const afterAA = Translation.translate(new ScientificSequence(dom.domesticatedSequence).engineSeq);
    expect(afterAA).toBe(beforeAA);
  });
});
