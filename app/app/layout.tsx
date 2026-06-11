import Navbar from '@/components/Navbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#111827] py-4 px-4 text-center text-[11px] text-gray-400 dark:text-gray-600">
        © 2025 Clarifi &bull; Data: Yahoo Finance &amp; Twelve Data &bull; News: Google News &bull; AI: Groq Llama 3.3
      </footer>
    </>
  );
}
