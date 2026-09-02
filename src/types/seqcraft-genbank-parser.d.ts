declare module '@seqcraft/genbank-parser' {
  type GenBankParserOptions = {
    inclusive1BasedStart?: boolean;
    inclusive1BasedEnd?: boolean;
  };

  export default function genbankToJson(data: string, options?: GenBankParserOptions): unknown[];
}
