import { describe, it, expect } from 'vitest';
import { baseX, segmentWidth, BASES_PER_LINE, GROUP_SIZE, positionXToLineIndex } from '../../src/components/sequence/sequence-geometry';

describe('Sequence Geometry', () => {
  it('computes correct baseX for early groups', () => {
    expect(BASES_PER_LINE).toBe(60);
    expect(GROUP_SIZE).toBe(10);
    
    // Group 0, index 0 -> 0 * 10 + 0 * 1 + 0 = 0
    expect(baseX(0)).toBe(0);
    // Group 0, index 9 -> 9
    expect(baseX(9)).toBe(9);
    // Group 1, index 10 -> 1 * 10 + 1 * 1 + 0 = 11
    expect(baseX(10)).toBe(11);
    // Group 5, index 59 -> 5 * 10 + 5 * 1 + 9 = 50 + 5 + 9 = 64
    expect(baseX(59)).toBe(64);
  });

  it('computes correct segment width without crossing gap', () => {
    // 0 to 5 exclusive -> bases 0,1,2,3,4. baseX(4) = 4. baseX(0) = 0. width = 5.
    expect(segmentWidth(0, 5)).toBe(5);
  });

  it('computes correct segment width crossing a gap', () => {
    // 8 to 12 exclusive -> bases 8,9 (group 0) and 10,11 (group 1).
    // baseX(11) = 1*10 + 1*1 + 1 = 12
    // baseX(8) = 8
    // width = 12 - 8 + 1 = 5. (Wait, bases 8, 9, GAP, 10, 11 = 5 characters wide).
    expect(segmentWidth(8, 12)).toBe(5);
  });

  it('maps grouped glyph positions back to the exact base instead of counting visual gaps', () => {
    const charWidth = 9;
    expect(positionXToLineIndex(11 * charWidth + 0.2 * charWidth, charWidth)).toBe(10);
    expect(positionXToLineIndex(33 * charWidth + 4.4 * charWidth, charWidth)).toBe(34);
    expect(positionXToLineIndex(10.5 * charWidth, charWidth)).toBe(9);
  });
});
