import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useCursor } from '../context/CursorContext';

export default function RotatedSquareCursor() {
  const [isTouch, setIsTouch] = useState(false);
  const { cursorState } = useCursor();
  
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Smooth lag physics - extremely snappy and hardware accelerated
  const springConfig = { damping: 28, stiffness: 400, mass: 0.2 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    // Detect touch devices
    if (window.matchMedia('(pointer: coarse)').matches) {
      setIsTouch(true);
      return;
    }

    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (isTouch) return null;

  // Different variants based on state (snapping/expanding) using hardware-accelerated 'scale' instead of width/height
  const variants = {
    default: {
      scale: 1,
      rotate: 45,
      borderRadius: '0%',
      border: '1px solid rgba(30, 143, 130, 0.5)',
      backgroundColor: 'transparent'
    },
    magnetic: {
      scale: 1.5,
      rotate: 45,
      borderRadius: '0%',
      border: '2px solid rgba(226, 162, 59, 0.8)',
      backgroundColor: 'rgba(226, 162, 59, 0.1)'
    },
    card: {
      scale: 2,
      rotate: 0,
      borderRadius: '50%',
      border: '1px solid rgba(30, 143, 130, 0.8)',
      backgroundColor: 'rgba(30, 143, 130, 0.05)'
    }
  };

  return (
    <>
      {/* Outer lagging diamond container (handles tracking) */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-exclusion"
        style={{ x: smoothX, y: smoothY, willChange: 'transform' }}
      >
        {/* Inner animated diamond (handles size, rotation, and centering) */}
        <motion.div
          className="absolute -left-4 -top-4 w-8 h-8"
          variants={variants}
          animate={cursorState}
          transition={{ type: 'spring', ...springConfig }}
          style={{ willChange: 'transform' }}
        />
      </motion.div>

      {/* Inner precise dot */}
      <motion.div
        className="fixed top-0 left-0 w-1.5 h-1.5 bg-white rounded-full pointer-events-none z-[10000]"
        style={{ x: mouseX, y: mouseY, marginLeft: '-3px', marginTop: '-3px' }}
      />
    </>
  );
}

