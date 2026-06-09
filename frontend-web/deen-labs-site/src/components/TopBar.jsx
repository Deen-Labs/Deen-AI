import React, { useState } from "react";

export default function TopBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="top-bar">
      <div className="wrapper top-bar__inner">
        <div className="brand flex flex-col items-start">
          <img
            src="/assets/logo.PNG"
            alt="DEEN LABS Logo"
            className="h-14 w-auto object-contain"
            style={{ imageRendering: 'auto' }}
          />
          <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold mt-1.5 ml-1 select-none">Technology Lab</span>
        </div>

        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className={`nav ${isMenuOpen ? 'nav--open' : ''}`} aria-label="Primary">
          <a href="#mission" onClick={() => setIsMenuOpen(false)}>Mission</a>
          <a href="#features" onClick={() => setIsMenuOpen(false)}>Features</a>
          <a href="#team" onClick={() => setIsMenuOpen(false)}>Team</a>
          <a href="#contact" onClick={() => setIsMenuOpen(false)}>Contact</a>
          <a className="button" href="#contact" onClick={() => setIsMenuOpen(false)}>
            Connect with us
          </a>
        </nav>
      </div>
    </header>
  );
}
