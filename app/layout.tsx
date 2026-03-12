import type { Metadata } from 'next';
import { Orbitron, JetBrains_Mono, Share_Tech_Mono } from 'next/font/google';
import '@/app/globals.css';

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-orbitron',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const shareTechMono = Share_Tech_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-share-tech',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'OpenClaw Context Doctor',
  description: 'A standalone Next.js 16 demo for visualizing context window budget across workspace files and installed skills.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${jetbrainsMono.variable} ${shareTechMono.variable}`}>
      <body className="font-body text-foreground">
        {children}
      </body>
    </html>
  );
}
