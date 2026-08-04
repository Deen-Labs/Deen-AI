import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion';
import { useCursor } from '../context/CursorContext';

export default function InteractiveProjectCard({ children, className = '', id, ...props }) {
  const { setCursorState } = useCursor();
  const ref = useRef(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 300, mass: 0.5 };
  const smoothX = useSpring(x, springConfig);
  const smoothY = useSpring(y, springConfig);

  // Map mouse position to rotation. 
  // Subtle tilt (max 5 degrees) prevents aggressive layout thrashing
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [5, -5]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-5, 5]);

  // Glare effect follows the mouse
  const glareX = useTransform(smoothX, [-0.5, 0.5], [0, 100]);
  const glareY = useTransform(smoothY, [-0.5, 0.5], [0, 100]);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.06) 0%, transparent 60%)`;

  const handlePointerMove = (e) => {
    if (!ref.current) return;
    const { width, height, left, top } = ref.current.getBoundingClientRect();
    const localX = (e.clientX - left) / width - 0.5;
    const localY = (e.clientY - top) / height - 0.5;
    
    x.set(localX);
    y.set(localY);
  };

  const handlePointerEnter = () => {
    setCursorState('card');
  };

  const handlePointerLeave = () => {
    setCursorState('default');
    x.set(0);
    y.set(0);
  };

  return (
    <article
      id={id}
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={`relative cursor-none ${className}`}
      style={{ perspective: 1500 }}
      {...props}
    >
      <motion.div
        className="w-full h-full relative rounded-inherit"
        style={{ 
          rotateX, 
          rotateY,
          transformStyle: 'preserve-3d',
          willChange: 'transform'
        }}
      >
        <motion.div 
          style={{ 
            background: glareBackground,
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 10,
            mixBlendMode: 'overlay',
            borderRadius: 'inherit'
          }}
        />
        {/* We remove translateZ here to prevent the browser from rasterizing text and losing subpixel anti-aliasing */}
        <div className="relative z-0 w-full h-full">
          {children}
          
          {/* Diamond motif integrated into card */}
          <div style={{
            position: 'absolute',
            bottom: '-2.5rem',
            right: '-2.5rem',
            width: '8rem',
            height: '8rem',
            border: '1px solid var(--edge, rgba(30, 143, 130, 0.4))',
            opacity: 0.15,
            transform: 'rotate(45deg)',
            pointerEvents: 'none',
            zIndex: -1
          }} />
        </div>
      </motion.div>
    </article>
  );
}
