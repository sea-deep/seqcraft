const fs = require('fs');
const content = fs.readFileSync('src/scientific/pcr.ts', 'utf-8');

const targetStr = `  const allBindings = [...forwardPrimerBindings, ...reversePrimerBindings];
  const plusOneBindings = allBindings.filter(b => b.extensionDirection === 1);
  const minusOneBindings = allBindings.filter(b => b.extensionDirection === -1);

  const productsMap = new Map<string, PCRProduct>();

  for (const plusBinding of plusOneBindings) {
    for (const minusBinding of minusOneBindings) {
      // Must come from different supplied primers to form a pair 
      // (Wait, can a single primer PCR itself? Yes, if it has +1 and -1 bindings. 
      // The user prompt: "evaluate all four combinations... Must come from different bindings"
      // Actually, standard PCR can use a single primer for both ends if it binds both strands. 
      // But here we are given forwardPrimer and reversePrimer. If forwardPrimer binds both +1 and -1, it can amplify alone.
      // The instruction says "return every valid exact amplicon that those primers can produce."
      // "evaluate all four combinations" for 2 fwd and 2 rev bindings.
      
      // Let's ensure the +1 binding and -1 binding form a valid pair.
      const plus5 = plusBinding.fivePrimeBase0;
      const minus5 = minusBinding.fivePrimeBase0;`;

const replacement = `  const productsMap = new Map<string, PCRProduct>();

  for (const fwdBinding of forwardPrimerBindings) {
    for (const revBinding of reversePrimerBindings) {
      let plusBinding: PrimerBinding;
      let minusBinding: PrimerBinding;
      
      if (fwdBinding.extensionDirection === 1 && revBinding.extensionDirection === -1) {
        plusBinding = fwdBinding;
        minusBinding = revBinding;
      } else if (fwdBinding.extensionDirection === -1 && revBinding.extensionDirection === 1) {
        plusBinding = revBinding;
        minusBinding = fwdBinding;
      } else {
        continue;
      }

      const plus5 = plusBinding.fivePrimeBase0;
      const minus5 = minusBinding.fivePrimeBase0;`;

const newContent = content.replace(targetStr, replacement);
fs.writeFileSync('src/scientific/pcr.ts', newContent);
