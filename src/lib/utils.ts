import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const translations = {
  'card-purchase': {
    fr: 'Achat de carte DRAVA',
    en: 'DRAVA card purchase',
  },
  'card-top-up': {
    fr: 'Recharge de carte DRAVA',
    en: 'DRAVA card top-up',
  },
};
