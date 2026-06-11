import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Clarifi — Clarity in every trade',
  description: 'AI-powered stock research and analysis',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('theme');
                if (t === 'light') { document.documentElement.classList.remove('dark'); }
                else { document.documentElement.classList.add('dark'); }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#111827] py-4 px-4 text-center text-[11px] text-gray-400 dark:text-gray-600">
          © 2025 Clarifi &bull; Data: Yahoo Finance &amp; Twelve Data &bull; News: Google News &bull; AI: Groq Llama 3.3
        </footer>
      </body>
    </html>
  );
}
