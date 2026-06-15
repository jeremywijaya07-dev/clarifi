'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';

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

export default function Navbar() {
  const pathname = usePathname();
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const isDark = stored !== 'light';
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
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

          {/* Nav links */}
          <div className="flex items-center gap-0.5">
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

          {/* Feedback */}
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSclVEEoD3bx1bDLgs4K4QmgLNxRu3irogjDnqrQOddrrufuIg/viewform?usp=publish-editor"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-[#0EA5E9]/30 text-[#9CA3AF] hover:text-[#0EA5E9] hover:border-[#0EA5E9] rounded-lg transition-colors"
          >
            Feedback 💬
          </a>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </nav>
  );
}
