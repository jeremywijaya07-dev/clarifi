import type { Metadata } from 'next';
import './globals.css';

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
        {children}
      </body>
    </html>
  );
}
