import React, { useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';

export function ThemeToggle() {
  const theme = useGameStore(state => state.theme);
  const setTheme = useGameStore(state => state.setTheme);
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        className="toggle toggle-primary"
        checked={theme === 'dark'}
        onChange={e => setTheme(e.target.checked ? 'dark' : 'light')}
        aria-label="Toggle dark mode"
      />
      <span className="text-xs font-semibold">
        {theme === 'dark' ? 'Dark' : 'Light'}
      </span>
    </label>
  );
}
