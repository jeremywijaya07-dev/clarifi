'use client';
import { useState, useEffect, useRef, ReactNode } from 'react';
import Link from 'next/link';

// ── Intersection Observer fade-in ────────────────────────────────────────────

function FadeIn({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ── Logo ─────────────────────────────────────────────────────────────────────

function ClarifiLogo({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 52 52" width={size} height={size} aria-hidden="true">
      <rect width="52" height="52" rx="11" fill="#00A86B" />
      <polyline
        points="12,36 20,16 27,28 34,8 40,5"
        stroke="white"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="40" cy="5" r="3.5" fill="white" />
      <line x1="40" x2="40" y1="5" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ── App Mockup ────────────────────────────────────────────────────────────────

function AppMockup() {
  return (
    <div className="relative w-full max-w-[360px] mx-auto lg:mx-0">
      {/* Glow */}
      <div className="absolute -inset-6 bg-[#0EA5E9]/15 rounded-3xl blur-3xl pointer-events-none" />

      {/* Card */}
      <div className="relative bg-[#1E293B] rounded-2xl border border-[#1F2937] p-5 shadow-2xl shadow-black/60">
        {/* Stock header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[#9CA3AF]">BBRI:IDX</span>
              <span className="text-[10px] bg-[#0EA5E9]/15 text-[#0EA5E9] px-1.5 py-0.5 rounded font-semibold">
                IDX
              </span>
            </div>
            <div className="text-2xl font-bold text-white">Rp 4,580</div>
            <div className="text-sm font-semibold text-[#10B981] mt-0.5">▲ +2.47% today</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#9CA3AF] mb-2 max-w-[100px] text-right leading-tight">
              Bank Rakyat Indonesia
            </div>
            <span className="text-[10px] bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 px-2 py-1 rounded-full font-semibold">
              Bullish
            </span>
          </div>
        </div>

        {/* Mini chart */}
        <div className="h-[72px] mb-4 rounded-xl overflow-hidden bg-[#0F172A]">
          <svg viewBox="0 0 300 72" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="mockGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,62 C20,58 30,55 50,50 C70,45 80,42 100,36 C120,30 130,28 150,22 C170,16 185,12 210,10 C230,8 250,7 270,5 L300,3"
              stroke="#10B981"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M0,62 C20,58 30,55 50,50 C70,45 80,42 100,36 C120,30 130,28 150,22 C170,16 185,12 210,10 C230,8 250,7 270,5 L300,3 L300,72 L0,72 Z"
              fill="url(#mockGrad)"
            />
          </svg>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'RSI (14)', value: '58.3', color: 'text-yellow-400' },
            { label: 'vs SMA20', value: '▲ Above', color: 'text-[#10B981]' },
            { label: 'Rel Vol', value: '1.8x', color: 'text-blue-400' },
          ].map(m => (
            <div key={m.label} className="bg-[#0F172A] rounded-lg p-2 text-center">
              <div className="text-[10px] text-[#9CA3AF] mb-0.5">{m.label}</div>
              <div className={`text-xs font-bold ${m.color}`}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* AI Analysis teaser */}
        <div className="bg-[#0EA5E9]/8 border border-[#0EA5E9]/20 rounded-xl p-3 mb-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs">🤖</span>
            <span className="text-[11px] font-semibold text-[#0EA5E9]">AI Analysis</span>
          </div>
          <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
            Strong uptrend confirmed — RSI neutral at 58, price above SMA20 &amp; SMA50.
            Key support at Rp&nbsp;4,200. Watch for breakout above Rp&nbsp;4,800...
          </p>
        </div>

        {/* Fair value teaser */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#0F172A] rounded-lg">
          <span className="text-[11px] text-[#9CA3AF]">Graham Number</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-white">Rp 5,120</span>
            <span className="text-[10px] bg-[#10B981]/15 text-[#10B981] px-1.5 py-0.5 rounded-full font-semibold">
              Undervalued
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Landing page ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-[#0F172A] text-[#F9FAFB] min-h-screen">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-[#0F172A]/90 backdrop-blur-md border-b border-[#1F2937]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <ClarifiLogo size={30} />
              <span className="text-base font-bold text-white tracking-tight">Clarifi</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-[#9CA3AF] hover:text-white transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-[#9CA3AF] hover:text-white transition-colors">
                How it works
              </a>
            </div>

            {/* CTA + hamburger */}
            <div className="flex items-center gap-3">
              <Link
                href="/app"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Start for Free
              </Link>

              {/* Hamburger */}
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="md:hidden p-2 text-[#9CA3AF] hover:text-white transition-colors"
                aria-label="Toggle menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {menuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-[#1F2937] bg-[#0F172A] px-4 py-4 space-y-3">
            <a
              href="#features"
              onClick={() => setMenuOpen(false)}
              className="block text-sm text-[#9CA3AF] hover:text-white transition-colors py-1"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMenuOpen(false)}
              className="block text-sm text-[#9CA3AF] hover:text-white transition-colors py-1"
            >
              How it works
            </a>
            <Link
              href="/app"
              className="block px-4 py-2.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-sm font-semibold rounded-xl transition-colors text-center"
            >
              Start for Free
            </Link>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-20 pb-24 px-4 sm:px-6">
        {/* Background gradient blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#0EA5E9]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: Text */}
            <div>
              <FadeIn>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#0EA5E9] bg-[#0EA5E9]/10 border border-[#0EA5E9]/20 rounded-full mb-6">
                  ✨ AI-Powered Stock Research
                </span>
              </FadeIn>

              <FadeIn delay={100}>
                <h1 className="text-5xl sm:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6">
                  Clarity in<br />
                  <span className="text-[#0EA5E9]">Every Trade</span>
                </h1>
              </FadeIn>

              <FadeIn delay={200}>
                <p className="text-lg text-[#9CA3AF] leading-relaxed mb-8 max-w-lg">
                  Professional stock analysis for US and Indonesian markets. Get AI insights,
                  fair value estimates, and near real-time market data in seconds.
                </p>
              </FadeIn>

              <FadeIn delay={300}>
                <div className="flex flex-wrap gap-3 mb-7">
                  <Link
                    href="/app"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-[#0EA5E9]/25 text-sm"
                  >
                    Start for Free →
                  </Link>
                  <a
                    href="#how-it-works"
                    className="inline-flex items-center gap-2 px-6 py-3 border border-[#1F2937] hover:border-[#0EA5E9]/40 text-[#F9FAFB] font-semibold rounded-xl transition-colors text-sm"
                  >
                    See Demo
                  </a>
                </div>
              </FadeIn>

              <FadeIn delay={400}>
                <div className="flex flex-wrap gap-5 text-sm text-[#9CA3AF]">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[#10B981]">✓</span> Free forever
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[#10B981]">✓</span> No signup required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[#10B981]">✓</span> US + IDX markets
                  </span>
                </div>
              </FadeIn>
            </div>

            {/* Right: Mockup */}
            <FadeIn delay={200} className="flex justify-center lg:justify-end">
              <AppMockup />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-4 sm:px-6 bg-[#1E293B]/50">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Everything you need to trade smarter
              </h2>
              <p className="text-[#9CA3AF] text-lg max-w-xl mx-auto">
                Built for serious traders who want institutional-grade tools without the price tag.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: '🤖',
                title: 'AI-Powered Analysis',
                desc: 'Get professional 4-paragraph analysis on any stock powered by Groq Llama 3.3. Trend, support/resistance, momentum, and risk — all in seconds.',
              },
              {
                icon: '🌏',
                title: 'US + Indonesia Markets',
                desc: 'Search any US stock (AAPL, NVDA) or Indonesian IDX stock (BBRI, BBCA, TLKM) without any suffix. Auto-detected instantly.',
              },
              {
                icon: '💰',
                title: 'Fair Value Estimates',
                desc: 'Know if a stock is undervalued or overvalued using Graham Number and P/E based valuation methods.',
              },
              {
                icon: '📰',
                title: 'Latest News',
                desc: 'Latest news for every stock from global and Indonesian sources, fetched on demand.',
              },
            ].map((f, i) => (
              <FadeIn key={f.title} delay={i * 80}>
                <div className="bg-[#1E293B] border border-[#1F2937] rounded-2xl p-6 h-full hover:border-[#0EA5E9]/30 transition-colors group">
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="text-base font-bold text-white mb-3 group-hover:text-[#0EA5E9] transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-sm text-[#9CA3AF] leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Get started in 3 steps</h2>
              <p className="text-[#9CA3AF] text-lg">No signup, no credit card, no waiting.</p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-[#0EA5E9]/30 via-[#0EA5E9]/60 to-[#0EA5E9]/30" />

            {[
              {
                step: '1',
                icon: '🔍',
                title: 'Search any stock',
                desc: 'Type AAPL, BBRI, NVDA, or any ticker. US and IDX markets auto-detected.',
              },
              {
                step: '2',
                icon: '📊',
                title: 'Get instant data',
                desc: 'Price, chart, technicals, and news in seconds. No lag, no refresh needed.',
              },
              {
                step: '3',
                icon: '🤖',
                title: 'AI Analysis',
                desc: 'Click Analyze for professional insights powered by Groq Llama 3.3.',
              },
            ].map((s, i) => (
              <FadeIn key={s.step} delay={i * 120}>
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-5">
                    <div className="w-20 h-20 rounded-2xl bg-[#1E293B] border border-[#1F2937] flex items-center justify-center text-3xl shadow-lg">
                      {s.icon}
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#0EA5E9] text-white text-xs font-bold flex items-center justify-center">
                      {s.step}
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-[#9CA3AF] leading-relaxed">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats / highlights ── */}
      <section className="py-24 px-4 sm:px-6 bg-[#1E293B]/50">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Apa yang ada di dalam Clarifi?
              </h2>
              <p className="text-[#9CA3AF] text-lg">
                Semua yang kamu butuhkan untuk riset saham — gratis, tanpa daftar.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: '📐',
                title: 'RSI, SMA20 & SMA50',
                desc: 'Dihitung langsung dari data harga historis — bukan dari teks AI. Angka yang kamu lihat adalah angka nyata.',
              },
              {
                icon: '🎯',
                title: 'Estimasi Fair Value',
                desc: 'Graham Number, P/E sektoral, dan PEG Value — tiga metode valuasi berbasis fundamental, dengan konsensus otomatis.',
              },
              {
                icon: '🌏',
                title: '1000+ saham US & IDX',
                desc: 'Ketik AAPL, NVDA, BBRI, atau PTRO — sistem otomatis deteksi pasar tanpa suffix tambahan.',
              },
              {
                icon: '🤖',
                title: 'AI grounded pada data',
                desc: 'Setiap klaim analisis AI wajib menyebut angka dari data nyata. Model tidak boleh mengarang level harga.',
              },
              {
                icon: '📊',
                title: 'Chart TradingView',
                desc: 'Candlestick interaktif lengkap dengan volume, drawing tools, dan mode fullscreen.',
              },
              {
                icon: '🔔',
                title: 'Price Alerts',
                desc: 'Set notifikasi harga dan Clarifi akan memberitahu saat target tercapai — tersimpan di browser, tanpa akun.',
              },
            ].map((f, i) => (
              <FadeIn key={f.title} delay={i * 70}>
                <div className="bg-[#1E293B] border border-[#1F2937] rounded-2xl p-6 h-full hover:border-[#0EA5E9]/30 transition-colors group">
                  <div className="text-2xl mb-3">{f.icon}</div>
                  <h3 className="text-sm font-bold text-white mb-2 group-hover:text-[#0EA5E9] transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-sm text-[#9CA3AF] leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={200}>
            <p className="text-center text-[11px] text-[#6B7280] mt-10">
              Bukan nasihat investasi · Data ~15 menit tertunda · Selalu lakukan riset mandiri
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <FadeIn>
            <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-[#1F2937] rounded-3xl px-8 py-16 relative overflow-hidden">
              {/* Decorative glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#0EA5E9]/5 to-transparent pointer-events-none" />
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#0EA5E9]/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Ready to trade smarter?
                </h2>
                <p className="text-[#9CA3AF] text-lg mb-8">
                  Join thousands of traders using Clarifi for free
                </p>
                <Link
                  href="/app"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-bold rounded-2xl transition-all hover:shadow-xl hover:shadow-[#0EA5E9]/30 text-base"
                >
                  Start Analyzing Now →
                </Link>
                <p className="mt-5 text-sm text-[#9CA3AF]">No credit card required • Always free</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#1F2937] py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">

            {/* Logo + tagline */}
            <div className="flex items-center gap-3">
              <ClarifiLogo size={28} />
              <div>
                <span className="font-bold text-white text-sm">Clarifi</span>
                <p className="text-xs text-[#9CA3AF]">Clarity in every trade</p>
              </div>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm text-[#9CA3AF]">
              <Link href="/app" className="hover:text-white transition-colors">Analysis</Link>
              <Link href="/app/compare" className="hover:text-white transition-colors">Compare</Link>
              <Link href="/app/watchlist" className="hover:text-white transition-colors">Watchlist</Link>
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSclVEEoD3bx1bDLgs4K4QmgLNxRu3irogjDnqrQOddrrufuIg/viewform?usp=publish-editor"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Feedback 💬
              </a>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[#1F2937] text-center space-y-1.5">
            <p className="text-xs text-[#6B7280]">
              © 2025 Clarifi. Data by Yahoo Finance &amp; Twelve Data (~15 min delay). AI by Groq.
            </p>
            <p className="text-[10px] text-[#4B5563]">
              Bukan nasihat investasi / Not financial advice — untuk tujuan edukasi saja. Lakukan riset mandiri sebelum berinvestasi.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
