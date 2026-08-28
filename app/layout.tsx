import type { Metadata, Viewport } from 'next';
import { PwaRegister } from '@/components/pwa-register';
import './fonts.generated.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://my-book-nook.samxl.chatgpt.site'),
  title: 'My Book Nook — your reading life, beautifully kept',
  description:
    'A personal, customizable book journal for remembering what you read and how it felt.',
  applicationName: 'My Book Nook',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'My Book Nook' },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  alternates: { canonical: '/' },
  openGraph: {
    title: 'My Book Nook — your reading life, beautifully kept',
    description: 'A personal, customizable book journal for remembering what you read and how it felt.',
    type: 'website',
    url: '/',
    siteName: 'My Book Nook',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'My Book Nook open scrapbook journal' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Book Nook — your reading life, beautifully kept',
    description: 'A personal, customizable book journal for remembering what you read and how it felt.',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#222825',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
