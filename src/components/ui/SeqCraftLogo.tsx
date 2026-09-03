/**
 * SeqCraft Minecraft Pickaxe Logo – inline SVG pixel art.
 * Renders the canonical 16×16 teal-diamond pickaxe at any size
 * using `shape-rendering: crispEdges` for pixel-perfect scaling.
 */
export function SeqCraftLogo({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      aria-label="SeqCraft logo"
      role="img"
    >
      {/* Diamond head */}
      <rect x="6" y="2" width="1" height="1" fill="#0E3F36"/>
      <rect x="7" y="2" width="1" height="1" fill="#0E3F36"/>
      <rect x="8" y="2" width="1" height="1" fill="#0E3F36"/>
      <rect x="9" y="2" width="1" height="1" fill="#0E3F36"/>
      <rect x="10" y="2" width="1" height="1" fill="#0E3F36"/>
      <rect x="5" y="3" width="1" height="1" fill="#0E3F36"/>
      <rect x="6" y="3" width="1" height="1" fill="#CCFBF1"/>
      <rect x="7" y="3" width="1" height="1" fill="#5EEAD4"/>
      <rect x="8" y="3" width="1" height="1" fill="#2DD4BF"/>
      <rect x="9" y="3" width="1" height="1" fill="#2DD4BF"/>
      <rect x="10" y="3" width="1" height="1" fill="#14B8A6"/>
      <rect x="11" y="3" width="1" height="1" fill="#0E3F36"/>
      <rect x="6" y="4" width="1" height="1" fill="#0E3F36"/>
      <rect x="7" y="4" width="1" height="1" fill="#042F2E"/>
      <rect x="8" y="4" width="1" height="1" fill="#042F2E"/>
      <rect x="9" y="4" width="1" height="1" fill="#042F2E"/>
      <rect x="10" y="4" width="1" height="1" fill="#14B8A6"/>
      <rect x="11" y="4" width="1" height="1" fill="#0F766E"/>
      <rect x="11" y="5" width="1" height="1" fill="#14B8A6"/>
      <rect x="12" y="5" width="1" height="1" fill="#0F766E"/>
      <rect x="13" y="5" width="1" height="1" fill="#042F2E"/>
      <rect x="12" y="6" width="1" height="1" fill="#0F766E"/>
      <rect x="13" y="6" width="1" height="1" fill="#14B8A6"/>
      <rect x="14" y="6" width="1" height="1" fill="#042F2E"/>
      <rect x="12" y="7" width="1" height="1" fill="#042F2E"/>
      <rect x="13" y="7" width="1" height="1" fill="#0F766E"/>
      <rect x="14" y="7" width="1" height="1" fill="#042F2E"/>
      <rect x="12" y="8" width="1" height="1" fill="#042F2E"/>
      <rect x="13" y="8" width="1" height="1" fill="#0F766E"/>
      <rect x="14" y="8" width="1" height="1" fill="#042F2E"/>
      <rect x="12" y="9" width="1" height="1" fill="#042F2E"/>
      <rect x="13" y="9" width="1" height="1" fill="#14B8A6"/>
      <rect x="14" y="9" width="1" height="1" fill="#042F2E"/>
      <rect x="12" y="10" width="1" height="1" fill="#042F2E"/>
      <rect x="13" y="10" width="1" height="1" fill="#5EEAD4"/>
      <rect x="14" y="10" width="1" height="1" fill="#042F2E"/>
      <rect x="13" y="11" width="1" height="1" fill="#042F2E"/>
      {/* Wood handle */}
      <rect x="12" y="3" width="1" height="1" fill="#493615"/>
      <rect x="13" y="3" width="1" height="1" fill="#684E1E"/>
      <rect x="12" y="4" width="1" height="1" fill="#896727"/>
      <rect x="13" y="4" width="1" height="1" fill="#281E0B"/>
      <rect x="10" y="5" width="1" height="1" fill="#493615"/>
      <rect x="9" y="6" width="1" height="1" fill="#493615"/>
      <rect x="10" y="6" width="1" height="1" fill="#684E1E"/>
      <rect x="11" y="6" width="1" height="1" fill="#281E0B"/>
      <rect x="8" y="7" width="1" height="1" fill="#493615"/>
      <rect x="9" y="7" width="1" height="1" fill="#896727"/>
      <rect x="10" y="7" width="1" height="1" fill="#281E0B"/>
      <rect x="7" y="8" width="1" height="1" fill="#493615"/>
      <rect x="8" y="8" width="1" height="1" fill="#684E1E"/>
      <rect x="9" y="8" width="1" height="1" fill="#281E0B"/>
      <rect x="6" y="9" width="1" height="1" fill="#493615"/>
      <rect x="7" y="9" width="1" height="1" fill="#896727"/>
      <rect x="8" y="9" width="1" height="1" fill="#281E0B"/>
      <rect x="5" y="10" width="1" height="1" fill="#493615"/>
      <rect x="6" y="10" width="1" height="1" fill="#684E1E"/>
      <rect x="7" y="10" width="1" height="1" fill="#281E0B"/>
      <rect x="4" y="11" width="1" height="1" fill="#493615"/>
      <rect x="5" y="11" width="1" height="1" fill="#896727"/>
      <rect x="6" y="11" width="1" height="1" fill="#281E0B"/>
      <rect x="3" y="12" width="1" height="1" fill="#493615"/>
      <rect x="4" y="12" width="1" height="1" fill="#684E1E"/>
      <rect x="5" y="12" width="1" height="1" fill="#281E0B"/>
      <rect x="2" y="13" width="1" height="1" fill="#493615"/>
      <rect x="3" y="13" width="1" height="1" fill="#896727"/>
      <rect x="4" y="13" width="1" height="1" fill="#281E0B"/>
      <rect x="2" y="14" width="1" height="1" fill="#281E0B"/>
      <rect x="3" y="14" width="1" height="1" fill="#281E0B"/>
    </svg>
  );
}
