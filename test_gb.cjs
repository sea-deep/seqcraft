const { genbankToJson } = require('genbank-parser');
const gb = `LOCUS       SCU49845     5028 bp    DNA             PLN       21-JUN-1999
FEATURES             Location/Qualifiers
     source          1..5028
                     /organism="Saccharomyces cerevisiae"
                     /db_xref="taxon:4932"
                     /chromosome="IX"
                     /map="9"
     gene            1..5028
                     /gene="CPA1"
ORIGIN
        1 gatc
//
`;
console.log(JSON.stringify(genbankToJson(gb), null, 2));
