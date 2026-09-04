import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmationDialog } from '../../src/components/ui/ConfirmationDialog';

describe('ConfirmationDialog', () => {
  it('explains the action and closes without confirming on cancel', () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ConfirmationDialog
        open
        onOpenChange={onOpenChange}
        title="Delete feature?"
        description="This removes the annotation and cannot be undone."
        confirmLabel="Delete feature"
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Delete feature?' })).toHaveTextContent(
      'This removes the annotation and cannot be undone.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('only closes after an asynchronous confirmation succeeds', async () => {
    let resolveConfirm: (() => void) | undefined;
    const onConfirm = vi.fn(() => new Promise<void>(resolve => { resolveConfirm = resolve; }));
    const onOpenChange = vi.fn();

    render(
      <ConfirmationDialog
        open
        onOpenChange={onOpenChange}
        title="Clear workspace?"
        description="All local documents will be removed."
        confirmLabel="Clear workspace"
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear workspace' }));
    expect(screen.getByRole('button', { name: 'Working…' })).toBeDisabled();
    expect(onOpenChange).not.toHaveBeenCalled();

    resolveConfirm?.();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
