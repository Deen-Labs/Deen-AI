import React, { useEffect } from "react";

/**
 * Headless Automatic Display Scaling Engine
 * Automatically applies dynamic typography scaling for 1440p (27"), 4K UHD, and Ultrawide monitors.
 * Completely automatic with no manual UI controls or buttons.
 */
export default function DisplayScaleWidget() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const detectAndApply = () => {
      const sw = window.screen.width || window.innerWidth;
      const sh = window.screen.height || window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      const iw = window.innerWidth;

      let autoScale = 1.0;

      if (sw >= 3440 || (sw >= 1920 && dpr >= 2 && sw * dpr >= 3840)) {
        autoScale = (sw / sh > 2.0) ? 1.30 : 1.45;
      } else if (sw >= 2400 || (sw >= 2000 && sh >= 1300) || iw >= 2200) {
        autoScale = 1.25; // 1440p QHD 27" monitor
      } else if (sw >= 1800 || iw >= 1800) {
        autoScale = 1.05;
      } else {
        autoScale = 1.0;
      }

      document.documentElement.style.setProperty("--display-scale", autoScale.toString());
      document.documentElement.style.fontSize = `${16 * autoScale}px`;
    };

    const detectRefreshRate = () => {
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
        if (frames < 30) {
          requestAnimationFrame(sample);
        } else {
          deltas.sort((a, b) => a - b);
          const trimmed = deltas.slice(Math.floor(deltas.length * 0.2), Math.ceil(deltas.length * 0.8));
          const avg = trimmed.reduce((sum, v) => sum + v, 0) / (trimmed.length || 1);
          const fps = 1000 / avg;

          if (fps >= 110) {
            document.body.classList.add("high-fps-mode");
          }
        }
      };
      requestAnimationFrame(sample);
    };

    detectAndApply();
    detectRefreshRate();

    window.addEventListener("resize", detectAndApply, { passive: true });
    return () => {
      window.removeEventListener("resize", detectAndApply);
    };
  }, []);

  return null;
}
