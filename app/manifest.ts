import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'My Book Nook',
    short_name: 'Book Nook',
    description: 'A private, customizable home for your books and reviews.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f1eb',
    theme_color: '#222825',
    orientation: 'any',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

