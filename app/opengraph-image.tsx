import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Clarifi — Clarity in every trade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0F172A',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '60px 80px',
        }}
      >
        {/* Logo + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 40 }}>
          <div
            style={{
              width: 96,
              height: 96,
              background: '#00A86B',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg viewBox="0 0 52 52" width={60} height={60}>
              <polyline
                points="12,36 20,16 27,28 34,8 40,5"
                stroke="white"
                strokeWidth="3.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="40" cy="5" r="4" fill="white" />
            </svg>
          </div>
          <span
            style={{
              fontSize: 88,
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-4px',
              lineHeight: 1,
            }}
          >
            Clarifi
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 40,
            color: '#0EA5E9',
            fontWeight: 700,
            marginBottom: 28,
            letterSpacing: '-0.5px',
          }}
        >
          Clarity in every trade
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 24,
            color: '#94A3B8',
            textAlign: 'center',
            maxWidth: 860,
            lineHeight: 1.5,
            marginBottom: 52,
          }}
        >
          Riset saham US & IDX bertenaga AI — fair value, indikator teknikal, dan data near real-time.
        </div>

        {/* Pills */}
        <div style={{ display: 'flex', gap: 16 }}>
          {['🤖 AI Analysis', '🌏 US + IDX', '💰 Fair Value', '📊 Teknikal'].map((tag) => (
            <div
              key={tag}
              style={{
                background: 'rgba(14,165,233,0.12)',
                border: '1px solid rgba(14,165,233,0.3)',
                borderRadius: 14,
                padding: '10px 24px',
                color: '#38BDF8',
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
