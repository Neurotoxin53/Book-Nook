import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Book Nook — a scrapbook for your reading life',
  description:
    'A personal, customizable book journal for remembering what you read and how it felt.',
  openGraph: {
    title: 'Book Nook — a scrapbook for your reading life',
    description: 'A personal, customizable book journal for remembering what you read and how it felt.',
    type: 'website',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'Book Nook open scrapbook journal' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Book Nook — a scrapbook for your reading life',
    description: 'A personal, customizable book journal for remembering what you read and how it felt.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
