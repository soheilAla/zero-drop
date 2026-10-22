import { computed, ref, watchEffect } from "vue";
import { en } from "./en.ts";
import { fa } from "./fa.ts";

export type Locale = "en" | "fa";

const STORAGE_KEY = "zero_drop_locale";

function getInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "fa") {
    return stored;
  }

  if (navigator.language?.toLowerCase().startsWith("fa")) {
    return "fa";
  }

  return "en";
}

const currentLocale = ref<Locale>(getInitialLocale());

if (typeof window !== "undefined") {
  watchEffect(() => {
    const isFa = currentLocale.value === "fa";
    document.documentElement.lang = currentLocale.value;
    document.documentElement.dir = isFa ? "rtl" : "ltr";
    localStorage.setItem(STORAGE_KEY, currentLocale.value);
  });
}

export function setLocale(locale: Locale) {
  currentLocale.value = locale;
}

export const locale = computed(() => currentLocale.value);
export const isRtl = computed(() => currentLocale.value === "fa");

export const messages = {
  en,
  fa,
} as const;

export type TranslationKey = keyof typeof messages.en;

export function t(key: TranslationKey): string {
  const lang = currentLocale.value;
  return messages[lang]?.[key] ?? messages.en[key] ?? key;
}

/**
 * Reactively translate error messages. If the error is a known translation key,
 * it returns the translated message for the current active locale.
 * Otherwise, it returns the raw error string unchanged.
 */
export function translateError(error: string | null | undefined): string {
  if (!error) return "";
  if (error in messages.en) {
    return t(error as TranslationKey);
  }
  return error;
}

// Convert Persian and Arabic numerals to Latin digits.
export function toLatinDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/[۰-۹٠-٩]/g, (char) => {
      const code = char.charCodeAt(0);
      return String(code >= 1776 ? code - 1776 : code - 1632);
    })
    .replaceAll("٫", ".");
}

export function formatDurationI18n(expiresAtIso: string, currentLang: Locale): string {
  if (!expiresAtIso) {
    return "";
  }
  const targetDate = new Date(expiresAtIso).getTime();
  if (Number.isNaN(targetDate)) {
    return "";
  }

  const diffSeconds = Math.round((targetDate - Date.now()) / 1000);
  if (diffSeconds <= 0) {
    return messages[currentLang]["created.expired"];
  }

  const totalMinutes = Math.max(1, Math.round(diffSeconds / 60));
  const daysVal = Math.floor(totalMinutes / 1440);
  const remainingMinutes = totalMinutes % 1440;
  const hoursVal = Math.floor(remainingMinutes / 60);
  const minutesVal = remainingMinutes % 60;

  const parts: string[] = [];
  if (daysVal > 0) {
    const unit =
      daysVal === 1 ? messages[currentLang]["created.day"] : messages[currentLang]["created.days"];
    parts.push(`${daysVal} ${unit}`);
  }
  if (hoursVal > 0) {
    const unit =
      hoursVal === 1
        ? messages[currentLang]["created.hour"]
        : messages[currentLang]["created.hours"];
    parts.push(`${hoursVal} ${unit}`);
  }
  if (minutesVal > 0) {
    const unit =
      minutesVal === 1
        ? messages[currentLang]["created.minute"]
        : messages[currentLang]["created.minutes"];
    parts.push(`${minutesVal} ${unit}`);
  }

  const separator = currentLang === "fa" ? " و " : ", ";
  return parts.length > 0 ? parts.join(separator) : messages[currentLang]["created.lessThanMinute"];
}
