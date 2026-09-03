import { Seq } from 'nucleotide-sequence';

export interface PrimerProperties {
  length: number;
  gcPercent: number;
  meltingTemperature: number;
  molecularWeight: number;
}

export function analyzePrimerProperties(primerSequence: string): PrimerProperties {
  const seq = new Seq('DNA').read(primerSequence.toUpperCase());
  return {
    length: primerSequence.length,
    gcPercent: Math.round(seq.gcContent() * 1000) / 10,
    meltingTemperature: primerSequence.length >= 14 && primerSequence.length <= 20 ? seq.meltingTemperature() : seq.meltingTemperatureNN(),
    molecularWeight: seq.molecularWeight(),
  };
}
