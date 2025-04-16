'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  animation?: 'fade' | 'slide' | 'zoom';
}

const animations = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
  },
  slide: {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -20, opacity: 0 },
    transition: { duration: 0.3 }
  },
  zoom: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: { duration: 0.3 }
  }
};

export default function PageTransition({ 
  children, 
  className = '',
  animation = 'fade'
}: PageTransitionProps) {
  const animationProps = animations[animation];

  return (
    <motion.div
      className={className}
      initial={animationProps.initial}
      animate={animationProps.animate}
      exit={animationProps.exit}
      transition={animationProps.transition}
    >
      {children}
    </motion.div>
  );
}

export function WithPageTransition<P extends object>(
  Component: React.ComponentType<P>,
  animation: 'fade' | 'slide' | 'zoom' = 'fade'
) {
  return function WithPageTransitionComponent(props: P) {
    return (
      <PageTransition animation={animation}>
        <Component {...props} />
      </PageTransition>
    );
  };
} 