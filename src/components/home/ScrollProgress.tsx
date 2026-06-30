/**
 * ScrollProgress — a thin trust-blue progress bar fixed to the top of the page.
 * Driven by framer-motion's useScroll → scaleX (spring-smoothed). Renders nothing
 * under prefers-reduced-motion (no animated indicator to distract).
 */
import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ScrollProgressProps {
  className?: string;
}

export function ScrollProgress({ className }: ScrollProgressProps) {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.4,
  });

  // No animated indicator for reduced-motion users.
  if (reduced) return null;

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className={cn(
        "fixed inset-x-0 top-0 z-[60] h-[3px] origin-left",
        // Trust-blue gradient — uses the dark-context primary token.
        "home-tokens-dark bg-gradient-to-r from-primary/60 via-primary to-primary/60",
        className,
      )}
    />
  );
}

export default ScrollProgress;
