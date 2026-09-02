import { describe, it, expect } from "vitest";
import { compileOpentronsPCRProtocol, compileOpentronsDigestProtocol } from "../../src/scientific/opentrons-compiler";

describe("Opentrons Protocol Compiler", () => {
  it("compiles valid Opentrons PCR protocol with correct volumes and thermocycler params", () => {
    const result = compileOpentronsPCRProtocol({
      templateDocName: "pUC19",
      forwardPrimerName: "M13-Fwd",
      reversePrimerName: "M13-Rev",
      ampliconLengthBp: 1500,
      annealingTempC: 58.5,
      numReactions: 4,
      reactionVolumeUl: 50,
      masterMixVolumeUl: 25,
      fwdPrimerVolumeUl: 2.5,
      revPrimerVolumeUl: 2.5,
      templateVolumeUl: 2
    });

    expect(result.filename).toBe("opentrons_pcr_puc19.py");
    expect(result.pythonCode).toContain("from opentrons import protocol_api");
    expect(result.pythonCode).toContain('"apiLevel": "2.15"');
    expect(result.pythonCode).toContain("opentrons_24_tuberack_generic_2ml_screwcap");
    expect(result.pythonCode).toContain("nest_96_wellplate_100ul_pcr_full_skirt");
    // Water volume: 50 - (25 + 2.5 + 2.5 + 2) = 18 uL
    expect(result.pythonCode).toContain("Distributing 18 uL of nuclease-free water");
    // Extension time: 1.5 kb * 30s = 45s
    expect(result.pythonCode).toContain("72C 45s");
    expect(result.pythonCode).toContain("58.5C 30s");

    expect(result.billOfMaterials.length).toBeGreaterThan(4);
    expect(Object.keys(result.reagentPlateMap).length).toBe(4);
  });

  it("compiles valid Opentrons restriction digest protocol", () => {
    const result = compileOpentronsDigestProtocol({
      dnaDocName: "pBR322",
      enzymeNames: ["EcoRI", "BamHI"],
      numReactions: 8,
      reactionVolumeUl: 50,
      dnaVolumeUl: 10,
      bufferVolumeUl: 5,
      enzymeVolumeUl: 1,
      incubationTempC: 37,
      incubationTimeMin: 60
    });

    expect(result.filename).toBe("opentrons_digest_pbr322.py");
    expect(result.pythonCode).toContain("from opentrons import protocol_api");
    expect(result.pythonCode).toContain('enzyme_1 = tuberack["A4"]');
    expect(result.pythonCode).toContain('enzyme_2 = tuberack["A5"]');
    // Water: 50 - (10 + 5 + 2) = 33 uL
    expect(result.pythonCode).toContain("Distributing 33 uL water");
    expect(result.pythonCode).toContain("Incubate at 37C for 60 minutes");
    expect(Object.keys(result.reagentPlateMap).length).toBe(8);
  });

  it("rejects recipes where component volumes exceed total reaction volume", () => {
    expect(() => compileOpentronsPCRProtocol({
      templateDocName: "pUC19",
      forwardPrimerName: "F",
      reversePrimerName: "R",
      ampliconLengthBp: 500,
      annealingTempC: 55,
      numReactions: 1,
      reactionVolumeUl: 20,
      masterMixVolumeUl: 25, // 25 > 20
    })).toThrow("Component volumes");
  });
});
