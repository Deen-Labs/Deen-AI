import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-lg border border-slate-700/60 bg-slate-900/80 backdrop-blur-md shadow-sm transition-all duration-200 select-none theme-toggle-container ${className}`}
      role="group"
      aria-label="Theme Mode Selection"
      data-cursor="magnetic"
    >
      <button
        type="button"
        onClick={() => setThemeMode('dark')}
        className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
          themeMode === 'dark'
            ? 'bg-[#e2a23b] text-slate-950 font-bold shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="Dark Mode (#0f1718)"
      >
        <i className="fa-solid fa-moon text-[11px]" />
        <span className="hidden sm:inline text-[10px]">Dark</span>
      </button>

      <button
        type="button"
        onClick={() => setThemeMode('light')}
        className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
          themeMode === 'light'
            ? 'bg-[#e2a23b] text-slate-950 font-bold shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="Light Mode (#F7F3E8)"
      >
        <i className="fa-solid fa-sun text-[11px]" />
        <span className="hidden sm:inline text-[10px]">Light</span>
      </button>

      <button
        type="button"
        onClick={() => setThemeMode('system')}
        className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
          themeMode === 'system'
            ? 'bg-[#e2a23b] text-slate-950 font-bold shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="Follow System Theme"
      >
        <i className="fa-solid fa-desktop text-[10px]" />
        <span className="hidden sm:inline text-[10px]">Auto</span>
      </button>
    </div>
  );
}
