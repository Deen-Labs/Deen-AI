import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useCursor } from '../context/CursorContext';
import { twMerge } from 'tailwind-merge';

export default function MagneticButton({ 
  children, 
  as: Component = 'button',
  className = '',
  ...props 
}) {
  const { setCursorState } = useCursor();
  const ref = useRef(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 300, mass: 0.5 };
  const smoothX = useSpring(x, springConfig);
  const smoothY = useSpring(y, springConfig);

  const handlePointerMove = (e) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    
    // Magnetic pull (max 20px)
    const pullX = (clientX - centerX) * 0.15;
    const pullY = (clientY - centerY) * 0.15;
    
    x.set(pullX);
    y.set(pullY);
  };

  const handlePointerEnter = () => {
    setCursorState('magnetic');
  };

  const handlePointerLeave = () => {
    setCursorState('default');
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      style={{ x: smoothX, y: smoothY, display: 'inline-flex', willChange: 'transform' }}
    >
      <Component className={twMerge("cursor-none relative z-10 block w-full", className)} {...props}>
        {children}
      </Component>
    </motion.div>
  );
}
