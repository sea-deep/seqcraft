import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { GenomicHero } from '../../../src/components/marketing/GenomicHero';
import { ProductDemonstrations } from '../../../src/components/marketing/ProductDemonstrations';

describe('GenomicHero Component', () => {
  it('renders the focused editorial headline, eyebrow, and actions', () => {
    const { container } = render(
      <MemoryRouter>
        <GenomicHero />
      </MemoryRouter>
    );

    expect(screen.getByText(/Design DNA without losing sight of a single base/i)).toBeInTheDocument();
    expect(screen.getByText(/Molecular Biology Workbench/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Launch SeqCraft/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open pUC19 demo/i })).toBeInTheDocument();

    // STRICT ZERO-GRADIENT CONTRACT VERIFICATION
    const html = container.innerHTML;
    expect(html).not.toMatch(/linear-gradient/i);
    expect(html).not.toMatch(/radial-gradient/i);
    expect(html).not.toMatch(/conic-gradient/i);
    expect(html).not.toMatch(/bg-gradient/i);
    expect(html).not.toMatch(/gradient-/i);
    expect(html).not.toMatch(/bg-clip-text/i);
  });

  it('renders the large circular plasmid map with real features and origin', () => {
    render(
      <MemoryRouter>
        <GenomicHero />
      </MemoryRouter>
    );

    expect(screen.getByText(/ORIGIN · 1/i)).toBeInTheDocument();
    expect(screen.getByText(/pUC19 dsDNA/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Interactive circular plasmid map of pUC19/i })).toBeInTheDocument();
  });

  it('renders the synchronized linear sequence strip and updates on locus selection', () => {
    render(
      <MemoryRouter>
        <GenomicHero />
      </MemoryRouter>
    );

    expect(screen.getByText(/SYNCHRONIZED SEQUENCE/i)).toBeInTheDocument();
    expect(screen.getByText(/5'→/i)).toBeInTheDocument();
    expect(screen.getByText(/→3'/i)).toBeInTheDocument();

    // Click AmpR locus on plasmid map
    const amprBtn = screen.getByRole('button', { name: /AmpR, resistance marker, 163 to 1196 bp/i });
    fireEvent.click(amprBtn);

    // Sequence strip should now display AmpR selection
    expect(screen.getAllByText(/AmpR/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/\[163..1196 bp · 1034 bp\]/i)).toBeInTheDocument();
  });
});

describe('ProductDemonstrations Component', () => {
  it('renders real biological demonstrations without marketing fluff', () => {
    const { container } = render(<ProductDemonstrations />);

    expect(screen.getByText(/01 \/\/ RESTRICTION DIGESTION/i)).toBeInTheDocument();
    expect(screen.getByText(/02 \/\/ PCR SIMULATION/i)).toBeInTheDocument();
    expect(screen.getByText(/03 \/\/ WEBMCP AGENT STAGING/i)).toBeInTheDocument();
    expect(screen.getByText(/Private by Architecture/i)).toBeInTheDocument();

    // STRICT ZERO-GRADIENT CONTRACT VERIFICATION
    const html = container.innerHTML;
    expect(html).not.toMatch(/linear-gradient/i);
    expect(html).not.toMatch(/radial-gradient/i);
    expect(html).not.toMatch(/conic-gradient/i);
    expect(html).not.toMatch(/bg-gradient/i);
  });

  it('allows toggling restriction enzymes and dynamically calculates fragment lengths', () => {
    render(<ProductDemonstrations />);

    expect(screen.getByText(/2,630 bp/i)).toBeInTheDocument();
    expect(screen.getAllByText(/56 bp/i).length).toBeGreaterThanOrEqual(1);

    // Toggle off EcoRI
    const ecoBtn = screen.getByRole('button', { name: /EcoRI · G↓AATTC/i });
    fireEvent.click(ecoBtn);

    // With single cut, expect linearized plasmid (2,686 bp)
    expect(screen.getByText(/Linearized pUC19/i)).toBeInTheDocument();
    expect(screen.getByText(/2,686 bp/i)).toBeInTheDocument();
  });

  it('provides interactive agent approval and rejection controls', () => {
    render(<ProductDemonstrations />);

    const approveBtn = screen.getByRole('button', { name: /Approve & Apply Mutation/i });
    fireEvent.click(approveBtn);

    expect(screen.getByText(/Mutation applied to local workspace/i)).toBeInTheDocument();
  });
});
