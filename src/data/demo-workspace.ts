import { handleImportDocument } from '../workflows/import-document';
import { ScientificSequence } from '../scientific/nucleotide';
import { useWorkspaceStore } from '../state/workspace-store';

export const DEMO_GENBANK = `LOCUS       pUC19               2686 bp    DNA     circular SYN 18-JUL-2012
DEFINITION  Cloning vector pUC19.
ACCESSION   M77789
VERSION     M77789.2
KEYWORDS    cloning vector.
SOURCE      cloning vector pUC19
  ORGANISM  cloning vector pUC19
            other sequences; artificial sequences; vectors.
FEATURES             Location/Qualifiers
     source          1..2686
                     /organism="cloning vector pUC19"
                     /mol_type="other DNA"
                     /db_xref="taxon:2676757"
     gene            complement(162..1196)
                     /gene="AmpR"
     CDS             complement(162..1196)
                     /gene="AmpR"
                     /product="beta-lactamase"
                     /note="confers resistance to ampicillin, carbenicillin, and
                     related antibiotics"
     promoter        complement(1210..1298)
                     /note="bla promoter"
                     /note="promoter for the ampicillin resistance (bla) gene"
     rep_origin      1482..2070
                     /direction=RIGHT
                     /note="ori"
     gene            2380..2686
                     /gene="lacZ"
     CDS             2380..2686
                     /gene="lacZ"
                     /product="beta-galactosidase alpha peptide"
     misc_feature    2397..2447
                     /note="MCS"
                     /note="multiple cloning site"
ORIGIN
        1 tcgcgcgttt cggtgatgac ggtgaaaacc tctgacacat gcagctcccg gagacggtca
       61 cagcttgtct gtaagcggat gccgggagca gacaagcccg tcagggcgcg tcagcgggtg
      121 ttggcgggtg tcggggctgg cttaactatg cggcatcaga gcagattgta ctgagagtgc
      181 accatatgcg gtgtgaaata ccgcacagat gcgtaaggag aaaataccgc atcaggcgcc
      241 attcgccatt caggctgcgc aactgttggg aagggcgatc ggtgcgggcc tcttcgctat
      301 tacgccagct ggcgaaaggg ggatgtgctg caaggcgatt aagttgggta acgccagggt
      361 tttcccagtc acgacgttgt aaaacgacgg ccagtgaatt cgagctcggt acccggggat
      421 cctctagagt cgacctgcag gcatgcaagc ttggcgtaat catggtcata gctgtttcct
      481 gtgtgaaatt gttatccgct cacaattcca cacaacatac gagccggaag cataaagtgt
      541 aaagcctggg gtgcctaatg agtgagctaa ctcacattaa ttgcgttgcg ctcactgccc
      601 gctttccagt cgggaaacct gtcgtgccag ctgcattaat gaatcggcca acgcgcgggg
      661 agaggcggtt tgcgtattgg gcgctcttcc gcttcctcgc tcactgactc gctgcgctcg
      721 gtcgttcggc tgcggcgagc ggtatcagct cactcaaagg cggtaatacg gttatccaca
      781 gaatcagggg ataacgcagg aaagaacatg tgagcaaaag gccagcaaaa ggccaggaac
      841 cgtaaaaagg ccgcgttgct ggcgtttttc cataggctcc gcccccctga cgagcatcac
      901 aaaaatcgac gctcaagtca gaggtggcga aacccgacag gactataaag ataccaggcg
      961 tttccccctg gaagctccct cgtgcgctct cctgttccga ccctgccgct taccggatac
     1021 ctgtccgcct ttctcccttc gggaagcgtg gcgctttctc atagctcacg ctgtaggtat
     1081 ctcagttcgg tgtaggtcgt tcgctccaag ctgggctgtg tgcacgaacc ccccgttcag
     1141 cccgaccgct gcgccttatc cggtaactat cgtcttgagt ccaacccggt aagacacgac
     1201 ttatcgccac tggcagcagc cactggtaac aggattagca gagcgaggta tgtaggcggt
     1261 gctacagagt tcttgaagtg gtggcctaac tacggctaca ctagaagaac agtatttggt
     1321 atctgcgctc tgctgaagcc agttaccttc ggaaaaagag ttggtagctc ttgatccggc
     1381 aaacaaacca ccgctggtag cggtggtttt tttgtttgca agcagcagat tacgcgcaga
     1441 aaaaaaggat ctcaagaaga tcctttgatc ttttctacgg ggtctgacgc tcagtggaac
     1501 gaaaactcac gttaagggat tttggtcatg agattatcaa aaaggatctt cacctagatc
     1561 cttttaaatt aaaaatgaag ttttaaatca atctaaagta tatatgagta aacttggtct
     1621 gacagttacc aatgcttaat cagtgaggca cctatctcag cgatctgtct atttcgttca
     1681 tccatagttg cctgactccc cgtcgtgtag ataactacga tacgggaggg cttaccatct
     1741 ggccccagtg ctgcaatgat accgcgagac ccacgctcac cggctccaga tttatcagca
     1801 ataaaccagc cagccggaag ggccgagcgc agaagtggtc ctgcaacttt atccgcctcc
     1861 atccagtcta ttaattgttg ccgggaagct agagtaagta gttcgccagt taatagtttg
     1921 cgcaacgttg ttgccattgc tacaggcatc gtggtgtcac gctcgtcgtt tggtatggct
     1981 tcattcagct ccggttccca acgatcaagg cgagttacat gatcccccat gttgtgcaaa
     2041 aaagcggtta gctccttcgg tcctccgatc gttgtcagaa gtaagttggc cgcagtgtta
     2101 tcactcatgg ttatggcagc actgcataat tctcttactg tcatgccatc cgtaagatgc
     2161 ttttctgtga ctggtgagta ctcaaccaag tcattctgag aatagtgtat gcggcgaccg
     2221 agttgctctt gcccggcgtc aatacgggat aataccgcgc cacatagcag aactttaaaa
     2281 gtgctcatca ttggaaaacg ttcttcgggg cgaaaactct caaggatctt accgctgttg
     2341 agatccagtt cgatgtaacc cactcgtgca cccaactgat cttcagcatc ttttactttc
     2401 accagcgttt ctgggtgagc aaaaacagga aggcaaaatg ccgcaaaaaa gggaataagg
     2461 gcgacacgga aatgttgaat actcatactc ttcctttttc aatattattg aagcatttat
     2521 cagggttatt gtctcatgag cggatacata tttgaatgta tttagaaaaa taaacaaata
     2581 ggggttccgc gcacatttcc ccgaaaagtg ccacctgacg tctaagaaac cattattatc
     2641 atgacattaa cctataaaaa taggcgtatc acgaggccct ttcgtc
//
`;

