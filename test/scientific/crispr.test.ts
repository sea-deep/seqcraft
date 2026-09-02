import { describe, it, expect } from "vitest";
import { findCrisprTargets } from "../../src/scientific/crispr";

describe("CRISPR SpCas9 Target Scanner & MMEJ Predictor", () => {
  it("identifies SpCas9 targets with NGG PAM and evaluates GC content", () => {
    // 20nt protospacer (50% GC) + AGG PAM
    const seq = "ATGCGATCGATCGATCGATCAGGTTTT";
    const targets = findCrisprTargets(seq, "linear");
    
    expect(targets.length).toBeGreaterThan(0);
    const top = targets[0];
    expect(top.spacer.length).toBe(20);
    expect(top.pam).toBe("AGG");
    expect(top.strand).toBe(1);
    expect(top.cutSite0).toBe(17); // 3bp upstream of PAM start (20 - 3)
    expect(top.gcPercent).toBe(50);
    expect(top.qualityScore).toBeGreaterThan(70);
  });

  it("applies strong penalty for poly-T tract (U6 termination signal)", () => {
    // Spacer containing TTTT
    const badSeq = "ATGCATTTTGCGATCGATCGAGGTTTT";
    const targets = findCrisprTargets(badSeq, "linear");
    
    expect(targets.length).toBeGreaterThan(0);
    const target = targets[0];
    expect(target.penalties.some(p => p.includes("Poly-T"))).toBe(true);
    expect(target.qualityScore).toBeLessThan(70);
  });

  it("detects reverse strand CCN PAMs and returns correct 5'-3' guide", () => {
    // Bottom strand has NGG, so top strand has CCN
    const seq = "CCTATGCGATCGATCGATCGATCGATC";
    const targets = findCrisprTargets(seq, "linear");
    
    const revTargets = targets.filter(t => t.strand === -1);
    expect(revTargets.length).toBeGreaterThan(0);
    const rev = revTargets[0];
    expect(rev.spacer.length).toBe(20);
    expect(rev.pam.endsWith("GG")).toBe(true);
  });

  it("computes MMEJ deletion patterns and frameshift knockout likelihood", () => {
    // Flank cut site with microhomology tandem repeats: CTG ... cut ... CTG
    const seq = "AAGATGCGATCGATCCTGAATGCGGCTGATCG";
    const targets = findCrisprTargets(seq, "linear");
    
    expect(targets.length).toBeGreaterThan(0);
    const target = targets[0];
    expect(target.mmejDeletions.length).toBeGreaterThan(0);
    expect(target.frameshiftProbability).toBeGreaterThan(0);
  });
});
