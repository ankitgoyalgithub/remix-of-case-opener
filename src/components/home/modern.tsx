/**
 * Insure Auto — MODERN shared primitives (high-end landing patterns).
 *
 * These build on top of `primitives.tsx` and the `.home-*` token system. They
 * are the "premium" building blocks the marketing sections compose:
 *
 *   - <PipelineFlow>   scroll-drawn connected pipeline (THE pattern for showing
 *                      items "as a pipeline" — rail draws on scroll, nodes light
 *                      up in view, cards alternate left/right on desktop).
 *   - <SpotlightCard>  glass card with mouse-following spotlight + subtle 3D tilt
 *                      + gradient hairline border.
 *   - <Marquee>        seamless infinite auto-scroll row (reviews / logos strip).
 *   - <GradientBorder> thin gradient-ring wrapper.
 *   - <Rating>         5-star rating rendered in the primary accent.
 *
 * Every animation respects `prefers-reduced-motion` and degrades to a clean,
 * fully-visible static state. Nothing hardcodes colour — only `--primary`,
 * `--border`, `--card`, `--foreground`, `--muted-foreground` tokens are used.
 */
import "./home.css";
import {
  useMemo,
  useRef,
  type CSSProperties,
  type ElementType,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  type MotionStyle,
} from "framer-motion";
import { Star, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./primitives";

/* ═══════════════════════════════════════════════════════════════════════════
   GradientBorder — element wrapped in a thin animated gradient ring.
   Pure CSS (mask trick lives in home.css → .home-card-border). Static & safe.
   ═══════════════════════════════════════════════════════════════════════════ */
export interface GradientBorderProps {
  children: ReactNode;
  className?: string;
  /** Element/tag to render. Default "div". */
  as?: ElementType;
  style?: CSSProperties;
}

export function GradientBorder({
  children,
  className,
  as: Tag = "div",
  style,
}: GradientBorderProps) {
  return (
    <Tag
      className={cn("home-card-border relative rounded-2xl", className)}
      style={style}
    >
      {children}
    </Tag>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Rating — 5 (or `max`) stars in the primary accent. Decorative + labelled.
   ═══════════════════════════════════════════════════════════════════════════ */
export interface RatingProps {
  /** Filled stars (supports halves via rounding). Default 5. */
  value?: number;
  /** Total stars. Default 5. */
  max?: number;
  className?: string;
  /** Star size in px. Default 16. */
  size?: number;
}

export function Rating({ value = 5, max = 5, className, size = 16 }: RatingProps) {
  const filled = Math.round(value);
  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`Rated ${value} out of ${max}`}
    >
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={cn(
            i < filled
              ? "fill-primary text-primary"
              : "fill-transparent text-muted-foreground/35",
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SpotlightCard — glass card with:
     (a) mouse-following radial spotlight (CSS vars --mx/--my set on pointermove),
     (b) subtle springy 3D tilt toward the cursor (rotateX/rotateY),
     (c) a gradient hairline border.
   Reduced motion → a plain, static glass card (no tilt, no spotlight).
   The card itself has no padding — add it via `className` (e.g. "p-6").
   ═══════════════════════════════════════════════════════════════════════════ */
export interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  /** Element/tag to render. Default "div". */
  as?: ElementType;
  /** Add a soft primary lift-shadow on hover. Default true. */
  glow?: boolean;
  style?: CSSProperties;
}

export function SpotlightCard({
  children,
  className,
  as = "div",
  glow = true,
  style,
}: SpotlightCardProps) {
  const reduced = useReducedMotion();
  // Memoise so children don't remount on every render (matches Reveal).
  const MotionTag = useMemo(() => motion(as) as typeof motion.div, [as]);
  const ref = useRef<HTMLDivElement | null>(null);

  const rotateX = useSpring(0, { stiffness: 150, damping: 18, mass: 0.4 });
  const rotateY = useSpring(0, { stiffness: 150, damping: 18, mass: 0.4 });

  const baseClass = cn(
    "home-spotlight-card home-card-border relative overflow-hidden rounded-2xl",
    "border border-border/50 bg-card/60 backdrop-blur-xl",
    glow &&
      "transition-shadow duration-300 hover:shadow-[0_24px_60px_-26px_hsl(var(--primary)/0.45)]",
    className,
  );

  if (reduced) {
    return (
      <MotionTag ref={ref} className={baseClass} style={style}>
        {children}
      </MotionTag>
    );
  }

  const handleMove = (e: ReactPointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--mx", `${(px * 100).toFixed(2)}%`);
    el.style.setProperty("--my", `${(py * 100).toFixed(2)}%`);
    rotateY.set((px - 0.5) * 7);
    rotateX.set((0.5 - py) * 7);
  };

  const handleLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <MotionTag
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={baseClass}
      style={
        {
          rotateX,
          rotateY,
          transformPerspective: 900,
          ...style,
        } as MotionStyle
      }
    >
      {children}
      <span
        aria-hidden
        className="home-spotlight pointer-events-none absolute inset-0 z-[1] rounded-2xl"
      />
    </MotionTag>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Marquee — seamless infinite horizontal auto-scroll.
   Two identical tracks animate via CSS transform (home.css → .home-marquee).
   Reduced motion → a static, horizontally-scrollable row.
   ═══════════════════════════════════════════════════════════════════════════ */
export interface MarqueeProps {
  children: ReactNode;
  /** Seconds for one full loop (lower = faster). Default 40. */
  speed?: number;
  /** Scroll direction. Default "left". */
  direction?: "left" | "right";
  /** Pause the loop while hovered. Default true. */
  pauseOnHover?: boolean;
  /** CSS gap between items (and between the two tracks). Default "1.5rem". */
  gap?: string;
  className?: string;
}

export function Marquee({
  children,
  speed = 40,
  direction = "left",
  pauseOnHover = true,
  gap = "1.5rem",
  className,
}: MarqueeProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div
        className={cn(
          "flex w-full snap-x snap-mandatory overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          className,
        )}
        style={{ gap }}
        tabIndex={0}
        aria-label="Scrollable list"
      >
        {children}
      </div>
    );
  }

  const containerStyle = { "--marquee-gap": gap } as CSSProperties;
  const trackStyle = {
    "--marquee-duration": `${speed}s`,
    "--marquee-direction": direction === "right" ? "reverse" : "normal",
  } as CSSProperties;

  return (
    <div
      className={cn("home-marquee", pauseOnHover && "is-pausable", className)}
      style={containerStyle}
    >
      <div className="home-marquee-track" style={trackStyle}>
        {children}
      </div>
      <div className="home-marquee-track" style={trackStyle} aria-hidden>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PipelineFlow — the centerpiece "as a pipeline" pattern.
   ─────────────────────────────────────────────────────────────────────────── */
export interface PipelineItem {
  /** Optional lucide icon for the node + card. */
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  /** Tiny mono label (e.g. a stage name "READ"). */
  badge?: ReactNode;
  /** Extra node/footer content under the description. */
  meta?: ReactNode;
}

export interface PipelineFlowProps {
  items: PipelineItem[];
  /** Override the per-item card render. Receives (item, index). */
  renderCard?: (item: PipelineItem, index: number) => ReactNode;
  /** "vertical" (default) — central rail, alternating cards. "horizontal" — top rail. */
  orientation?: "vertical" | "horizontal";
  className?: string;
}

/* ── A node dot that lights up (glows) once it enters view ─────────────────── */
function PipelineNode({
  active,
  index,
  icon: Icon,
  reduced,
}: {
  active: boolean;
  index: number;
  icon?: LucideIcon;
  reduced: boolean;
}) {
  return (
    <span className="relative grid h-10 w-10 place-items-center">
      {/* Glow halo — fades in when active */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-full transition-opacity duration-700",
          active ? "opacity-100" : "opacity-0",
        )}
        style={{ boxShadow: "0 0 24px 2px hsl(var(--primary) / 0.55)" }}
      />
      <motion.span
        initial={false}
        animate={reduced ? undefined : { scale: active ? 1 : 0.84 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative grid h-10 w-10 place-items-center rounded-full border text-sm font-semibold tabular-nums transition-colors duration-500",
          active
            ? "border-primary/70 bg-primary/15 text-primary"
            : "border-border/70 bg-card text-muted-foreground",
        )}
      >
        {Icon ? <Icon className="h-[18px] w-[18px]" aria-hidden /> : index + 1}
      </motion.span>
    </span>
  );
}

/* ── Default card (used when no renderCard override is given) ──────────────── */
function DefaultPipelineCard({
  item,
  className,
}: {
  item: PipelineItem;
  className?: string;
}) {
  const Icon = item.icon;
  return (
    <SpotlightCard className={cn("p-5 sm:p-6", className)}>
      {(Icon || item.badge) && (
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
              <Icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
          )}
          {item.badge && (
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary/90">
              {item.badge}
            </span>
          )}
        </div>
      )}
      <h3 className="mt-3.5 font-brand text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl">
        {item.title}
      </h3>
      {item.description && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
          {item.description}
        </p>
      )}
      {item.meta && <div className="mt-3 text-sm text-muted-foreground">{item.meta}</div>}
    </SpotlightCard>
  );
}

/* ── Vertical (default) pipeline ──────────────────────────────────────────── */
function VerticalRow({
  item,
  index,
  reduced,
  renderCard,
}: {
  item: PipelineItem;
  index: number;
  reduced: boolean;
  renderCard?: (item: PipelineItem, index: number) => ReactNode;
}) {
  const ref = useRef<HTMLLIElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -40% 0px" });
  const active = reduced ? true : inView;
  const isLeft = index % 2 === 0;

  const card = renderCard ? (
    renderCard(item, index)
  ) : (
    <DefaultPipelineCard item={item} className="h-full" />
  );

  return (
    <li
      ref={ref}
      className={cn(
        "relative grid items-center gap-x-4",
        "grid-cols-[2.8rem_minmax(0,1fr)]",
        "md:grid-cols-[minmax(0,1fr)_2.8rem_minmax(0,1fr)] md:gap-x-8",
      )}
    >
      {/* Card slot — after node on mobile, alternating column on desktop */}
      <Reveal
        index={index}
        y={20}
        className={cn(
          "order-2 min-w-0 md:order-none md:row-start-1",
          isLeft ? "md:col-start-1" : "md:col-start-3",
        )}
      >
        {card}
      </Reveal>

      {/* Node — sits on the rail */}
      <div className="order-1 flex justify-center md:order-none md:col-start-2 md:row-start-1">
        <PipelineNode active={active} index={index} icon={item.icon} reduced={reduced} />
      </div>
    </li>
  );
}

function VerticalPipeline({ items, renderCard, className }: PipelineFlowProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLOListElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 78%", "end 62%"],
  });
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 26,
    mass: 0.6,
  });

  return (
    <ol
      ref={ref}
      className={cn(
        "relative mx-auto flex w-full max-w-4xl flex-col gap-10 md:gap-14",
        className,
      )}
    >
      {/* Static rail track */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-2 left-[1.4rem] w-px -translate-x-1/2 rounded-full bg-border/50 md:left-1/2"
      />
      {/* Animated rail — draws as the section scrolls */}
      <motion.div
        aria-hidden
        style={(reduced ? { scaleY: 1 } : { scaleY }) as MotionStyle}
        className="home-pipeline-rail pointer-events-none absolute inset-y-2 left-[1.4rem] w-[2px] origin-top -translate-x-1/2 rounded-full md:left-1/2"
      />
      {items.map((item, i) => (
        <VerticalRow
          key={i}
          item={item}
          index={i}
          reduced={!!reduced}
          renderCard={renderCard}
        />
      ))}
    </ol>
  );
}

