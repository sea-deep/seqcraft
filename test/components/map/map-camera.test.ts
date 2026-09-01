import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('PlasmidMap3D camera config', () => {
  it('configures OrbitControls with bounded zoom and damping', () => {
    const fileContent = fs.readFileSync(path.resolve(__dirname, '../../../src/components/map/PlasmidMap3D.tsx'), 'utf8');
    
    expect(fileContent).toContain('minDistance={17}');
    expect(fileContent).toContain('maxDistance={36}');
    expect(fileContent).toContain('enableDamping={true}');
    expect(fileContent).toContain('dampingFactor={0.09}');
    expect(fileContent).toContain('enablePan={false}');
  });
});
