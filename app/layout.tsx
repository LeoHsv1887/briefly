import type { Metadata, Viewport } from 'next';
import './globals.css';
import SWRegister from '@/components/SWRegister';

export const metadata: Metadata = {
  title: 'Briefly',
  description: 'Dein persönlicher KI-kuratierter News-Feed',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Briefly',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0f0f0f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-[#0f0f0f] antialiased overscroll-none">
        {children}
        <SWRegister />
      </body>
    </html>
  );
}
