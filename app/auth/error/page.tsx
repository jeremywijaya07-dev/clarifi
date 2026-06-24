import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-[#0F172A] flex items-center justify-center">
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#2D3748] p-8 max-w-sm w-full text-center shadow-sm">
        <p className="text-2xl mb-3">⚠️</p>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Link tidak valid</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Link masuk sudah kadaluarsa atau sudah pernah dipakai. Coba minta link baru.
        </p>
        <Link
          href="/app"
          className="inline-block px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Kembali ke Clarifi
        </Link>
      </div>
    </div>
  );
}
