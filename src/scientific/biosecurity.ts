import { reverseComplementIupac } from './restriction-analysis';

export type BiosecurityTier =
  | 'TIER_1_CRITICAL'
  | 'SELECT_AGENT_FLAG'
  | 'CONTROLLED_TOXIN'
  | 'DUAL_USE_FLAG'
  | 'NO_LOCAL_MATCH';

export interface RegulatedAgentDefinition {
  id: string;
  name: string;
  category: 'Tier 1 Select Agent' | 'HHS/USDA Select Agent' | 'Controlled Toxin' | 'Dual-Use Pathogen';
  regulatoryFramework: string;
  description: string;
  signatureSequences: string[];
  providerAction: string;
}

export const REGULATED_AGENTS: readonly RegulatedAgentDefinition[] = [
  // ─── Tier 1 Select Agents ─────────────────────────────────────────────
  {
    id: 'variola_major',
    name: 'Variola virus (Smallpox)',
    category: 'Tier 1 Select Agent',
    regulatoryFramework: 'HHS 42 CFR 73.3 / Australia Group / IGSC Tier 1',
    description: 'Causative agent of smallpox. Synthetic construction or acquisition is strictly prohibited under international treaty.',
    signatureSequences: [
      'ACCTAATTATACAGCGGACAT',
      'GTTACAATGTTAGTTCTACG',
      'CGGACGATTTGTTCCTCGTA'
    ],
    providerAction: 'Immediate automatic hold; mandatory notification to biological security authorities.'
  },
  {
    id: 'ebola_zaire',
    name: 'Ebola virus (Zaire ebolavirus)',
    category: 'Tier 1 Select Agent',
    regulatoryFramework: 'HHS 42 CFR 73.3 / Australia Group Category 1',
    description: 'Filovirus causing severe hemorrhagic fever with high mortality rates.',
    signatureSequences: [
      'ACCGGACAAATAGTCGACAG',
      'GTTGTCAACGACAACACTGA',
      'AGCTGGTAATTGGTTCGCTC'
    ],
    providerAction: 'Order hold; Requires validated BSL-4 facility credentials and CDC/USDA authorization.'
  },
  {
    id: 'ebola_sudan',
    name: 'Ebola virus (Sudan ebolavirus)',
    category: 'Tier 1 Select Agent',
    regulatoryFramework: 'HHS 42 CFR 73.3 / Australia Group Category 1',
    description: 'Filovirus causing severe hemorrhagic fever.',
    signatureSequences: [
      'ACCGGACAAGTAGTCGACAG',
      'GTCATCAACGACAACACTGA',
      'TGCTGGTAATTGGTTCTCTC'
    ],
    providerAction: 'Order hold; Requires validated BSL-4 credentials.'
  },
  {
    id: 'marburg_virus',
    name: 'Marburg virus (Marburg marburgvirus)',
    category: 'Tier 1 Select Agent',
    regulatoryFramework: 'HHS 42 CFR 73.3 / Australia Group Category 1',
    description: 'Filovirus closely related to Ebola causing severe hemorrhagic fever.',
    signatureSequences: [
      'TGTCGATCGGTTTCAGTAGC',
      'GCTCAATGGACAACTCGTCA',
      'CGATCCGTTCTTGTTGCTCA'
    ],
    providerAction: 'Order hold; Requires validated BSL-4 facility credentials and authorization.'
  },
  {
    id: 'bacillus_anthracis',
    name: 'Bacillus anthracis (Lethal / Edema Factor)',
    category: 'Tier 1 Select Agent',
    regulatoryFramework: 'HHS/USDA 42 CFR 73.3',
    description: 'Causative agent of anthrax. Major virulence factor pXO1 toxin genes.',
    signatureSequences: [
      'TTGGATGAAATCATCACTGC',
      'GACGCAATCAACGAAACTGT',
      'ACGTTTACCATGACCGGTTG'
    ],
    providerAction: 'Requires Select Agent Program registration and CDC transfer approval.'
  },
  {
    id: 'botulinum_neurotoxin',
    name: 'Clostridium botulinum neurotoxin (BoNT A/B/E/F)',
    category: 'Tier 1 Select Agent',
    regulatoryFramework: 'HHS 42 CFR 73.3 / CDC Controlled Toxin',
    description: 'Extremely potent bacterial neurotoxin blocking acetylcholine release at neuromuscular junctions.',
    signatureSequences: [
      'CCAAATTCATCCATGGTACC',
      'AATTTCCAGATAAACTTGCC',
      'TTAGCTAATGCAGCTTGTAC'
    ],
    providerAction: 'Order hold; quantities >0.5 mg require federal registration; provider screening verification.'
  },
  {
    id: 'yersinia_pestis',
    name: 'Yersinia pestis (Plague)',
    category: 'Tier 1 Select Agent',
    regulatoryFramework: 'HHS/USDA 42 CFR 73.3',
    description: 'Causative agent of bubonic and pneumonic plague.',
    signatureSequences: [
      'GTCATCAATGTCACCGTTCC',
      'CAACGCAGATAAACTTGTCG',
      'TACCTGACCGAAACTGTTCC'
    ],
    providerAction: 'Select Agent registration required; customer credentialing review.'
  },
  {
    id: 'francisella_tularensis',
    name: 'Francisella tularensis (Tularemia)',
    category: 'Tier 1 Select Agent',
    regulatoryFramework: 'HHS/USDA 42 CFR 73.3',
    description: 'High-infectivity intracellular bacterium causing tularemia.',
    signatureSequences: [
      'ACTGCTAAAGTAGCAGATAC',
      'GTTGTTGCTAAAGTAGCAGA',
      'TACCAACTAAACCAGTTGCT'
    ],
    providerAction: 'Select Agent registration required.'
  },
  {
    id: 'burkholderia_mallei',
    name: 'Burkholderia mallei (Glanders)',
    category: 'Tier 1 Select Agent',
    regulatoryFramework: 'HHS/USDA 42 CFR 73.3',
    description: 'Zoonotic pathogen causing glanders in equids and humans.',
    signatureSequences: [
      'CGCGTCAACGAAACTGTTCC',
      'TCGTCGATAAAGTCGATGTC',
      'GCTGAACATGACCGTTGTCG'
    ],
    providerAction: 'Select Agent registration required.'
  },

  // ─── HHS/USDA Select Agents & Dual-Use Pathogens ───────────────────────
  {
    id: 'monkeypox_virus',
    name: 'Monkeypox virus (Mpox clade I / II)',
    category: 'HHS/USDA Select Agent',
    regulatoryFramework: 'HHS 42 CFR 73.4 / WHO / IGSC Screening Guidance',
    description: 'Orthopoxvirus causing Mpox disease with systemic lesions.',
    signatureSequences: [
      'ACCTAATTATACGGCGGACAT',
      'GTTATAATGTTAGTTCTACG',
      'CGGACGATTTGTTCCTCGTA'
    ],
    providerAction: 'Review order against authorized laboratory list; secondary verification required.'
  },
  {
    id: 'hendra_virus',
    name: 'Hendra virus (Henipavirus)',
    category: 'HHS/USDA Select Agent',
    regulatoryFramework: 'HHS 42 CFR 73.3 / Australia Group Category 1',
    description: 'Zoonotic paramyxovirus with high case fatality in humans and equids.',
    signatureSequences: [
      'GTCGATAATCGTCAACAACA',
      'TGCTGAACAAGAACTTGCTC',
      'ACCGGTTATGATCAACAACG'
    ],
    providerAction: 'BSL-4 authorization and customer verification required.'
  },
  {
    id: 'nipah_virus',
    name: 'Nipah virus (Henipavirus)',
    category: 'HHS/USDA Select Agent',
    regulatoryFramework: 'HHS 42 CFR 73.3 / Australia Group Category 1',
    description: 'Henipavirus causing severe encephalitis and respiratory illness.',
    signatureSequences: [
      'GTCGATAACCGTCAACAACA',
      'TGCTGAACAAGAACTTGCTC',
      'ACCGGTTATGATCAACAACG'
    ],
    providerAction: 'BSL-4 authorization and customer verification required.'
  },
  {
    id: 'sars_cov_1',
    name: 'SARS-CoV-1 (Severe Acute Respiratory Syndrome Coronavirus)',
    category: 'HHS/USDA Select Agent',
    regulatoryFramework: 'HHS 42 CFR 73.4 / Select Agent List',
    description: 'Lineage B betacoronavirus causing Severe Acute Respiratory Syndrome.',
    signatureSequences: [
      'ACCAACCAACTTTCGATCTC',
      'GTTCTCTAAACGAACTTTAA',
      'TGTAGATCTGTTCTCTAAAC'
    ],
    providerAction: 'Customer credential verification required; BSL-3 registration.'
  },
  {
    id: 'mers_cov',
    name: 'MERS-CoV (Middle East Respiratory Syndrome Coronavirus)',
    category: 'Dual-Use Pathogen',
    regulatoryFramework: 'Australia Group Dual-Use List / IGSC Screening',
    description: 'Lineage C betacoronavirus causing severe respiratory disease.',
    signatureSequences: [
      'GACCAACTTTCGATCTCTTG',
      'TGTAGATCTGTTCTCTAAAC',
      'CGTTAGATCTGTTCTCTAAA'
    ],
    providerAction: 'Screening match review; dual-use assessment required.'
  },
  {
    id: 'lassa_virus',
    name: 'Lassa virus (Arenaviridae)',
    category: 'HHS/USDA Select Agent',
    regulatoryFramework: 'HHS 42 CFR 73.4 / Australia Group Category 1',
    description: 'Arenavirus causing Lassa hemorrhagic fever in West Africa.',
    signatureSequences: [
      'CGCGTCAACGAAACTGTTCC',
      'TCGTCGATAAAGTCGATGTC',
      'GCTGAACATGACCGTTGTCG'
    ],
    providerAction: 'BSL-4 authorization required.'
  },
  {
    id: 'cchf_virus',
    name: 'Crimean-Congo Hemorrhagic Fever virus (CCHFV)',
    category: 'HHS/USDA Select Agent',
    regulatoryFramework: 'HHS 42 CFR 73.4 / Australia Group Category 1',
    description: 'Nairovirus causing severe viral hemorrhagic fever with 30% case fatality.',
    signatureSequences: [
      'TCTCAAAGATATCGTTCAAC',
      'AGATGTTGCTCAATGTTCTC',
      'TTCAGTTGATAAACTTGCTC'
    ],
    providerAction: 'BSL-4 authorization required.'
  },

  // ─── Controlled Biological Toxins ─────────────────────────────────────
  {
    id: 'ricin_toxin',
    name: 'Ricin toxin (Ricinus communis A-chain)',
    category: 'Controlled Toxin',
    regulatoryFramework: 'HHS/USDA 42 CFR 73.3 / Chemical Weapons Convention Schedule 1',
    description: 'Ribosome-inactivating protein (RIP) causing systemic organ failure.',
    signatureSequences: [
      'TTGATGTTAGCACTTCCTGT',
      'ATTTACCCAATTTTGGATCC',
      'TTGTCACCAACCAACTTGCC',
      'GATCTTTTACCAACTTGCCC'
    ],
    providerAction: 'Requires End-Use Certificate and provider screening verification.'
  },
  {
    id: 'staphylococcal_enterotoxin_b',
    name: 'Staphylococcal Enterotoxin B (SEB)',
    category: 'Controlled Toxin',
    regulatoryFramework: 'HHS 42 CFR 73.3 / Australia Group Controlled Toxin',
    description: 'Superantigen toxin causing toxic shock syndrome.',
    signatureSequences: [
      'TTTACCAATTTTGGATCCAA',
      'TCACCAACCAACTTGCCAAA',
      'CTTTTACCAACTTGCCCAAA'
    ],
    providerAction: 'Select Agent registration required for quantities >100 mg.'
  }
] as const;

