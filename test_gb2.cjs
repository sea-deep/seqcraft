const { genbankToJson } = require('genbank-parser');
const gb = `LOCUS       SCU49845     5028 bp    DNA             PLN       21-JUN-1999
FEATURES             Location/Qualifiers
     gene            join(10..20,30..40)
                     /gene="CPA1"
     gene            complement(join(10..20,30..40))
                     /gene="CPA2"
ORIGIN
        1 gatc
//
`;
console.log(JSON.stringify(genbankToJson(gb), null, 2));
