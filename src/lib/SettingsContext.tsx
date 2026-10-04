import { createContext, useContext, type ReactNode } from 'react';
import type { JarvisSettings } from '../types';
import { useLocalStorage } from './storage';

export const DEFAULT_SETTINGS: JarvisSettings = {
  userName: '',
  morningBriefing: '07:30',
  eveningReview: '20:30',
  defaultRemindMinutes: 10,
  voice: false,
  apiKey: '',
  focusMinutes: 25,
};

type SettingsContextValue = {
  settings: JarvisSettings;
  updateSettings: (patch: Partial<JarvisSettings>) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useLocalStorage<JarvisSettings>('jarvis.settings', DEFAULT_SETTINGS);
  // Merge so settings added in later versions get their defaults.
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  const updateSettings = (patch: Partial<JarvisSettings>) => setStored((prev) => ({ ...DEFAULT_SETTINGS, ...prev, ...patch }));

  return <SettingsContext.Provider value={{ settings, updateSettings }}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
