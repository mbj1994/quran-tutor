import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Quran Tutor',
    short_name: 'Quran Tutor',
    description: 'Live Qur’an learning for Gambian diaspora children',
    start_url: '/',
    display: 'standalone',
    background_color: '#ecfdf5',
    theme_color: '#059669',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
