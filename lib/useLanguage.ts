import { useState, useEffect } from 'react';

export type Lang = 'id' | 'en';
const KEY = 'clarifi-lang';

export function useLanguage(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>('id');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY) as Lang | null;
      if (stored === 'en' || stored === 'id') setLangState(stored);
    } catch { /* ignore */ }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  };

  return [lang, setLang];
}
