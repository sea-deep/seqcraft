import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Dna, LockKeyhole, ShieldCheck } from 'lucide-react';
import { authClient, loadPlatformConfig, type PlatformConfig } from '../platform/client';

export function AuthPage() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<PlatformConfig | null>(null);
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void loadPlatformConfig(controller.signal).then(setPlatform);

    const params = new URLSearchParams(window.location.search);
    const err = params.get('error') || params.get('error_description');
    if (err) {
      if (err === 'state_mismatch') {
        setError('Authentication session expired or was interrupted. Please try signing in again.');
      } else {
        setError(`Sign-in error: ${err}`);
      }
    }

    return () => controller.abort();
  }, []);

  const authEnabled = platform?.auth.enabled === true;

  async function handleEmailAuth(event: React.FormEvent) {
    event.preventDefault();
    if (!authEnabled) return;
    setIsLoading(true);
    setError(null);
    const callbackURL = `${window.location.origin}/dashboard`;
    const result = mode === 'sign-in'
      ? await authClient.signIn.email({ email, password, callbackURL })
      : await authClient.signUp.email({ email, password, name: email.split('@')[0] || 'SeqCraft user', callbackURL });
    setIsLoading(false);
    if (result.error) {
      setError(result.error.message ?? 'Authentication failed. Please try again.');
      return;
    }
    navigate('/dashboard');
  }

  async function handleGoogleAuth() {
    if (!platform?.auth.googleEnabled) return;
    setIsLoading(true);
    setError(null);
    const callbackURL = `${window.location.origin}/dashboard`;
    const errorCallbackURL = `${window.location.origin}/auth`;
    const result = await authClient.signIn.social({ 
      provider: 'google', 
      callbackURL,
      errorCallbackURL
    });
    if (result?.error) {
      setIsLoading(false);
      setError(result.error.message ?? 'Google sign-in failed.');
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] grid lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.72fr)]">
      <section className="scientific-grid hidden lg:flex flex-col justify-between border-r border-[var(--border)] p-12 xl:p-16">
        <Link to="/" className="inline-flex items-center gap-2 text-[var(--accent)] font-semibold text-lg w-fit">
          <Dna size={22} /> SeqCraft
        </Link>
        <div className="max-w-xl">
          <p className="font-mono text-[12px] tracking-[0.16em] uppercase text-[var(--accent)] mb-5">Local scientific data plane</p>
          <h1 className="text-4xl xl:text-5xl font-semibold tracking-[-0.035em] leading-[1.08] mb-6">
            Your sequence stays here. Your workspace travels with you.
          </h1>
          <p className="text-[16px] leading-7 text-[var(--text-secondary)] max-w-lg">
            Accounts sync preferences and sequence-free project metadata. Raw bases, files, selections, and derived constructs remain in browser storage.
          </p>
          <div className="grid gap-3 mt-9 text-[14px]">
            {['Raw sequence bytes never enter MongoDB', 'Scientific analysis remains deterministic and local', 'Agent changes require human approval'].map(item => (
              <div key={item} className="flex items-center gap-3"><Check size={16} className="text-[var(--success)]" />{item}</div>
            ))}
          </div>
        </div>
        <div className="font-mono text-[11px] text-[var(--text-muted)]">Standard 1-based biological coordinates in UI · Zero sequence cloud exposure</div>
      </section>

      <main className="flex items-center justify-center px-6 py-12 bg-[var(--panel)]">
        <div className="w-full max-w-[390px]">
          <Link to="/" className="lg:hidden inline-flex items-center gap-2 text-[var(--text-muted)] text-[13px] mb-10"><ArrowLeft size={15} /> Home</Link>
          <div className="flex items-center gap-3 mb-7">
            <div className="size-10 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] grid place-items-center"><LockKeyhole size={19} /></div>
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.015em]">{mode === 'sign-in' ? 'Sign in to SeqCraft' : 'Create your account'}</h2>
              <p className="text-[13px] text-[var(--text-muted)]">Cloud identity, local sequences.</p>
            </div>
          </div>

          {!authEnabled && platform && (
            <div className="mb-5 border border-[var(--border)] bg-[var(--panel-muted)] rounded-md p-3 text-[13px] leading-5 text-[var(--text-secondary)]">
              Account credentials are not configured yet. Guest mode includes the complete local scientific workspace.
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4" aria-busy={isLoading}>
            <label className="block text-[13px] font-medium">
              Email
              <input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} disabled={!authEnabled || isLoading} className="mt-1.5 w-full h-[38px] bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 disabled:opacity-55" placeholder="you@example.com" />
            </label>
            <label className="block text-[13px] font-medium">
              Password
              <input type="password" required minLength={8} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} disabled={!authEnabled || isLoading} className="mt-1.5 w-full h-[38px] bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 disabled:opacity-55" placeholder="At least 8 characters" />
            </label>
            {error && <p role="alert" className="text-[13px] text-[var(--danger)]">{error}</p>}
            <button type="submit" disabled={!authEnabled || isLoading} className="w-full h-[38px] bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold rounded-md hover:bg-[var(--accent-hover)] disabled:opacity-55 shadow-sm transition-colors cursor-pointer">
              {isLoading ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5 text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)] before:h-px before:flex-1 before:bg-[var(--border)] after:h-px after:flex-1 after:bg-[var(--border)]">or</div>

          <button type="button" onClick={() => void handleGoogleAuth()} disabled={!platform?.auth.googleEnabled || isLoading} className="w-full h-[38px] border border-[var(--border)] bg-[var(--bg)] rounded-md text-[13px] font-medium hover:bg-[var(--panel-muted)] disabled:opacity-55 transition-colors">
            Continue with Google
          </button>
          <button type="button" onClick={() => navigate('/dashboard')} className="w-full h-[38px] mt-3 text-[13px] font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-md transition-colors">
            Continue in private guest mode
          </button>

          <div className="mt-7 pt-5 border-t border-[var(--border)] flex items-start gap-2.5 text-[12px] leading-5 text-[var(--text-muted)]">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--success)]" />
            Authentication cookies are HTTP-only. SeqCraft never treats signing in as permission to upload biological sequence data.
          </div>
          {authEnabled && (
            <button type="button" onClick={() => setMode(current => current === 'sign-in' ? 'sign-up' : 'sign-in')} className="mt-5 text-[13px] text-[var(--text-secondary)] hover:text-[var(--accent)]">
              {mode === 'sign-in' ? 'New to SeqCraft? Create an account' : 'Already have an account? Sign in'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
