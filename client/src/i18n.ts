import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from './locales/ko.json';
import en from './locales/en.json';

const STORAGE_KEY = 'kiosk-locale';
const FALLBACK = 'ko';

export const supportedLocales = ['ko', 'en'] as const;
export type Locale = (typeof supportedLocales)[number];

function getStoredLocale(): string {
  if (typeof window === 'undefined') return FALLBACK;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && supportedLocales.includes(stored as Locale)) return stored;
  return FALLBACK;
}

export function setLocale(lng: string): void {
  const next = supportedLocales.includes(lng as Locale) ? lng : FALLBACK;
  localStorage.setItem(STORAGE_KEY, next);
  i18n.changeLanguage(next);
}

// locale JSON에는 categories 등 중첩 객체가 있어 Record<string, string> 단언 불가 → unknown 경유
i18n.use(initReactI18next).init({
  resources: {
    ko: { kiosk: (ko as unknown as { kiosk: Record<string, unknown> }).kiosk },
    en: { kiosk: (en as unknown as { kiosk: Record<string, unknown> }).kiosk },
  },
  ns: ['kiosk'],
  defaultNS: 'kiosk',
  lng: getStoredLocale(),
  fallbackLng: FALLBACK,
  interpolation: { escapeValue: false },
});

if (typeof window !== 'undefined') {
  i18n.on('initialized', () => {
    const stored = getStoredLocale();
    if (i18n.language !== stored) i18n.changeLanguage(stored);
  });
}
