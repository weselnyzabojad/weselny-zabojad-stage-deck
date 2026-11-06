import { useEffect, useSyncExternalStore } from 'react';
import {
  applyDocumentLang,
  formatDate,
  formatNumber,
  formatTime,
  getLocale,
  setLocale,
  subscribeLocale,
  t,
  tp,
} from './index.js';

// React binding for the per-device UI locale. Every consumer subscribes, so a
// language switch re-renders the whole tree without a reload.
export function useI18n() {
  const locale = useSyncExternalStore(subscribeLocale, getLocale, getLocale);

  useEffect(() => {
    applyDocumentLang(locale);
  }, [locale]);

  return { locale, t, tp, setLocale, formatTime, formatDate, formatNumber };
}

export default useI18n;