export function createDemoDonorDocument() {
  const leftFlank = "ATCGATCGATCG";
  const ecori = "GAATTC";
  const payload = "ATGCCGATCGATCGTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC";
  const hindiii = "AAGCTT";
  const rightFlank = "CGATCGATCGAT";
  
  const seq = leftFlank + ecori + payload + hindiii + rightFlank;
  
  return {
    length: seq.length,
    storageMode: 'memory' as const,
    id: 'demo-donor-1',
    name: 'Directional Cloning Donor',
    topology: 'linear' as const,
    sequence: new ScientificSequence(seq, 'DNA'),
    alphabet: 'DNA' as const,
    features: [
      {
        id: 'feat-demo-insert',
        name: 'Demo Insert',
        type: 'misc_feature' as const,
        strand: 1 as const,
        segments: [{ start0: leftFlank.length + ecori.length, end0Exclusive: leftFlank.length + ecori.length + payload.length }],
        qualifiers: {},
        source: 'manual' as const
      }
    ],
    primers: [],
    source: 'demo' as const,
    version: 1
  };
}

export function loadDemoWorkspace() {
  handleImportDocument(DEMO_GENBANK, 'pUC19 Demo');
  const store = useWorkspaceStore.getState();
  store.addDocument(createDemoDonorDocument());
}
