'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sun, Moon, Menu, X, LogIn, LogOut, User, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const NAV_LINKS = [
  { href: '/app', label: 'Analysis' },
  { href: '/app/compare', label: 'Compare' },
  { href: '/app/watchlist', label: 'Watchlist' },
  { href: '/app/portfolio', label: 'Portfolio' },
  { href: '/app/alerts', label: 'Alerts' },
  { href: '/app/screener', label: 'Screener' },
  { href: '/app/news', label: 'News' },
];

function ClarifiLogo() {
  return (
    <svg viewBox="0 0 52 52" width="32" height="32" aria-hidden="true">
      <rect width="52" height="52" rx="11" fill="#00A86B" />
      <polyline
        points="12,36 20,16 27,28 34,8 40,5"
        stroke="white" strokeWidth="3" fill="none"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="40" cy="5" r="3.5" fill="white" />
      <line x1="40" x2="40" y1="5" y2="14"
        stroke="white" strokeWidth="2.5" strokeLinecap="round"
      />
    </svg>
  );
}

// ── Login modal ───────────────────────────────────────────────────────────────

function LoginModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Masukkan email yang valid.');
      return;
    }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-[#2D3748] shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Masuk ke Clarifi</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Simpan Watchlist, Portfolio &amp; Alert lintas perangkat
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-4">
            <p className="text-2xl mb-3">📧</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Cek email kamu!</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Kami kirim link masuk ke <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>.
              Klik link di email untuk masuk — link berlaku 1 jam.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                Email
              </label>
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="kamu@email.com"
                className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-[#0EA5E9] transition-colors"
              />
            </div>
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
            <button
              onClick={handleSend}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0EA5E9] hover:bg-[#0284C7] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Kirim link masuk
            </button>
            <p className="text-[10px] text-center text-gray-400 dark:text-gray-600">
              Tanpa password — kami kirim magic link ke email kamu.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── User avatar + dropdown ────────────────────────────────────────────────────

function UserMenu({ user, onSignOut }: { user: SupabaseUser; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initial = (user.email?.[0] ?? '?').toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0EA5E9] text-white text-sm font-bold hover:bg-[#0284C7] transition-colors"
        title={user.email ?? 'Akun'}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-52 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#2D3748] rounded-xl shadow-xl overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-100 dark:border-[#2D3748]">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold">Masuk sebagai</p>
            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 mt-0.5 truncate">{user.email}</p>
          </div>
          <div className="p-1">
            <button
              onClick={() => { setOpen(false); onSignOut(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const isDark = stored !== 'light';
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  // Bootstrap auth state
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // "/" global shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const el = e.target as HTMLElement;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return;
      e.preventDefault();
      if (pathname === '/app') {
        window.dispatchEvent(new CustomEvent('clarifi:focus-search'));
      } else {
        router.push('/app?autofocus=1');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pathname, router]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white dark:bg-[#0F172A] border-b border-gray-200 dark:border-[#1F2937]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <ClarifiLogo />
              <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                Clarifi
              </span>
            </Link>

            {/* Nav links — desktop only */}
            <div className="hidden sm:flex items-center gap-0.5">
              <Link
                href="/"
                className="px-3 py-2 text-sm font-medium text-gray-400 dark:text-[#6B7280] hover:text-gray-700 dark:hover:text-[#9CA3AF] transition-colors"
              >
                ← Home
              </Link>
              {NAV_LINKS.map(({ href, label }) => {
                const active = href === '/app' ? pathname === '/app' : pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'text-[#0EA5E9]'
                        : 'text-gray-500 dark:text-[#9CA3AF] hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {label}
                    {active && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-0.5 bg-[#0EA5E9] rounded-full" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-1.5">
              {/* Feedback — desktop only */}
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSclVEEoD3bx1bDLgs4K4QmgLNxRu3irogjDnqrQOddrrufuIg/viewform?usp=publish-editor"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-[#0EA5E9]/30 text-[#9CA3AF] hover:text-[#0EA5E9] hover:border-[#0EA5E9] rounded-lg transition-colors"
              >
                Feedback 💬
              </a>

              {/* Auth button */}
              {authReady && (
                user
                  ? <UserMenu user={user} onSignOut={handleSignOut} />
                  : (
                    <button
                      onClick={() => setShowLogin(true)}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-[#0EA5E9] hover:text-[#0EA5E9] rounded-lg transition-colors"
                    >
                      <User className="w-3.5 h-3.5" />
                      Masuk
                    </button>
                  )
              )}

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle theme"
              >
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Hamburger — mobile only */}
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="sm:hidden p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="sm:hidden border-t border-gray-100 dark:border-[#1F2937] bg-white dark:bg-[#0F172A] px-4 py-3 space-y-0.5">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-gray-400 dark:text-[#6B7280] hover:text-gray-700 dark:hover:text-[#9CA3AF] rounded-lg transition-colors"
            >
              ← Home
            </Link>
            {NAV_LINKS.map(({ href, label }) => {
              const active = href === '/app' ? pathname === '/app' : pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    active
                      ? 'bg-[#0EA5E9]/10 text-[#0EA5E9]'
                      : 'text-gray-600 dark:text-[#9CA3AF] hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-gray-100 dark:border-[#1F2937] space-y-0.5">
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSclVEEoD3bx1bDLgs4K4QmgLNxRu3irogjDnqrQOddrrufuIg/viewform?usp=publish-editor"
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2.5 text-sm font-medium text-gray-500 dark:text-[#9CA3AF] hover:text-[#0EA5E9] transition-colors"
              >
                Feedback 💬
              </a>
              {authReady && !user && (
                <button
                  onClick={() => { setMenuOpen(false); setShowLogin(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-[#9CA3AF] hover:text-[#0EA5E9] transition-colors rounded-lg"
                >
                  <User className="w-4 h-4" />
                  Masuk
                </button>
              )}
              {authReady && user && (
                <button
                  onClick={() => { setMenuOpen(false); handleSignOut(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-500 dark:text-[#9CA3AF] hover:text-red-500 transition-colors rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar ({user.email})
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
