import { useCallback, useEffect, useState } from 'react';
import {
  applyThemeToDocument,
  normalizeTheme,
  prefersLightScheme,
  readStoredTheme,
  resolveInitialTheme,
  THEMES,
  writeStoredTheme,
} from '../lib/theme';

// Per-device theme state. Instantiate once in `App` and pass `theme` +
// `toggleTheme` down; the choice is persisted locally and never synced.
export function useTheme() {
  const [theme, setThemeState] = useState(() =>
    resolveInitialTheme({
      storedTheme: readStoredTheme(),
      prefersLight: prefersLightScheme(),
    }),
  );

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const setTheme = useCallback((next) => {
    const normalized = normalizeTheme(next) ?? THEMES.NIGHT;
    setThemeState(normalized);
    writeStoredTheme(normalized);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === THEMES.DAY ? THEMES.NIGHT : THEMES.DAY);
  }, [theme, setTheme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDay: theme === THEMES.DAY,
  };
}
