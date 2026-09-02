import { describe, it, expect } from "vitest";
import { screenBiosecurity } from "../../src/scientific/biosecurity";

describe("Biosecurity & Dual-Use Select Agent Compliance Screener", () => {
  it("passes standard benign plasmids (e.g. pUC19-like) as compliant", () => {
    const benignSeq = "AGCGCCCAATACGCAAACCGCCTCTCCCCGCGCGTTGGCCGATTCATTAATGCAGCTGGCACGACAGGTTTCCCGACTGGAAAGCGGGCAGTGAGCGCA";
    const report = screenBiosecurity(benignSeq, "circular");
    
    expect(report.isCompliant).toBe(true);
    expect(report.status).toBe("NO_LOCAL_MATCH");
    expect(report.matchCount).toBe(0);
    expect(report.summary).toContain("No matches found");
  });

  it("flags Tier 1 Select Agent sequence (Variola/Smallpox) with critical alert", () => {
    // Inject Variola signature: GTTACAATGTTAGTTCTACG
    const infectedSeq = "ATGCGATCGATC" + "GTTACAATGTTAGTTCTACG" + "TTAGCTAGCTAG";
    const report = screenBiosecurity(infectedSeq, "linear");
    
    expect(report.isCompliant).toBe(false);
    expect(report.status).toBe("TIER_1_CRITICAL");
    expect(report.matchCount).toBeGreaterThan(0);
    
    const match = report.matches[0];
    expect(match.agentName).toContain("Variola");
    expect(match.category).toBe("Tier 1 Select Agent");
    expect(match.regulatoryFramework).toContain("HHS 42 CFR 73.3");
    expect(match.start0).toBe(12);
    expect(match.end0Exclusive).toBe(12 + "GTTACAATGTTAGTTCTACG".length);
  });

  it("detects controlled toxin (Ricin A-chain) on reverse strand", () => {
    // Ricin forward signature: TTGATGTTAGCACTTCCTGT
    // Reverse complement: ACAGGAAGTGCTAACATCAA
    const revRicin = "ACAGGAAGTGCTAACATCAA";
    const flaggedSeq = "GGGGCCCCAAAA" + revRicin + "TTTTCCCCGGGG";
    const report = screenBiosecurity(flaggedSeq, "circular");
    
    expect(report.isCompliant).toBe(false);
    expect(report.status).toBe("CONTROLLED_TOXIN");
    expect(report.matches.some(m => m.agentId === "ricin_toxin" && m.strand === -1)).toBe(true);
    expect(report.recommendation).toContain("End-Use Certificate");
  });
});
