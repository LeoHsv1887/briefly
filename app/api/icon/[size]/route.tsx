import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest, { params }: { params: Promise<{ size: string }> }) {
  const { size: sizeParam } = await params;
  const size = Math.min(512, Math.max(16, parseInt(sizeParam) || 192));

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f0f0f',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: size * 0.22,
        }}
      >
        <span
          style={{
            color: '#e8e8e8',
            fontSize: size * 0.55,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          B
        </span>
      </div>
    ),
    { width: size, height: size },
  );
}
