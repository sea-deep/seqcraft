import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountMenu } from '../../src/components/account/AccountMenu';

const authMocks = vi.hoisted(() => ({
  deleteUser: vi.fn(),
  signOut: vi.fn(),
  clearToken: vi.fn(),
}));

vi.mock('../../src/platform/client', () => ({
  authClient: {
    deleteUser: authMocks.deleteUser,
    signOut: authMocks.signOut,
  },
  clearToken: authMocks.clearToken,
}));

describe('AccountMenu', () => {
  beforeEach(() => {
    authMocks.deleteUser.mockReset().mockResolvedValue({ data: { success: true }, error: null });
    authMocks.signOut.mockReset().mockResolvedValue({ data: { success: true }, error: null });
    authMocks.clearToken.mockReset();
  });

  it('shows the signed-in profile and exactly the two requested account actions', async () => {
    render(
      <MemoryRouter>
        <AccountMenu user={{
          id: 'user-1',
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          image: 'https://example.com/avatar.png',
        }} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open account menu for Ada Lovelace' }));

    expect(await screen.findByRole('menuitem', { name: 'Delete my data' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeTruthy();
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  });

  it('requires an explicit DELETE confirmation before permanent deletion', async () => {
    render(
      <MemoryRouter>
        <AccountMenu user={{ id: 'user-1', name: null, email: 'ada@example.com' }} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open account menu for ada@example.com' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete my data' }));

    const deleteButton = await screen.findByRole('button', { name: 'Permanently delete' });
    expect((deleteButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DELETE' } });
    expect((deleteButton as HTMLButtonElement).disabled).toBe(false);
  });

  it('deletes the authenticated account before clearing the local token', async () => {
    render(
      <MemoryRouter>
        <AccountMenu user={{ id: 'user-1', name: 'Ada', email: 'ada@example.com' }} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open account menu for Ada' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete my data' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Permanently delete' }));

    await waitFor(() => expect(authMocks.deleteUser).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(authMocks.clearToken).toHaveBeenCalledTimes(1));
    expect(authMocks.deleteUser.mock.invocationCallOrder[0])
      .toBeLessThan(authMocks.clearToken.mock.invocationCallOrder[0]);
  });
});
