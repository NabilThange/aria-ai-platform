import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Cherry Blossom QR Code',
  description:
    'A WebGPU-powered cherry blossom tree that encodes any URL as a scannable 3D QR code. Click to toggle between isometric and flat view.',
  openGraph: {
    title: 'Cherry Blossom QR Code',
    description: 'A beautiful 3D WebGPU QR code generator shaped like a cherry blossom tree.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