/* ── Horizontal pipeline (stacks to vertical on mobile) ───────────────────── */
function HorizontalStep({
  item,
  index,
  reduced,
  renderCard,
}: {
  item: PipelineItem;
  index: number;
  reduced: boolean;
  renderCard?: (item: PipelineItem, index: number) => ReactNode;
}) {
  const ref = useRef<HTMLLIElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -30% 0px" });
  const active = reduced ? true : inView;

  const card = renderCard ? (
    renderCard(item, index)
  ) : (
    <DefaultPipelineCard item={item} className="h-full" />
  );

  return (
    <li ref={ref} className="relative flex flex-1 flex-col">
      <div className="mb-5 flex md:justify-center">
        <PipelineNode active={active} index={index} icon={item.icon} reduced={reduced} />
      </div>
      <Reveal index={index} y={20} className="min-w-0 flex-1">
        {card}
      </Reveal>
    </li>
  );
}

function HorizontalPipeline({ items, renderCard, className }: PipelineFlowProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 82%", "end 70%"],
  });
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 26,
    mass: 0.6,
  });
  // Inset the rail so it connects the first and last node centres.
  const inset = `${50 / Math.max(items.length, 1)}%`;

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Static rail track (desktop only) */}
      <div
        aria-hidden
        className="absolute top-5 hidden h-px md:block"
        style={{ left: inset, right: inset, backgroundColor: "hsl(var(--border) / 0.5)" }}
      />
      {/* Animated rail */}
      <motion.div
        aria-hidden
        style={
          (reduced
            ? { scaleX: 1, left: inset, right: inset }
            : { scaleX, left: inset, right: inset }) as MotionStyle
        }
        className="home-pipeline-rail absolute top-5 hidden h-[2px] origin-left md:block"
      />
      <ol className="relative flex flex-col gap-10 md:flex-row md:items-start md:gap-6">
        {items.map((item, i) => (
          <HorizontalStep
            key={i}
            item={item}
            index={i}
            reduced={!!reduced}
            renderCard={renderCard}
          />
        ))}
      </ol>
    </div>
  );
}

export function PipelineFlow({
  items,
  renderCard,
  orientation = "vertical",
  className,
}: PipelineFlowProps) {
  if (orientation === "horizontal") {
    return (
      <HorizontalPipeline items={items} renderCard={renderCard} className={className} />
    );
  }
  return <VerticalPipeline items={items} renderCard={renderCard} className={className} />;
}
