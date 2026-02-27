import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function riskColor(risk: string): string {
  switch (risk) {
    case 'low':
      return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    case 'medium':
      return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    case 'high':
      return 'text-red-400 bg-red-400/10 border-red-400/20';
    default:
      return 'text-muted bg-muted/10 border-muted/20';
  }
}

export function outcomeColor(outcome: string): string {
  switch (outcome) {
    case 'success':
      return 'text-emerald-400';
    case 'failure':
      return 'text-red-400';
    case 'pending':
      return 'text-amber-400';
    default:
      return 'text-muted';
  }
}
