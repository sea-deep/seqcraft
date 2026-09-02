type AminoAcidRange = {
  start: number;
  end: number;
  locations?: AminoAcidRange[];
  [key: string]: unknown;
};

/**
 * The GenBank parser imports one protein-coordinate helper from TeselaGen's
 * broad sequence-utils bundle. Keeping the tiny deterministic conversion here
 * prevents unrelated diff/ID packages from entering SeqCraft's browser build.
 */
export function convertAACaretPositionOrRangeToDna(value: number | AminoAcidRange): number | AminoAcidRange {
  if (typeof value === 'number') return value * 3;
  return {
    ...value,
    start: value.start > -1 ? value.start * 3 : value.start,
    end: value.end > -1 ? value.end * 3 + 2 : value.end,
    locations: value.locations?.map(location => convertAACaretPositionOrRangeToDna(location) as AminoAcidRange),
  };
}

const GENBANK_FEATURE_TYPES = [
  'CDS', 'gene', 'promoter', 'terminator', 'rep_origin', 'source', 'primer_bind',
  'misc_feature', 'misc_binding', 'protein_bind', 'RBS', 'mRNA', 'rRNA', 'tRNA',
  'ncRNA', 'exon', 'intron', 'regulatory', 'repeat_region', 'mobile_element',
];

export function getFeatureTypes(): string[] {
  return [...GENBANK_FEATURE_TYPES];
}

type FilterOptions = {
  additionalValidChars?: string;
  isProtein?: boolean;
  isRna?: boolean;
  isRNA?: boolean;
  name?: string;
};

export function filterSequenceString(sequence = '', options: FilterOptions = {}): [string, string[]] {
  const baseAlphabet = options.isProtein
    ? 'ABCDEFGHIKLMNPQRSTVWXYZJUO*'
    : options.isRna || options.isRNA
      ? 'ACGURYSWKMBDHVNXT'
      : 'ACGTURYSWKMBDHVNX';
  const accepted = new Set(`${baseAlphabet}${options.additionalValidChars ?? ''}`.toUpperCase());
  let filtered = '';
  const invalid = new Set<string>();
  for (const character of sequence) {
    if (accepted.has(character.toUpperCase())) filtered += character;
    else invalid.add(character);
  }
  const warnings = invalid.size === 0
    ? []
    : [`${options.name ? `Sequence ${options.name}: ` : ''}Invalid character(s) removed: ${[...invalid].slice(0, 100).join(', ')}`];
  return [filtered, warnings];
}

export function guessIfSequenceIsDnaAndNotProtein(
  sequence: string,
  options: { threshold?: number; loose?: boolean; dnaLetters?: string[] } = {},
): boolean {
  if (!sequence) return true;
  const alphabet = options.dnaLetters
    ?? (options.loose ? [...'GATCURYSWKMBDHVN'] : [...'GATCU']);
  const allowed = new Set(alphabet.map(character => character.toUpperCase()));
  let matches = 0;
  for (const character of sequence) if (allowed.has(character.toUpperCase())) matches += 1;
  return matches / sequence.length > (options.threshold ?? 0.9);
}
