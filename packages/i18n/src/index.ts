import en from './locales/en.json';
import uz from './locales/uz.json';
import ru from './locales/ru.json';

export const supportedLocales = ['en', 'uz', 'ru'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const resources = {
  en: { translation: en },
  uz: { translation: uz },
  ru: { translation: ru },
} as const;

export { en, uz, ru };
export * from './formatters';
