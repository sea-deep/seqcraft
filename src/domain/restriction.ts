export const RESTRICTION_ENZYME_CLASSES = ['type_ii', 'type_iis'] as const;
export type RestrictionEnzymeClass = typeof RESTRICTION_ENZYME_CLASSES[number];

export const OVERHANG_POLARITIES = ['5prime', '3prime', 'blunt'] as const;
export type OverhangPolarity = typeof OVERHANG_POLARITIES[number];

export const RESTRICTION_CATEGORIES = ['common_cloning', 'type_iis', 'rare_cutter', 'diagnostic_4cutter', 'other'] as const;
export type RestrictionCategory = typeof RESTRICTION_CATEGORIES[number];

export interface RestrictionEnzyme {
  id: string;
  name: string;
  aliases?: readonly string[];
  recognitionSequence: string; // canonical 5' to 3' IUPAC sequence
  forwardCutOffset: number; // Cleavage on the 5'->3' strand relative to recognition start
  reverseCutOffset: number; // Cleavage on the 3'->5' strand relative to recognition start
  enzymeClass?: RestrictionEnzymeClass;
  category?: RestrictionCategory;
  topCutOffset?: number;
  bottomCutOffset?: number;
  overhangLength?: number;
  overhangPolarity?: OverhangPolarity;
  isCommon?: boolean;
  heatInactivationC?: number | 'none';
  supplierAvailability?: readonly string[];
}
