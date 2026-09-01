const fs = require('fs');
let code = fs.readFileSync('src/components/sequence/FeatureSegment.tsx', 'utf8');

// Apply outline and opacity based on isSelected
code = code.replace(
  /className="absolute flex items-center overflow-hidden whitespace-nowrap cursor-pointer z-10 transition-colors opacity-80 hover:opacity-100"/,
  'className={`absolute flex items-center overflow-hidden whitespace-nowrap cursor-pointer z-10 transition-colors ${isSelected ? "opacity-100 outline outline-1 outline-white/80 z-20" : "opacity-80 hover:opacity-100"}`}\n      onClick={onClick}'
);

fs.writeFileSync('src/components/sequence/FeatureSegment.tsx', code);
