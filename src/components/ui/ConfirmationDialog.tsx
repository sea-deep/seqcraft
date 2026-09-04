import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = true,
}: ConfirmationDialogProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setIsWorking(false);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const confirm = async () => {
    setIsWorking(true);
    setError(null);
    try {
      await onConfirm();
      handleOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The action could not be completed.');
      setIsWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isWorking ? undefined : handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-5 gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructive && <AlertTriangle size={17} className="text-[var(--danger)]" aria-hidden="true" />}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="rounded-md border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-2.5 text-[12px] text-[var(--danger)]">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isWorking}>Cancel</Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={() => void confirm()}
            disabled={isWorking}
          >
            {isWorking ? 'Working…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
