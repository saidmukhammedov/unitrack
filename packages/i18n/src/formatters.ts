import type { SupportedLocale } from './index';

/**
 * Standard date formatting per locale (docs/localization.md §7.1)
 * en: MM/DD/YYYY
 * uz: DD.MM.YYYY
 * ru: DD.MM.YYYY
 */
export function formatDate(
  date: Date | string,
  locale: SupportedLocale = 'en',
  timezone?: string,
  style: 'short' | 'long' = 'short'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const localeMap: Record<SupportedLocale, string> = {
    en: 'en-US',
    uz: 'uz-UZ',
    ru: 'ru-RU',
  };

  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone || 'UTC',
  };

  if (style === 'long') {
    options.year = 'numeric';
    options.month = 'long';
    options.day = 'numeric';
  } else {
    options.year = 'numeric';
    options.month = '2-digit';
    options.day = '2-digit';
  }

  return new Intl.DateTimeFormat(localeMap[locale] || 'en-US', options).format(d);
}

/**
 * Standard time formatting per locale (docs/localization.md §7.2)
 * en: 12-hour clock (e.g. 2:30 PM)
 * uz: 24-hour clock (e.g. 14:30)
 * ru: 24-hour clock (e.g. 14:30)
 */
export function formatTime(
  dateOrTime: Date | string,
  locale: SupportedLocale = 'en',
  timezone?: string
): string {
  // If time string like "14:30" or "09:00"
  if (typeof dateOrTime === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(dateOrTime)) {
    if (locale === 'en') {
      const [hoursStr, minsStr] = dateOrTime.split(':');
      let hours = parseInt(hoursStr, 10);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minsStr} ${ampm}`;
    }
    return dateOrTime.substring(0, 5);
  }

  const d = typeof dateOrTime === 'string' ? new Date(dateOrTime) : dateOrTime;
  if (isNaN(d.getTime())) return '';

  const is12Hour = locale === 'en';
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone || 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: is12Hour,
  };

  const localeMap: Record<SupportedLocale, string> = {
    en: 'en-US',
    uz: 'uz-UZ',
    ru: 'ru-RU',
  };

  return new Intl.DateTimeFormat(localeMap[locale] || 'en-US', options).format(d);
}

/**
 * Standard number formatting per locale (docs/localization.md §7.3)
 * en: 1,234.56
 * uz: 1 234,56
 * ru: 1 234,56
 */
export function formatNumber(
  value: number,
  locale: SupportedLocale = 'en',
  options?: Intl.NumberFormatOptions
): string {
  const localeMap: Record<SupportedLocale, string> = {
    en: 'en-US',
    uz: 'uz-UZ',
    ru: 'ru-RU',
  };

  return new Intl.NumberFormat(localeMap[locale] || 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

/**
 * Formats a percentage grade with 2 decimal places: e.g. "80.75%" or "80,75%"
 */
export function formatPercentage(value: number, locale: SupportedLocale = 'en'): string {
  return `${formatNumber(value, locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

/**
 * Formats a GPA value with 2 decimal places: e.g. "3.85" or "3,85"
 */
export function formatGpa(value: number, locale: SupportedLocale = 'en'): string {
  return formatNumber(value, locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}