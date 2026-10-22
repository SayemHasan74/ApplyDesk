import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return { name: 'ApplyDesk', short_name: 'ApplyDesk', start_url: '/', display: 'standalone',
    background_color: '#4f46e5', theme_color: '#4f46e5',
    icons: [{ src: '/icon-192', sizes: '192x192', type: 'image/png' }, { src: '/icon-512', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
  };
}
