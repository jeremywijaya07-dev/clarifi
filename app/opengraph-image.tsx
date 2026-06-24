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
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        {/* Teal glow top-left */}
        <div
          style={{
            position: 'absolute',
            top: -160,
            left: -160,
            width: 700,
            height: 700,
            background:
              'radial-gradient(circle, rgba(14,165,233,0.18) 0%, transparent 65%)',
            borderRadius: '50%',
          }}
        />
        {/* Teal glow bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: -120,
            right: -120,
            width: 500,
            height: 500,
            background:
              'radial-gradient(circle, rgba(0,168,107,0.12) 0%, transparent 65%)',
            borderRadius: '50%',
          }}
        />

        {/* Logo + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 36 }}>
          <div
            style={{
              width: 88,
              height: 88,
              background: '#00A86B',
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg viewBox="0 0 52 52" width={56} height={56}>
              <polyline
                points="12,36 20,16 27,28 34,8 40,5"
                stroke="white"
                stroke-width="3"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle cx="40" cy="5" r="3.5" fill="white" />
              <line
                x1="40" x2="40" y1="5" y2="14"
                stroke="white"
                stroke-width="2.5"
                stroke-linecap="round"
              />
            </svg>
          </div>
          <span
            style={{
              fontSize: 80,
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-3px',
              lineHeight: 1,
            }}
          >
            Clarifi
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 38,
            color: '#0EA5E9',
            fontWeight: 600,
            marginBottom: 24,
            letterSpacing: '-0.5px',
          }}
        >
          Clarity in every trade
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 22,
            color: '#94A3B8',
            textAlign: 'center',
            maxWidth: 820,
            lineHeight: 1.55,
          }}
        >
          Riset saham US &amp; IDX bertenaga AI — fair value, indikator teknikal, dan data near real-time dalam satu tempat.
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 14, marginTop: 52 }}>
          {['🤖 AI Analysis', '🌏 US + IDX', '💰 Fair Value', '📊 Teknikal'].map((tag) => (
            <div
              key={tag}
              style={{
                background: 'rgba(14,165,233,0.10)',
                border: '1px solid rgba(14,165,233,0.28)',
                borderRadius: 14,
                padding: '10px 22px',
                color: '#38BDF8',
                fontSize: 17,
                fontWeight: 600,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
