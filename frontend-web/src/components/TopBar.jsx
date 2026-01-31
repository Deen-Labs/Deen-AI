import React from "react";

export default function TopBar() {
  return (
    <header className="top-bar">
      <div className="wrapper top-bar__inner">
        <div className="brand">
          <span>
            <img
              src="/assets/logo.PNG"
              alt="DEEN LABS Logo"
              className="w-32 h-32"
            />
          </span>
          <span>DEEN LABS</span>
        </div>
        <nav className="nav" aria-label="Primary">
          <a href="#mission">Mission</a>
          <a href="#features">Features</a>
          <a href="#team">Team</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="button" href="#contact">
          Connect with us
        </a>
      </div>
    </header>
  );
}
