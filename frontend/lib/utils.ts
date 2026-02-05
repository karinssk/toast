import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatPrice(price: number): string {
  return `฿${price.toLocaleString()}`;
}

export function formatPriceLevel(level: number): string {
  return '฿'.repeat(level);
}

export function formatRating(rating: number | null | undefined): string {
  if (rating == null) return 'N/A';
  return rating.toFixed(1);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
