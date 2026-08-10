import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Quran Tutor',
    short_name: 'Quran Tutor',
    description: 'Live Qur’an learning for Gambian diaspora children',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f6faf7',
    theme_color: '#065f46',
    categories: ['education', 'kids', 'lifestyle'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
