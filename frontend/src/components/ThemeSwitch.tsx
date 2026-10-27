'use client';

import { useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY as STORAGE_KEY } from '@/lib/theme';

type Theme = 'system' | 'light' | 'dark';

const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
const listeners = new Set<() => void>();

// Thin line icons in the text colour: a half-filled circle for Auto, a sun, a crescent moon.
const ICONS: Record<Theme, React.ReactNode> = {
  system: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" stroke="none" />
    </>
  ),
  light: (
    <>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" />
    </>
  ),
  dark: <path d="M13.5 9.5A5.5 5.5 0 1 1 6.5 2.5a4.5 4.5 0 0 0 7 7z" />,
};

function currentTheme(): Theme {
  const theme = document.documentElement.dataset.theme;
  return theme === 'light' || theme === 'dark' ? theme : 'system';
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setTheme(theme: Theme) {
  if (theme === 'system') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
  try {
    if (theme === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked; the choice still applies until the page reloads.
  }
  listeners.forEach((listener) => listener());
}

export default function ThemeSwitch() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => 'system' as Theme);

  return (
    <button
      type="button"
      className="theme-switch"
      onClick={() => setTheme(NEXT[theme])}
      aria-label={`Theme: ${theme}. Switch to ${NEXT[theme]}.`}
      title={`Switch to ${NEXT[theme]}`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICONS[theme]}
      </svg>
    </button>
  );
}
