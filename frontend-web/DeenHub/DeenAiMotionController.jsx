import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, animate } from "framer-motion";

/**
 * DeenAiMotionController
 * Provides Framer Motion custom cursor (RotatedSquareCursor) and magnetic button physics
 * for the Deen-AI Interactive Live Preview Page.
 */
export default function DeenAiMotionController() {
  const [isTouch, setIsTouch] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [cursorState, setCursorState] = useState("default");

  // Raw mouse coordinates for the 0ms precision inner dot
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Smooth spring lag physics matching Deen Labs portfolio cursor
  const springConfig = { damping: 28, stiffness: 400, mass: 0.2 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // 1. Initialize cursor tracking and dynamic hover detection
  useEffect(() => {
    // Detect touch / coarse pointer devices
    if (window.matchMedia("(pointer: coarse)").matches) {
      setIsTouch(true);
      return;
    }

    document.body.classList.add("custom-cursor");

    const handleMouseMove = (e) => {
      if (!isVisible) setIsVisible(true);
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);

      // Determine cursor state based on element under cursor
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (target) {
        if (
          target.closest(
            'button, a, [role="button"], input[type="button"], input[type="submit"], .phone-tab-btn, .quick-jump-pill, .keypad-key, [data-cursor="magnetic"]'
          )
        ) {
          setCursorState("magnetic");
        } else if (
          target.closest(
            '.feature-deepdive-card, .phone-simulator-frame, [data-cursor="card"], article'
          )
        ) {
          setCursorState("card");
        } else {
          setCursorState("default");
        }
      }
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      document.body.classList.remove("custom-cursor");
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [isVisible, mouseX, mouseY]);

  // 2. Attach Framer Motion magnetic pull and hover/tap scale effects to all interactive buttons
  useEffect(() => {
    if (isTouch) return;

    const attachMagneticEffect = (el) => {
      if (!el || el.dataset.magneticAttached === "true") return;
      el.dataset.magneticAttached = "true";

      const isInsidePhone = Boolean(el.closest("#phone-container"));
      // Subtle displacement inside phone simulator to preserve layout bounds
      const pullFactor = isInsidePhone ? 0.08 : 0.16;
      const maxPull = isInsidePhone ? 4 : 14;

      let isHovered = false;

      const onPointerEnter = (e) => {
        if (e.pointerType === "touch") return;
        isHovered = true;
        animate(el, { scale: 1.05 }, { type: "spring", stiffness: 400, damping: 25 });
      };

      const onPointerMove = (e) => {
        if (e.pointerType === "touch" || !isHovered) return;
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let pullX = (e.clientX - centerX) * pullFactor;
        let pullY = (e.clientY - centerY) * pullFactor;

        pullX = Math.max(-maxPull, Math.min(maxPull, pullX));
        pullY = Math.max(-maxPull, Math.min(maxPull, pullY));

        animate(
          el,
          { x: pullX, y: pullY, scale: 1.05 },
          { type: "spring", stiffness: 350, damping: 20, mass: 0.5 }
        );
      };

      const onPointerDown = (e) => {
        if (e.pointerType === "touch") return;
        animate(el, { scale: 0.94 }, { type: "spring", stiffness: 450, damping: 25 });
      };

      const onPointerUp = (e) => {
        if (e.pointerType === "touch") return;
        animate(el, { scale: 1.05 }, { type: "spring", stiffness: 400, damping: 25 });
      };

      const onPointerLeave = (e) => {
        if (e.pointerType === "touch") return;
        isHovered = false;
        animate(
          el,
          { x: 0, y: 0, scale: 1 },
          { type: "spring", stiffness: 320, damping: 22, mass: 0.5 }
        );
      };

      el.addEventListener("pointerenter", onPointerEnter);
      el.addEventListener("pointermove", onPointerMove);
      el.addEventListener("pointerdown", onPointerDown);
      el.addEventListener("pointerup", onPointerUp);
      el.addEventListener("pointerleave", onPointerLeave);
    };

    const scanAndAttach = () => {
      const selectors = [
        "button",
        "a[href]",
        ".quick-jump-pill",
        ".phone-tab-btn",
        ".keypad-key",
        '[role="button"]',
        "[data-magnetic]",
      ];
      document.querySelectorAll(selectors.join(", ")).forEach(attachMagneticEffect);
    };

    scanAndAttach();

    // Use MutationObserver so dynamically opened modals (PIN keypad, Qibla compass) also get the magnetic effect
    const observer = new MutationObserver(() => {
      scanAndAttach();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [isTouch]);

  if (isTouch) return null;

  // Diamond variants matching Deen Labs signature aesthetic
  const variants = {
    default: {
      scale: 1,
      rotate: 45,
      borderRadius: "0%",
      border: "1px solid rgba(30, 143, 130, 0.55)",
      backgroundColor: "transparent",
    },
    magnetic: {
      scale: 1.5,
      rotate: 45,
      borderRadius: "0%",
      border: "2px solid rgba(226, 162, 59, 0.85)",
      backgroundColor: "rgba(226, 162, 59, 0.12)",
    },
    card: {
      scale: 2,
      rotate: 0,
      borderRadius: "50%",
      border: "1px solid rgba(30, 143, 130, 0.85)",
      backgroundColor: "rgba(30, 143, 130, 0.06)",
    },
  };

  return (
    <>
      {/* Outer lagging diamond container with hardware acceleration */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-exclusion"
        style={{
          x: smoothX,
          y: smoothY,
          opacity: isVisible ? 1 : 0,
          willChange: "transform, opacity",
          transition: "opacity 0.2s ease-out",
        }}
      >
        {/* Inner animated morphing diamond */}
        <motion.div
          className="absolute -left-4 -top-4 w-8 h-8"
          variants={variants}
          animate={cursorState}
          transition={{ type: "spring", ...springConfig }}
          style={{ willChange: "transform" }}
        />
      </motion.div>

      {/* Inner sharp 0ms latency coordinate dot */}
      <motion.div
        className="fixed top-0 left-0 w-1.5 h-1.5 bg-white rounded-full pointer-events-none z-[10000] mix-blend-difference"
        style={{
          x: mouseX,
          y: mouseY,
          marginLeft: "-3px",
          marginTop: "-3px",
          opacity: isVisible ? 1 : 0,
          willChange: "transform, opacity",
          transition: "opacity 0.15s ease-out",
        }}
      />
    </>
  );
}
