/**
 * Insure Auto — shared landing-page primitives.
 *
 * These are the building blocks every marketing section depends on:
 *   - <Reveal>          scroll-reveal wrapper (fade + slide up, stagger-aware)
 *   - <SectionShell>    toned <section> with container + optional header block
 *   - <CanvasLazy>      r3f <Canvas> that mounts in-view, with static fallbacks
 *   - <AnimatedCounter> count-up number, reduced-motion safe
 *
 * All of them respect `prefers-reduced-motion`. None of them hardcode colours —
 * they rely on the tokens redefined by `.home-dark` / `.home-light` (home.css).
 */
import "./home.css";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  animate,
  type Variants,
} from "framer-motion";
import { Canvas, type CanvasProps } from "@react-three/fiber";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   useNearViewport — IntersectionObserver hook.
   `entered` latches true the first time the element nears the viewport (used to
   MOUNT heavy content once). `visible` tracks live visibility (used to pause
   render loops while off-screen). `rootMargin` pre-loads before fully in view.
   ─────────────────────────────────────────────────────────────────────────── */
function useNearViewport(rootMargin = "200px") {
  const ref = useRef<HTMLDivElement | null>(null);
  const [entered, setEntered] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // SSR / very old browsers: just mount.
      setEntered(true);
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setEntered(true);
      },
      { rootMargin, threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return { ref, entered, visible } as const;
}

/* ───────────────────────────────────────────────────────────────────────────
   Reveal — fade + slide-up on scroll into view (once).
   Pass `index` for list stagger, or an explicit `delay`. Renders a plain element
   (no transform/opacity) under reduced motion so content is always visible.
   ─────────────────────────────────────────────────────────────────────────── */
export interface RevealProps {
  children: ReactNode;
  /** Extra classes on the wrapper. */
  className?: string;
  /** Base delay in seconds. */
  delay?: number;
  /** Stagger index — adds `index * stagger` to the delay. */
  index?: number;
  /** Per-index stagger step in seconds (default 0.08). */
  stagger?: number;
  /** Vertical travel distance in px (default 24). */
  y?: number;
  /** Render as a different element (default "div"). */
  as?: ElementType;
  style?: CSSProperties;
}

