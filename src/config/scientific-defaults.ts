/**
 * Canonical scientific simulation parameters, protocol defaults, and biophysical thresholds.
 */

export interface PcrSimulationDefaults {
  readonly defaultReactionVolumeUl: number;
  readonly defaultTemplateVolumeUl: number;
  readonly defaultPrimerVolumeUl: number;
  readonly defaultMasterMixVolumeUl: number;
  readonly sodiumMm: number;
  readonly primerConcentrationNm: number;
  readonly extensionSecondsPerKb: number;
  readonly defaultAnnealingTempOffsetC: number;
}

export const PCR_DEFAULTS: PcrSimulationDefaults = {
  defaultReactionVolumeUl: 50,
  defaultTemplateVolumeUl: 2,
  defaultPrimerVolumeUl: 2.5,
  defaultMasterMixVolumeUl: 25,
  sodiumMm: 50,
  primerConcentrationNm: 200,
  extensionSecondsPerKb: 30,
  defaultAnnealingTempOffsetC: -5
} as const;

export interface CrisprDefaults {
  readonly defaultPam: 'NGG' | 'NNGRRT' | 'TTTV';
  readonly minQualityScore: number;
  readonly optimalGcMinPercent: number;
  readonly optimalGcMaxPercent: number;
  readonly minSpacerLengthBp: number;
  readonly polyTPenaltyThreshold: number;
}

export const CRISPR_DEFAULTS: CrisprDefaults = {
  defaultPam: 'NGG',
  minQualityScore: 0,
  optimalGcMinPercent: 40,
  optimalGcMaxPercent: 60,
  minSpacerLengthBp: 20,
  polyTPenaltyThreshold: 4
} as const;

export interface OpentronsDefaults {
  readonly apiLevel: string;
  readonly defaultRobotModel: 'OT-2' | 'Flex';
  readonly deadVolumeMultiplier: number;
  readonly defaultTuberackLabware: string;
  readonly defaultPlateLabware: string;
  readonly ot2AvailableTipSlots: readonly string[];
  readonly flexAvailableTipSlots: readonly string[];
}

export const OPENTRONS_DEFAULTS: OpentronsDefaults = {
  apiLevel: '2.15',
  defaultRobotModel: 'OT-2',
  deadVolumeMultiplier: 1.10, // 10% overage
  defaultTuberackLabware: 'opentrons_24_tuberack_generic_2ml_screwcap',
  defaultPlateLabware: 'nest_96_wellplate_100ul_pcr_full_skirt',
  ot2AvailableTipSlots: ['1', '2', '3', '4', '5', '8', '9', '10', '11'] as const,
  flexAvailableTipSlots: ['D1', 'D2', 'D3', 'C2', 'C3', 'B2', 'B3', 'A1', 'A2', 'A3'] as const
} as const;

export interface DigestDefaults {
  readonly defaultIncubationTempC: number;
  readonly defaultIncubationTimeMin: number;
  readonly defaultReactionVolumeUl: number;
  readonly defaultDnaVolumeUl: number;
  readonly defaultEnzymeVolumeUl: number;
  readonly defaultBufferVolumeUl: number;
}

export const DIGEST_DEFAULTS: DigestDefaults = {
  defaultIncubationTempC: 37,
  defaultIncubationTimeMin: 60,
  defaultReactionVolumeUl: 50,
  defaultDnaVolumeUl: 10,
  defaultEnzymeVolumeUl: 1,
  defaultBufferVolumeUl: 5
} as const;
