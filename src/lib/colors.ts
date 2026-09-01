import type { CategoryColor } from '../types';

type ColorTokens = {
  dot: string;
  text: string;
  bgSoft: string;
  border: string;
  ring: string;
  bar: string;
};

export const colorMap: Record<CategoryColor, ColorTokens> = {
  brand: {
    dot: 'bg-brand',
    text: 'text-brand-strong',
    bgSoft: 'bg-brand-soft',
    border: 'border-brand',
    ring: 'ring-brand',
    bar: 'bg-brand',
  },
  coral: {
    dot: 'bg-coral',
    text: 'text-coral',
    bgSoft: 'bg-coral/12',
    border: 'border-coral',
    ring: 'ring-coral',
    bar: 'bg-coral',
  },
  amber: {
    dot: 'bg-amber',
    text: 'text-amber',
    bgSoft: 'bg-amber/12',
    border: 'border-amber',
    ring: 'ring-amber',
    bar: 'bg-amber',
  },
  moss: {
    dot: 'bg-moss',
    text: 'text-moss',
    bgSoft: 'bg-moss/12',
    border: 'border-moss',
    ring: 'ring-moss',
    bar: 'bg-moss',
  },
  sky: {
    dot: 'bg-sky',
    text: 'text-sky',
    bgSoft: 'bg-sky/12',
    border: 'border-sky',
    ring: 'ring-sky',
    bar: 'bg-sky',
  },
  plum: {
    dot: 'bg-plum',
    text: 'text-plum',
    bgSoft: 'bg-plum/12',
    border: 'border-plum',
    ring: 'ring-plum',
    bar: 'bg-plum',
  },
};

export const colorOptions: CategoryColor[] = ['brand', 'coral', 'amber', 'moss', 'sky', 'plum'];

export const priorityTokens = {
  high: { label: 'High', dot: 'bg-danger', text: 'text-danger' },
  medium: { label: 'Medium', dot: 'bg-amber', text: 'text-amber' },
  low: { label: 'Low', dot: 'bg-ink-faint', text: 'text-ink-soft' },
} as const;
