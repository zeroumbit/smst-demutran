import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalizeNome(nome: string): string {
  const lowercased = nome.toLowerCase();
  const words = lowercased.split(' ');
  return words.map((word, i) =>
    i > 0 && ['de', 'da', 'do', 'das', 'dos', 'e'].includes(word)
      ? word
      : word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}
