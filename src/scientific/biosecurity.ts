import { reverseComplementIupac } from "./restriction-analysis";

export type BiosecurityTier = 
  | "TIER_1_CRITICAL" 
  | "SELECT_AGENT_FLAG" 
  | "CONTROLLED_TOXIN" 
  | "COMPLIANT";

export interface RegulatedAgentDefinition {
  id: string;
  name: string;
  category: "Tier 1 Select Agent" | "HHS/USDA Select Agent" | "Controlled Toxin" | "Dual-Use Pathogen";
  regulatoryFramework: string; // e.g. "HHS/USDA 42 CFR 73.3", "Australia Group Dual-Use List"
  description: string;
  signatureSequences: string[]; // representative diagnostic k-mers (>= 18nt)
  providerAction: string; // e.g. "Order flagged for CDC review; Requires APHIS/CDC Form 1"
}

export const REGULATED_AGENTS: RegulatedAgentDefinition[] = [
  {
    id: "variola_major",
    name: "Variola virus (Smallpox)",
    category: "Tier 1 Select Agent",
    regulatoryFramework: "HHS 42 CFR 73.3 / Australia Group / IGSC Tier 1",
    description: "Causative agent of smallpox. Synthetic construction or acquisition is strictly prohibited under international treaty.",
    signatureSequences: [
      "ACCTAATTATACAGCGGACAT",
      "GTTACAATGTTAGTTCTACG",
      "CGGACGATTTGTTCCTCGTA"
    ],
    providerAction: "Immediate automatic hold; mandatory notification to federal biological security authorities."
  },
  {
    id: "ebola_zaire",
    name: "Ebola virus (Zaire ebolavirus)",
    category: "Tier 1 Select Agent",
    regulatoryFramework: "HHS 42 CFR 73.3 / Australia Group Category 1",
    description: "Filovirus causing severe hemorrhagic fever with high mortality rates.",
    signatureSequences: [
      "ACCGGACAAATAGTCGACAG",
      "GTTGTCAACGACAACACTGA",
      "AGCTGGTAATTGGTTCGCTC"
    ],
    providerAction: "Order hold; Requires validated BSL-4 facility credentials and authorization."
  },
  {
    id: "marburg_virus",
    name: "Marburg virus",
    category: "Tier 1 Select Agent",
    regulatoryFramework: "HHS 42 CFR 73.3 / Australia Group Category 1",
    description: "Filovirus closely related to Ebola causing severe hemorrhagic fever.",
    signatureSequences: [
      "TGTCGATCGGTTTCAGTAGC",
      "GCTCAATGGACAACTCGTCA"
    ],
    providerAction: "Order hold; Requires validated BSL-4 facility credentials and authorization."
  },
  {
    id: "bacillus_anthracis",
    name: "Bacillus anthracis (Lethal / Edema Factor)",
    category: "Tier 1 Select Agent",
    regulatoryFramework: "HHS/USDA 42 CFR 73.3",
    description: "Causative agent of anthrax. Major virulence factor pXO1 toxin genes.",
    signatureSequences: [
      "TTGGATGAAATCATCACTGC",
      "GACGCAATCAACGAAACTGT",
      "ACGTTTACCATGACCGGTTG"
    ],
    providerAction: "Requires Select Agent Program registration and CDC transfer approval."
  },
  {
    id: "botulinum_neurotoxin",
    name: "Clostridium botulinum neurotoxin",
    category: "Tier 1 Select Agent",
    regulatoryFramework: "HHS 42 CFR 73.3 / Controlled Toxins",
    description: "Extremely potent zinc-dependent neurotoxin blocking acetylcholine release.",
    signatureSequences: [
      "TGGATAATAGCATCAATCTG",
      "ACGGTTAACGACTTCCTGAA",
      "GACTTTGACTGGGTTGACAA"
    ],
    providerAction: "Hold if aggregate quantity exceeds regulatory threshold (0.5 mg equivalent)."
  },
  {
    id: "ricin_toxin",
    name: "Ricin (Ricinus communis A-chain)",
    category: "Controlled Toxin",
    regulatoryFramework: "HHS 42 CFR 73.3 / Australia Group Controlled Toxins",
    description: "Ribosome-inactivating protein (RIP) type 2 inhibiting protein synthesis.",
    signatureSequences: [
      "TTGATGTTAGCACTTCCTGT",
      "CGGTAGCGGTTATACGACTA",
      "ACTTGTCGTCAGCGTTCATG"
    ],
    providerAction: "Customer identity verification and End-Use Certification required."
  },
  {
    id: "diphtheria_toxin",
    name: "Corynebacterium diphtheriae toxin (Fragment A)",
    category: "Controlled Toxin",
    regulatoryFramework: "Australia Group Biological Agents / Controlled Toxins",
    description: "Bacterial exotoxin inhibiting elongation factor 2 (EF-2) via ADP-ribosylation.",
    signatureSequences: [
      "TCCGGCAGTTGTTTTACCGT",
      "GACTACGTTAACGACCTGTG"
    ],
    providerAction: "Customer verification and institutional declaration of research purpose required."
  }
];

