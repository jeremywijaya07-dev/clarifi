import Navbar from '@/components/Navbar';
import PriceAlertPoller from '@/components/PriceAlertPoller';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <PriceAlertPoller />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#1E293B] py-4 px-4 text-center text-[11px] text-gray-400 dark:text-gray-600 space-y-1">
        <p>© {new Date().getFullYear()} Clarifi &bull; Data: Yahoo Finance &amp; Twelve Data (~15 min delay) &bull; News: Google News &bull; AI: Groq Llama 3.3</p>
        <p className="text-[10px] text-[#9CA3AF] dark:text-gray-700">
          Bukan nasihat investasi / Not financial advice — Informasi ini hanya untuk tujuan edukasi. Selalu lakukan riset mandiri sebelum mengambil keputusan investasi.
        </p>
      </footer>
    </>
  );
}
