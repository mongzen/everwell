import { ImageResponse } from 'next/og';

export const alt = 'Drift — a calming jellyfish aquarium';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 45%, #12304a 0%, #050a16 70%)',
          color: '#e8f6ff', fontFamily: 'serif',
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: 8, textTransform: 'uppercase', opacity: 0.7 }}>A quiet aquarium</div>
        <div style={{ fontSize: 200, fontWeight: 300, lineHeight: 1 }}>Drift</div>
        <div style={{ fontSize: 30, opacity: 0.75 }}>No goals. No timer. Just slow breathing and soft light.</div>
      </div>
    ),
    size,
  );
}