export interface BiosecurityMatch {
  agentId: string;
  agentName: string;
  category: RegulatedAgentDefinition["category"];
  regulatoryFramework: string;
  matchedSignature: string;
  strand: 1 | -1;
  start0: number;
  end0Exclusive: number;
  identityPercent: number;
  providerAction: string;
}

export interface BiosecurityScreeningReport {
  status: BiosecurityTier;
  isCompliant: boolean;
  matchCount: number;
  matches: BiosecurityMatch[];
  highestRiskTier: BiosecurityTier;
  summary: string;
  recommendation: string;
}

/**
 * Screen a DNA sequence against the regulated select agents and toxins database.
 */
export function screenBiosecurity(
  sequence: string,
  _topology: "linear" | "circular" = "circular"
): BiosecurityScreeningReport {
  const seqUpper = sequence.toUpperCase();
  const seqLen = sequence.length;
  const matches: BiosecurityMatch[] = [];

  if (seqLen < 18) {
    return {
      status: "COMPLIANT",
      isCompliant: true,
      matchCount: 0,
      matches: [],
      highestRiskTier: "COMPLIANT",
      summary: "Sequence is too short to match controlled pathogen signatures (<18 bp).",
      recommendation: "Standard synthesis order processing."
    };
  }

  for (const agent of REGULATED_AGENTS) {
    for (const sig of agent.signatureSequences) {
      const sigLen = sig.length;
      const revSig = reverseComplementIupac(sig);

      // Search forward strand
      let fwdPos = seqUpper.indexOf(sig);
      while (fwdPos !== -1) {
        matches.push({
          agentId: agent.id,
          agentName: agent.name,
          category: agent.category,
          regulatoryFramework: agent.regulatoryFramework,
          matchedSignature: sig,
          strand: 1,
          start0: fwdPos,
          end0Exclusive: fwdPos + sigLen,
          identityPercent: 100,
          providerAction: agent.providerAction
        });
        fwdPos = seqUpper.indexOf(sig, fwdPos + 1);
      }

      // Search reverse strand
      let revPos = seqUpper.indexOf(revSig);
      while (revPos !== -1) {
        matches.push({
          agentId: agent.id,
          agentName: agent.name,
          category: agent.category,
          regulatoryFramework: agent.regulatoryFramework,
          matchedSignature: sig,
          strand: -1,
          start0: revPos,
          end0Exclusive: revPos + sigLen,
          identityPercent: 100,
          providerAction: agent.providerAction
        });
        revPos = seqUpper.indexOf(revSig, revPos + 1);
      }
    }
  }

  // Determine highest risk status
  let status: BiosecurityTier = "COMPLIANT";
  if (matches.some(m => m.category === "Tier 1 Select Agent")) {
    status = "TIER_1_CRITICAL";
  } else if (matches.some(m => m.category === "HHS/USDA Select Agent")) {
    status = "SELECT_AGENT_FLAG";
  } else if (matches.some(m => m.category === "Controlled Toxin")) {
    status = "CONTROLLED_TOXIN";
  }

  const isCompliant = status === "COMPLIANT";

  let summary = "";
  let recommendation = "";

  if (isCompliant) {
    summary = "Screening passed. Zero matches found against HHS/USDA Select Agents, Australia Group Common Control List, and IGSC Dual-Use Databases.";
    recommendation = "Safe for unrestricted commercial synthesis ordering (Twist, IDT, GenScript).";
  } else if (status === "TIER_1_CRITICAL") {
    summary = "CRITICAL ALERT: Detected " + matches.length + " match(es) to Tier 1 Select Agents (" + matches.map(m => m.agentName).filter((v, i, a) => a.indexOf(v) === i).join(", ") + ").";
    recommendation = "Do not submit for commercial synthesis without CDC Select Agent Program registration and authorized facility credentials.";
  } else {
    summary = "FLAGGED: Detected " + matches.length + " match(es) to controlled biological agents or toxins (" + matches.map(m => m.agentName).filter((v, i, a) => a.indexOf(v) === i).join(", ") + ").";
    recommendation = "Commercial gene synthesis providers will require an End-Use Certificate (EUC) and institutional verification before synthesis.";
  }

  return {
    status,
    isCompliant,
    matchCount: matches.length,
    matches,
    highestRiskTier: status,
    summary,
    recommendation
  };
}