export interface BiosecurityScreeningResult {
  isCompliant: boolean;
  status: BiosecurityTier;
  overallTier: BiosecurityTier;
  matchCount: number;
  flaggedHitsCount: number;
  matches: BiosecurityMatch[];
  diagnosticNotice: string;
  recommendation: string;
  summary: string;
}

export type BiosecurityScreeningReport = BiosecurityScreeningResult;

export interface BiosecurityMatch {
  agentId: string;
  agentName: string;
  category: string;
  regulatoryFramework: string;
  start0: number;
  end0Exclusive: number;
  start1: number;
  end1: number;
  matchedKmerLength: number;
  matchedSignature: string;
  strand: 1 | -1;
  providerAction: string;
  severity: 'CRITICAL_HOLD' | 'REGULATORY_REVIEW' | 'DUAL_USE_NOTICE';
}

/**
 * Screens nucleotide sequences against local diagnostic k-mer signatures of
 * regulated select agents and dual-use pathogens.
 */
export function screenBiosecurity(sequence: string, topology: 'linear' | 'circular'): BiosecurityScreeningResult {
  const seqUpper = sequence.toUpperCase().replace(/[\s\d\-.]/g, '');
  const seqLen = seqUpper.length;
  const matches: BiosecurityMatch[] = [];

  if (seqLen < 18) {
    return {
      isCompliant: true,
      status: 'NO_LOCAL_MATCH',
      overallTier: 'NO_LOCAL_MATCH',
      matchCount: 0,
      flaggedHitsCount: 0,
      matches: [],
      diagnosticNotice: 'Diagnostic match screening only; not a formal legal/compliance determination.',
      recommendation: 'No additional regulatory reviews required for standard benign plasmid cloning.',
      summary: 'No matches found for regulated select agent or toxin k-mer signatures.'
    };
  }

  // Circular search buffer: allow k-mers of up to 40nt to cross origin
  const searchable = topology === 'circular'
    ? seqUpper + seqUpper.slice(0, 40)
    : seqUpper;

  for (const agent of REGULATED_AGENTS) {
    for (const sig of agent.signatureSequences) {
      const sigLen = sig.length;
      const sigRC = reverseComplementIupac(sig);

      // 1. Forward match
      let pos = searchable.indexOf(sig);
      while (pos !== -1 && pos < seqLen) {
        const start0 = pos;
        const end0Exclusive = (pos + sigLen) > seqLen && topology === 'circular' ? (pos + sigLen) % seqLen : pos + sigLen;
        const start1 = pos + 1;
        const end1 = ((pos + sigLen - 1) % seqLen) + 1;

        matches.push({
          agentId: agent.id,
          agentName: agent.name,
          category: agent.category,
          regulatoryFramework: agent.regulatoryFramework,
          start0,
          end0Exclusive,
          start1,
          end1,
          matchedKmerLength: sigLen,
          matchedSignature: sig,
          strand: 1,
          providerAction: agent.providerAction,
          severity: agent.category === 'Tier 1 Select Agent' ? 'CRITICAL_HOLD' : 'REGULATORY_REVIEW'
        });

        pos = searchable.indexOf(sig, pos + 1);
      }

      // 2. Reverse complement match
      if (sigRC !== sig) {
        let rcPos = searchable.indexOf(sigRC);
        while (rcPos !== -1 && rcPos < seqLen) {
          const start0 = rcPos;
          const end0Exclusive = (rcPos + sigLen) > seqLen && topology === 'circular' ? (rcPos + sigLen) % seqLen : rcPos + sigLen;
          const start1 = rcPos + 1;
          const end1 = ((rcPos + sigLen - 1) % seqLen) + 1;

          matches.push({
            agentId: agent.id,
            agentName: agent.name,
            category: agent.category,
            regulatoryFramework: agent.regulatoryFramework,
            start0,
            end0Exclusive,
            start1,
            end1,
            matchedKmerLength: sigLen,
            matchedSignature: sig,
            strand: -1,
            providerAction: agent.providerAction,
            severity: agent.category === 'Tier 1 Select Agent' ? 'CRITICAL_HOLD' : 'REGULATORY_REVIEW'
          });

          rcPos = searchable.indexOf(sigRC, rcPos + 1);
        }
      }
    }
  }

  // Determine overall tier
  let overallTier: BiosecurityTier = 'NO_LOCAL_MATCH';
  if (matches.some(m => m.category === 'Tier 1 Select Agent')) {
    overallTier = 'TIER_1_CRITICAL';
  } else if (matches.some(m => m.category === 'Controlled Toxin')) {
    overallTier = 'CONTROLLED_TOXIN';
  } else if (matches.length > 0) {
    overallTier = 'SELECT_AGENT_FLAG';
  }

  const isCompliant = overallTier === 'NO_LOCAL_MATCH';

  const recommendation = isCompliant
    ? 'No additional regulatory reviews required for standard benign plasmid cloning.'
    : overallTier === 'TIER_1_CRITICAL'
    ? 'Immediate hold required: sequence contains signature of a Tier 1 Select Agent. Requires federal registration.'
    : overallTier === 'CONTROLLED_TOXIN'
    ? 'Requires End-Use Certificate and provider screening verification before ordering.'
    : 'Flagged for dual-use institutional review and provider authorization verification.';

  const summary = isCompliant
    ? 'No matches found for regulated select agent or toxin k-mer signatures.'
    : `Detected ${matches.length} signature motif match(es) against ${new Set(matches.map(m => m.agentName)).size} regulated agent(s).`;

  return {
    isCompliant,
    status: overallTier,
    overallTier,
    matchCount: matches.length,
    flaggedHitsCount: matches.length,
    matches,
    diagnosticNotice: 'Diagnostic match screening only; not a formal legal/compliance determination.',
    recommendation,
    summary
  };
}