export function Reveal({
  children,
  className,
  delay = 0,
  index = 0,
  stagger = 0.08,
  y = 24,
  as = "div",
  style,
}: RevealProps) {
  const reduced = useReducedMotion();
  // Memoise so we don't create a fresh motion component (and remount children)
  // on every render. Only rebuilds when `as` changes. Typed as motion.div so the
  // motion props (initial / whileInView / transition …) type-check for any tag.
  const MotionTag = useMemo(() => motion(as) as typeof motion.div, [as]);
  const totalDelay = delay + index * stagger;

  if (reduced) {
    // No animation props → renders as a plain static element (honours `as`).
    return (
      <MotionTag className={className} style={style}>
        {children}
      </MotionTag>
    );
  }

  return (
    <MotionTag
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{
        duration: 0.6,
        delay: totalDelay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Stagger helpers for callers that want a framer-motion parent/child setup
 * instead of per-item `index`. Use `staggerContainer` on a motion parent and
 * `staggerItem` on each motion child.
 */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

/* ───────────────────────────────────────────────────────────────────────────
   SectionShell — toned <section> with container + optional header.
   Use the `tone` prop to switch the whole section's token palette; everything
   inside then uses normal Tailwind tokens (text-foreground, bg-card, …).
   ─────────────────────────────────────────────────────────────────────────── */
export interface SectionShellProps {
  /** Anchor id (e.g. "features") — also gets scroll-margin for the sticky nav. */
  id?: string;
  /** Token palette + surface. Default "dark". */
  tone?: "dark" | "light";
  /** Tiny mono uppercase label above the title. */
  eyebrow?: ReactNode;
  /** Fraunces display title (string or node). */
  title?: ReactNode;
  /** Muted supporting line under the title. */
  subtitle?: ReactNode;
  /** Header alignment. Default "center". */
  align?: "left" | "center";
  /** Decorative layers (absolute, non-interactive) painted behind content. */
  mesh?: boolean;
  grid?: boolean;
  grain?: boolean;
  /** Extra classes on the <section>. */
  className?: string;
  /** Extra classes on the inner max-width container. */
  containerClassName?: string;
  /** Extra classes on the header block. */
  headerClassName?: string;
  children?: ReactNode;
}

export function SectionShell({
  id,
  tone = "dark",
  eyebrow,
  title,
  subtitle,
  align = "center",
  mesh = false,
  grid = false,
  grain = false,
  className,
  containerClassName,
  headerClassName,
  children,
}: SectionShellProps) {
  const hasHeader = Boolean(eyebrow || title || subtitle);
  const centered = align === "center";

  return (
    <section
      id={id}
      className={cn(
        tone === "dark" ? "home-dark" : "home-light",
        grain && "home-grain",
        "relative isolate overflow-hidden",
        // Generous, fluid vertical rhythm: ~80px → ~140px.
        "py-[clamp(5rem,10vw,8.75rem)]",
        // Land below the sticky nav when deep-linked.
        "scroll-mt-20 lg:scroll-mt-24",
        className,
      )}
    >
      {/* Decorative atmosphere layers */}
      {mesh && (
        <div aria-hidden className="home-mesh pointer-events-none absolute inset-0 -z-10" />
      )}
      {grid && (
        <div
          aria-hidden
          className="home-grid home-grid-fade pointer-events-none absolute inset-0 -z-10 opacity-60"
        />
      )}

      <div
        className={cn(
          "relative z-10 mx-auto w-full max-w-6xl px-6 sm:px-8",
          containerClassName,
        )}
      >
        {hasHeader && (
          <Reveal
            className={cn(
              "mb-12 flex flex-col gap-4 sm:mb-16",
              centered ? "items-center text-center" : "items-start text-left",
              centered && "mx-auto max-w-3xl",
              headerClassName,
            )}
          >
            {eyebrow && (
              <span className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
                <span aria-hidden className="h-1 w-1 rounded-full bg-primary" />
                {eyebrow}
              </span>
            )}
            {title && (
              <h2 className="font-brand text-[clamp(1.9rem,4.2vw,3.25rem)] font-semibold leading-[1.05] tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className={cn(
                  "text-base leading-relaxed text-muted-foreground sm:text-lg",
                  centered && "max-w-2xl",
                )}
              >
                {subtitle}
              </p>
            )}
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   CanvasLazy — performance-first wrapper around a react-three-fiber <Canvas>.
   • Reduced motion → renders the static `fallback` (or a default mesh placeholder)
     and never mounts WebGL.
   • Mounts the Canvas only once it nears the viewport (IntersectionObserver).
   • Pauses the render loop (frameloop="never") while scrolled off-screen.
   • Suspense inside the Canvas keeps async assets from blocking the page.
   Pass the scene as `children`. The wrapper is decorative by default (aria-hidden);
   pass `label` to expose it as an image to assistive tech.
   ─────────────────────────────────────────────────────────────────────────── */
export interface CanvasLazyProps
  extends Omit<CanvasProps, "children" | "frameloop"> {
  children: ReactNode;
  /** Classes on the wrapping <div> (size it here — Canvas fills it). */
  className?: string;
  /** Static node shown for reduced-motion + before mount + during asset load. */
  fallback?: ReactNode;
  /** IntersectionObserver pre-load margin. Default "200px". */
  rootMargin?: string;
  /** Accessible label — when set the canvas is exposed as role="img". */
  label?: string;
  /** Force-pause the loop even when visible. */
  paused?: boolean;
}

function DefaultCanvasFallback() {
  return (
    <div
      aria-hidden
      className="home-mesh home-aurora absolute inset-0 h-full w-full"
      style={{ backgroundColor: "hsl(var(--background))" }}
    />
  );
}

export function CanvasLazy({
  children,
  className,
  fallback,
  rootMargin = "200px",
  label,
  paused = false,
  dpr = [1, 2],
  gl,
  camera,
  ...rest
}: CanvasLazyProps) {
  const reduced = useReducedMotion();
  const { ref, entered, visible } = useNearViewport(rootMargin);
  const placeholder = fallback ?? <DefaultCanvasFallback />;
  const mountCanvas = !reduced && entered;

  return (
    <div
      ref={ref}
      className={cn("relative isolate overflow-hidden", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* Static layer: visible for reduced motion, before mount, and shows
          through during Suspense while the scene streams in. */}
      <div className="absolute inset-0">{placeholder}</div>

      {mountCanvas && (
        <Canvas
          className="!absolute inset-0"
          dpr={dpr}
          camera={camera}
          frameloop={visible && !paused ? "always" : "never"}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance", ...gl }}
          {...rest}
        >
          <Suspense fallback={null}>{children}</Suspense>
        </Canvas>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   AnimatedCounter — counts up to `value` when scrolled into view.
   Reduced motion shows the final value immediately. Uses tabular-nums so the
   width doesn't jitter while counting.
   ─────────────────────────────────────────────────────────────────────────── */
export interface AnimatedCounterProps {
  /** Target number to count up to. */
  value: number;
  /** Animation length in seconds (default 1.6). */
  duration?: number;
  /** Decimal places (default 0). */
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1.6,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduced]);

  const formatted = display.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
