import { useEffect, useState } from 'react';
import { LogOut, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SessionUser } from '../../platform/client';
import { authClient, clearToken } from '../../platform/client';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

type AccountMenuProps = {
  user: SessionUser;
  size?: 'default' | 'compact';
};

function initialsFor(user: SessionUser): string {
  const source = user.name?.trim() || user.email;
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  return words.slice(0, 2).map(word => word[0]?.toUpperCase()).join('') || 'U';
}

export function AccountMenu({ user, size = 'default' }: AccountMenuProps) {
  const navigate = useNavigate();
  const [imageFailed, setImageFailed] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [pendingAction, setPendingAction] = useState<'delete' | 'sign-out' | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const displayName = user.name?.trim() || user.email;
  const avatarSize = size === 'compact' ? 'size-7 text-[10px]' : 'size-8 text-[11px]';

  useEffect(() => setImageFailed(false), [user.image]);

  async function handleSignOut() {
    setPendingAction('sign-out');
    try {
      await authClient.signOut();
    } finally {
      clearToken();
      setPendingAction(null);
      navigate('/', { replace: true });
    }
  }

  async function handleDelete() {
    if (confirmation !== 'DELETE') return;
    setPendingAction('delete');
    setDeleteError(null);
    try {
      const result = await authClient.deleteUser();
      if (result.error) {
        setDeleteError(result.error.message || 'SeqCraft could not delete your account. Sign in again and retry.');
        return;
      }

      const [{ clearAllWorkspaceStorage }, { useWorkspaceStore }] = await Promise.all([
        import('../../storage/document-persistence'),
        import('../../state/workspace-store'),
      ]);
      await clearAllWorkspaceStorage();
      useWorkspaceStore.getState().clearWorkspace();
      clearToken();
      navigate('/', { replace: true });
    } catch {
      setDeleteError('SeqCraft could not complete deletion. Your local workspace has not been cleared. Please retry.');
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Open account menu for ${displayName}`}
          title={displayName}
          className={`${avatarSize} overflow-hidden rounded-full border border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--accent)] font-semibold grid place-items-center outline-none transition-shadow hover:ring-2 hover:ring-[var(--accent)]/20 focus-visible:ring-2 focus-visible:ring-[var(--accent)]`}
        >
          {user.image && !imageFailed ? (
            <img
              src={user.image}
              alt=""
              referrerPolicy="no-referrer"
              className="size-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : initialsFor(user)}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="normal-case tracking-normal">
              <span className="block truncate text-[12px] text-[var(--text)]">{displayName}</span>
              <span className="block truncate text-[11px] font-normal text-[var(--text-muted)]">{user.email}</span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 /> Delete my data
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void handleSignOut()} disabled={pendingAction !== null}>
            <LogOut /> {pendingAction === 'sign-out' ? 'Signing out…' : 'Sign out'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={deleteOpen}
        onOpenChange={open => {
          if (pendingAction === 'delete') return;
          setDeleteOpen(open);
          if (!open) {
            setConfirmation('');
            setDeleteError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete all SeqCraft data?</DialogTitle>
            <DialogDescription>
              This permanently deletes your SeqCraft account and synced project metadata, then clears all sequences, annotations, primers, and history stored in this browser. Local workspaces on other devices remain on those devices.
            </DialogDescription>
          </DialogHeader>
          <label className="grid gap-1.5 text-[12px] font-medium">
            Type <span className="font-mono text-[var(--danger)]">DELETE</span> to confirm
            <input
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
              disabled={pendingAction === 'delete'}
              autoComplete="off"
              className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 font-mono outline-none focus:border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]/15"
            />
          </label>
          {deleteError && <p role="alert" className="text-[12px] leading-5 text-[var(--danger)]">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={pendingAction === 'delete'}>Cancel</Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={confirmation !== 'DELETE' || pendingAction === 'delete'}>
              {pendingAction === 'delete' ? 'Deleting…' : 'Permanently delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
