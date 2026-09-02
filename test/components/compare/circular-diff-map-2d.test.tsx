import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CircularDiffMap2D } from '../../../src/components/compare/CircularDiffMap2D';
import { createCircularDiffGeometry } from '../../../src/geometry/circular-diff-geometry';
import { diffBiologicalSequences } from '../../../src/scientific/biological-sequence-diff';

describe('CircularDiffMap2D', () => {
  it('renders structured feature and difference geometry accessibly', () => {
    const result = diffBiologicalSequences(
      { id: 'r', name: 'R', topology: 'circular', sequence: 'AACCGGTT', features: [] },
      { id: 'q', name: 'Q', topology: 'circular', sequence: 'AATCGGTT', features: [] },
    );
    const geometry = createCircularDiffGeometry(result);
    const { container } = render(<CircularDiffMap2D geometry={geometry} />);
    expect(screen.getByRole('img', { name: /canonical circular difference map/i })).not.toBeNull();
    expect(container.querySelectorAll('[data-difference-id]')).toHaveLength(1);
    expect(container.querySelector('[data-geometry-id]')?.getAttribute('data-geometry-id')).toBe(geometry.id);
  });
});
