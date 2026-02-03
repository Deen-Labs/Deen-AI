import React, { useState, useEffect, useRef } from "react";

export default function TopBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef(null);
  const toggleRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen && 
          navRef.current && 
          toggleRef.current &&
          !navRef.current.contains(event.target) && 
          !toggleRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className="top-bar">
      <div className="wrapper top-bar__inner">
        <div className="brand">
          <span>
            <img
              src="/assets/logo.PNG"
              alt="DEEN LABS Logo"
              className="h-6"
              style={{ imageRendering: 'auto' }}
            />
          </span>
        </div>
        
        <button 
          ref={toggleRef}
          className="mobile-menu-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav ref={navRef} className={`nav ${isMenuOpen ? 'nav--open' : ''}`} aria-label="Primary">
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
