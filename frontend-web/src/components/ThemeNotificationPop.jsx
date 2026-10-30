import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

export default function ThemeNotificationPop() {
  const { themeMode, setThemeMode } = useTheme();
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    try {
      const storedMin = localStorage.getItem('deen_theme_pop_min');
      if (storedMin === 'true') {
        setIsMinimized(true);
      }
    } catch (e) {}
  }, []);

  const handleToggleMinimize = () => {
    const nextState = !isMinimized;
    setIsMinimized(nextState);
    try {
      localStorage.setItem('deen_theme_pop_min', String(nextState));
    } catch (e) {}
  };

  const handleSelectMode = (mode) => {
    setThemeMode(mode);
    setHasInteracted(true);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 select-none">
      <AnimatePresence mode="wait">
        {!isMinimized ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.94 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="theme-notification-pop rounded-2xl border p-3.5 shadow-2xl backdrop-blur-xl max-w-[320px] transition-colors duration-200"
          >
            {/* Header Notification Message */}
            <div className="flex items-center justify-between gap-3 mb-2.5 pb-2 border-b border-white/10 theme-pop-divider">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                </span>
                <span className="text-[11.5px] font-semibold tracking-tight theme-pop-title">
                  Experience the site in these ways
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleMinimize}
                className="text-slate-400 hover:text-white text-xs p-1 rounded-md hover:bg-white/10 transition-colors"
                title="Minimize theme switcher"
                aria-label="Minimize theme switcher"
              >
                <i className="fa-solid fa-chevron-down text-[10px]" />
              </button>
            </div>

            {/* Mode Switcher Buttons */}
            <div
              className="grid grid-cols-3 gap-1.5 p-1 rounded-xl theme-pop-btn-group"
              role="group"
              aria-label="Theme mode options"
            >
              <button
                type="button"
                onClick={() => handleSelectMode('dark')}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  themeMode === 'dark'
                    ? 'theme-pop-btn-active shadow-md'
                    : 'theme-pop-btn-inactive'
                }`}
                title="Obsidian Night Mode"
              >
                <i className="fa-solid fa-moon text-xs" />
                <span className="text-[11px]">Dark</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMode('light')}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  themeMode === 'light'
                    ? 'theme-pop-btn-active shadow-md'
                    : 'theme-pop-btn-inactive'
                }`}
                title="Warm Alabaster Parchment Mode"
              >
                <i className="fa-solid fa-sun text-xs" />
                <span className="text-[11px]">Light</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMode('system')}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  themeMode === 'system'
                    ? 'theme-pop-btn-active shadow-md'
                    : 'theme-pop-btn-inactive'
                }`}
                title="Follow OS System Theme"
              >
                <i className="fa-solid fa-circle-half-stroke text-xs" />
                <span className="text-[11px]">Auto</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="minimized"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            type="button"
            onClick={handleToggleMinimize}
            className="theme-pop-pill inline-flex items-center gap-2 px-3.5 py-2 rounded-full border shadow-xl backdrop-blur-xl cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200"
            title="Experience the site in these ways (Click to switch theme)"
            aria-label="Open theme mode switcher"
          >
            <i className="fa-solid fa-wand-magic-sparkles text-amber-400 text-xs" />
            <span className="text-xs font-bold theme-pop-pill-text">Theme</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-[11px] font-mono opacity-80">
              {themeMode === 'dark' ? '🌙 Dark' : themeMode === 'light' ? '☀️ Light' : '💻 Auto'}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
