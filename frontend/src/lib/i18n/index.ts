import { fr } from "./locales/fr";
import { en } from "./locales/en";

export const translations = {
  fr,
  en,
} as const;

export type Locale = keyof typeof translations;
export type Translation = typeof fr;

export { fr, en };
