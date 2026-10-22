import { ImageResponse } from 'next/og';

export function appIcon(size: number) {
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#4f46e5', color: '#fff', fontSize: Math.round(size * 0.4), fontWeight: 700, WebkitTextStrokeWidth: Math.max(0.5, size * 0.008), WebkitTextStrokeColor: '#fff' }}>AD</div>, { width: size, height: size });
}
