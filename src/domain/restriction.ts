export interface RestrictionEnzyme {
  id: string;
  name: string;
  recognitionSequence: string; // canonical 5' to 3' IUPAC sequence
  forwardCutOffset: number; // Cleavage on the 5'->3' strand relative to recognition start
  reverseCutOffset: number; // Cleavage on the 3'->5' strand relative to recognition start
}
