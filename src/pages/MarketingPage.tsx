import { Link } from 'react-router-dom';
import { SeqCraftLogo } from '../components/ui/SeqCraftLogo';
import { AccountMenu } from '../components/account/AccountMenu';
import { useAuthenticatedUser } from '../platform/use-authenticated-user';
import { GenomicHero } from '../components/marketing/GenomicHero';
import { ProductDemonstrations } from '../components/marketing/ProductDemonstrations';

export function MarketingPage() {
  const auth = useAuthenticatedUser();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] selection:bg-[var(--accent)] selection:text-[var(--accent-foreground)]">
      {/* Editorial Navigation */}
      <nav className="border-b border-[var(--border)] bg-[var(--panel)]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[var(--accent)] flex items-center justify-center">
              <SeqCraftLogo size={22} />
            </div>
            <span className="font-semibold text-[17px] tracking-tight text-[var(--text)]">SeqCraft</span>
          </div>
          <div className="flex gap-3 text-[13px] font-medium items-center">
            <Link
              to="/docs"
              className="hidden sm:inline-flex text-[var(--text-muted)] hover:text-[var(--text)] px-3 py-2 transition-colors"
            >
              Documentation
            </Link>
            {auth.user ? (
              <AccountMenu user={auth.user} />
            ) : auth.status === 'checking' ? (
              <div
                className="size-8 animate-pulse rounded-full border border-[var(--border)] bg-[var(--panel-muted)]"
                aria-label="Checking account"
              />
            ) : (
              <Link
                to="/auth"
                className="px-4 py-2 rounded-md border border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--panel-muted)] transition-colors text-[var(--text)]"
              >
                Sign in
              </Link>
            )}
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold hover:bg-[var(--accent-hover)] transition-colors shadow-xs"
            >
              Open workspace
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content: Dominant Plasmid Hero + Tangible Biological Demonstrations */}
      <main>
        <GenomicHero />
        <ProductDemonstrations />
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 text-[12px] text-[var(--text-muted)] flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-[var(--border)]">
        <span>© {new Date().getFullYear()} SeqCraft. Professional DNA engineering in the browser.</span>
        <span className="font-mono text-[11px]">100% in-browser OPFS storage · Optional cloud identity</span>
      </footer>
    </div>
  );
}
