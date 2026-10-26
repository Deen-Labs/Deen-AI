import React, { useState, useEffect, useRef } from "react";

export default function DisplayScaleWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1.0);
  const [mode, setMode] = useState("auto");
  const [profile, setProfile] = useState({
    category: "1080p Standard",
    diag: '24"',
    res: "1920 × 1080",
    dpr: 1,
    autoScale: 1.0,
  });
  const [refreshHz, setRefreshHz] = useState(60);
  const [fpsSync, setFpsSync] = useState(true);
  const menuRef = useRef(null);

  // 1. Detect display hardware profile
  const detectProfile = () => {
    if (typeof window === "undefined") return;
    const sw = window.screen.width || window.innerWidth;
    const sh = window.screen.height || window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const iw = window.innerWidth;

    let category = "1080p Standard";
    let diag = '24"';
    let autoScale = 1.0;

    if (sw >= 3440 || (sw >= 1920 && dpr >= 2 && sw * dpr >= 3840)) {
      if (sw / sh > 2.0) {
        category = "Ultrawide (21:9)";
        diag = '34"';
        autoScale = 1.30;
      } else {
        category = "4K UHD";
        diag = '32"';
        autoScale = 1.45;
      }
    } else if (sw >= 2400 || (sw >= 2000 && sh >= 1300) || iw >= 2200) {
      category = "1440p QHD";
      diag = '27"';
      autoScale = 1.25; // Ideal scaling for 1440p 27" monitors
    } else if (sw >= 1800 || iw >= 1800) {
      category = "1080p Full HD";
      diag = '24"';
      autoScale = 1.05;
    } else if (sw >= 1300) {
      category = "Laptop Display";
      diag = '14"-16"';
      autoScale = 1.0;
    } else {
      category = "Compact View";
      diag = "Mobile/Tablet";
      autoScale = 1.0;
    }

    setProfile({
      category,
      diag,
      res: `${sw} × ${sh}`,
      dpr,
      autoScale,
    });
    return autoScale;
  };

  // 2. Measure display refresh rate via requestAnimationFrame
  const measureHz = () => {
    if (typeof window === "undefined") return;
    let frames = 0;
    let lastTime = performance.now();
    const deltas = [];

    const sample = (now) => {
      const delta = now - lastTime;
      lastTime = now;
      if (delta > 2 && delta < 100) {
        deltas.push(delta);
      }
      frames++;
      if (frames < 45) {
        requestAnimationFrame(sample);
      } else {
        deltas.sort((a, b) => a - b);
        const trimmed = deltas.slice(
          Math.floor(deltas.length * 0.2),
          Math.ceil(deltas.length * 0.8)
        );
        const avg =
          trimmed.reduce((sum, v) => sum + v, 0) / (trimmed.length || 1);
        const fps = 1000 / avg;

        let hz = 60;
        if (fps >= 215) hz = 240;
        else if (fps >= 155) hz = 165;
        else if (fps >= 135) hz = 144;
        else if (fps >= 110) hz = 120;
        else if (fps >= 85) hz = 90;
        else if (fps >= 70) hz = 75;
        else hz = 60;

        setRefreshHz(hz);
        if (hz >= 120) {
          document.body.classList.add("high-fps-mode");
        }
      }
    };
    requestAnimationFrame(sample);
  };

  const applyScale = (newScale, newMode = "auto") => {
    const clamped = Math.min(Math.max(parseFloat(newScale) || 1.0, 0.85), 1.6);
    setScale(clamped);
    setMode(newMode);

    document.documentElement.style.setProperty("--display-scale", clamped.toString());
    document.documentElement.style.fontSize = `${16 * clamped}px`;

    localStorage.setItem("deen_display_scale_mode", newMode);
    localStorage.setItem("deen_display_scale_val", clamped.toString());
  };

  useEffect(() => {
    const autoScale = detectProfile();
    measureHz();

    const storedMode = localStorage.getItem("deen_display_scale_mode") || "auto";
    const storedVal = parseFloat(localStorage.getItem("deen_display_scale_val"));

    if (storedMode === "manual" && !isNaN(storedVal)) {
      applyScale(storedVal, "manual");
    } else {
      applyScale(autoScale || 1.0, "auto");
    }

    const handleResize = () => {
      if (localStorage.getItem("deen_display_scale_mode") === "auto") {
        const freshAuto = detectProfile();
        applyScale(freshAuto, "auto");
      }
    };

    window.addEventListener("resize", handleResize, { passive: true });

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleFpsToggle = (e) => {
    const enabled = e.target.checked;
    setFpsSync(enabled);
    if (enabled) {
      document.body.classList.add("high-fps-mode");
    } else {
      document.body.classList.remove("high-fps-mode");
    }
  };

  const pct = Math.round(scale * 100);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-all duration-200 cursor-pointer shadow-sm group select-none"
        title="Click to adjust Dynamic Display Scaling & Refresh Rate"
      >
        <i className="fa-solid fa-desktop text-[#e2a23b] text-xs group-hover:scale-110 transition-transform"></i>
        <span className="hidden xl:inline font-mono text-[10.5px] text-slate-300">
          {profile.category.split(" ")[0]} ({profile.diag})
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="font-mono font-bold text-[#e2a23b] text-[10.5px]">
          {pct}%
        </span>
        <span className="hidden lg:inline-flex px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          {refreshHz}Hz
        </span>
        <i className="fa-solid fa-chevron-down text-[9px] text-slate-500 group-hover:text-slate-300 ml-0.5"></i>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-88 bg-[#0a181b]/95 border border-[#e2a23b]/30 rounded-2xl shadow-2xl backdrop-blur-xl p-4 z-50 text-left transition-all duration-200"
          style={{
            boxShadow:
              "0 20px 50px rgba(0,0,0,0.8), 0 0 25px rgba(226,162,59,0.15)",
          }}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#e2a23b]/15 border border-[#e2a23b]/30 flex items-center justify-center text-[#e2a23b] text-xs">
                <i className="fa-solid fa-sliders"></i>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">
                  Display & Refresh Tuning
                </h4>
                <p className="text-[9px] text-slate-400">
                  Dynamic DPI & High-FPS Optimization
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md text-xs cursor-pointer"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Detected Hardware Readout */}
          <div className="mt-2.5 p-2 bg-black/40 border border-white/5 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Detected Display:</span>
              <span className="font-bold text-white font-mono">
                {profile.category} (~{profile.diag})
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Canvas Resolution:</span>
              <span className="font-mono text-[#e2a23b] font-semibold">
                {profile.res} (DPR: {profile.dpr}x)
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Refresh Rate:</span>
              <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                <i className="fa-solid fa-bolt text-[9px]"></i>
                <span>{refreshHz} Hz (Smooth)</span>
              </span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mt-3">
            <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Scale Presets
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const autoVal = detectProfile();
                  applyScale(autoVal, "auto");
                }}
                className={`px-2 py-1.5 text-[10px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                  mode === "auto"
                    ? "bg-[#e2a23b] text-slate-950 border-[#e2a23b]"
                    : "bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
                }`}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => applyScale(1.0, "manual")}
                className={`px-2 py-1.5 text-[10px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                  mode === "manual" && scale === 1.0
                    ? "bg-[#e2a23b] text-slate-950 border-[#e2a23b]"
                    : "bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
                }`}
              >
                100%
              </button>
              <button
                type="button"
                onClick={() => applyScale(1.15, "manual")}
                className={`px-2 py-1.5 text-[10px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                  mode === "manual" && scale === 1.15
                    ? "bg-[#e2a23b] text-slate-950 border-[#e2a23b]"
                    : "bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
                }`}
              >
                115%
              </button>
              <button
                type="button"
                onClick={() => applyScale(1.25, "manual")}
                className={`px-2 py-1.5 text-[10px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                  mode === "manual" && scale === 1.25
                    ? "bg-[#e2a23b] text-slate-950 border-[#e2a23b]"
                    : "bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
                }`}
              >
                125%
              </button>
            </div>
          </div>

          {/* Continuous Precision Slider */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-slate-400">Fine Sizing Control:</span>
              <span className="font-mono text-[#e2a23b] font-bold">
                {pct}% {mode === "auto" ? "(Auto)" : ""}
              </span>
            </div>
            <input
              type="range"
              min="85"
              max="160"
              step="5"
              value={pct}
              onChange={(e) => applyScale(parseFloat(e.target.value) / 100, "manual")}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <div className="flex justify-between text-[8px] text-slate-500 font-mono mt-1">
              <span>85% (Compact)</span>
              <span>125% (27" 1440p)</span>
              <span>160% (4K Ultra)</span>
            </div>
          </div>

          {/* Refresh Rate & Smooth Motion Toggle */}
          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-white block">
                High-FPS Motion Sync
              </span>
              <span className="text-[8.5px] text-slate-400">
                Synchronize animations with display Hz
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={fpsSync}
                onChange={handleFpsToggle}
                className="sr-only peer"
              />
              <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
