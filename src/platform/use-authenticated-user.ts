import { useEffect, useState } from 'react';
import { consumeAuthRedirectToken, fetchSession, type SessionUser } from './client';

export type AuthenticationStatus = 'checking' | 'authenticated' | 'guest';

export function useAuthenticatedUser() {
  const [status, setStatus] = useState<AuthenticationStatus>('checking');
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    consumeAuthRedirectToken();
    void fetchSession(controller.signal).then(sessionUser => {
      if (controller.signal.aborted) return;
      setUser(sessionUser);
      setStatus(sessionUser ? 'authenticated' : 'guest');
    });
    return () => controller.abort();
  }, []);

  return { status, user };
}
