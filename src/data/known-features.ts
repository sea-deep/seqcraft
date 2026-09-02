import type { FeatureType } from '../domain/feature';

export interface KnownFeatureDefinition {
  id: string;
  name: string;
  type: FeatureType;
  sequence: string;
  description: string;
}

/**
 * Small, deliberately exact library of common synthetic-biology elements.
 * These are deterministic sequence matches, not inferred gene annotations.
 */
export const KNOWN_FEATURES: readonly KnownFeatureDefinition[] = [
  {
    id: 'puc-mcs',
    name: 'pUC multiple cloning site',
    type: 'misc_feature',
    sequence: 'GAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTT',
    description: 'Canonical pUC-family multiple cloning site.',
  },
  {
    id: 't7-promoter',
    name: 'T7 promoter',
    type: 'promoter',
    sequence: 'TAATACGACTCACTATAGGG',
    description: 'Consensus T7 RNA polymerase promoter.',
  },
  {
    id: 't3-promoter',
    name: 'T3 promoter',
    type: 'promoter',
    sequence: 'AATTAACCCTCACTAAAGGG',
    description: 'Consensus T3 RNA polymerase promoter.',
  },
  {
    id: 'sp6-promoter',
    name: 'SP6 promoter',
    type: 'promoter',
    sequence: 'ATTTAGGTGACACTATAG',
    description: 'Consensus SP6 RNA polymerase promoter.',
  },
  {
    id: 'lac-operator',
    name: 'lac operator',
    type: 'misc_feature',
    sequence: 'AATTGTGAGCGGATAACAATT',
    description: 'Canonical lac repressor operator sequence.',
  },
  {
    id: 'flag-tag',
    name: 'FLAG tag',
    type: 'tag',
    sequence: 'GACTACAAGGACGACGATGACAAG',
    description: 'Common coding sequence for the DYKDDDDK epitope tag.',
  },
  {
    id: 'ha-tag',
    name: 'HA tag',
    type: 'tag',
    sequence: 'TACCCATACGATGTTCCAGATTACGCT',
    description: 'Common coding sequence for the YPYDVPDYA epitope tag.',
  },
  {
    id: 'myc-tag',
    name: 'Myc tag',
    type: 'tag',
    sequence: 'GAACAAAAACTCATCTCAGAAGAGGATCTG',
    description: 'Common coding sequence for the EQKLISEEDL epitope tag.',
  },
  {
    id: 'six-his-tag',
    name: '6×His tag',
    type: 'tag',
    sequence: 'CATCACCATCACCATCAC',
    description: 'Common histidine-tag coding sequence.',
  },
] as const;
