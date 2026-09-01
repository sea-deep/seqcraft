const { genbankToJson } = require('@teselagen/bio-parsers');
const gb = `LOCUS       SCU49845     5028 bp    DNA             PLN       21-JUN-1999
FEATURES             Location/Qualifiers
     gene            join(10..20,30..40)
                     /gene="CPA1"
     gene            complement(join(10..20,30..40))
                     /gene="CPA2"
     gene            complement(100..200)
                     /gene="CPA3"
ORIGIN
        1 gatc
//
`;
genbankToJson(gb, function(result) {
  console.log(JSON.stringify(result, null, 2));
});
