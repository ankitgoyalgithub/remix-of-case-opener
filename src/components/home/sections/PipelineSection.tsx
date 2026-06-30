/**
 * Section C — How it works / Pipeline.
 *
 * Visualises the 7-step underwriting pipeline from content.ts
 * (intake → read → check → reconcile → review → decide → issue) as an advanced,
 * scroll-driven animated flow:
 *
 *   • Desktop  → a connected HORIZONTAL stepper. A trust-blue connector line
 *     "draws" left→right via a scroll-linked scaleX, a glowing playhead rides
 *     the fill, and each node lights up as the progression reaches it.
 *   • Mobile   → a VERTICAL timeline. Each segment's connector fills (scaleY) as
 *     the matching stage activates, nodes glow in sequence, cards sit alongside.
 *
 * Everything is reduced-motion safe: with `prefers-reduced-motion`, the connector
 * is shown fully drawn, every node/stage reads as active, and no loops run.
 * Tone is "dark" to keep the alternating section rhythm (glowing blue on navy).
 */
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
  useMotionValueEvent,
} from "framer-motion";
import { Reveal, SectionShell } from "@/components/home/primitives";
import { PIPELINE, COPY, SECTION_IDS } from "@/components/home/content";
import { cn } from "@/lib/utils";

const TOTAL = PIPELINE.length;
/** Column centre position (%) for a grid-cols-N layout: (i + 0.5) / N. */
const EDGE_INSET = `${100 / (TOTAL * 2)}%`; // aligns the rail with first/last node centres

/* ── A single process card (shared by both layouts) ───────────────────────── */
function StepCard({
  step,
  index,
  active,
  className,
}: {
  step: (typeof PIPELINE)[number];
  index: number;
  active: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "home-glass group relative flex h-full flex-col gap-2.5 rounded-2xl border p-4 transition-all duration-200 sm:p-5",
        "hover:-translate-y-1 hover:border-primary/50",
        active
          ? "border-primary/45 home-glow-sm ring-1 ring-primary/30"
          : "border-border/70",
        className,
      )}
    >
      {/* stage label + step counter */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "font-mono text-[11px] font-medium uppercase tracking-[0.18em] transition-colors duration-200",
            active ? "text-primary" : "text-muted-foreground",
          )}
        >
          {step.stage}
        </span>
        <span className="font-mono text-[10px] tabular-nums tracking-wider text-muted-foreground/80">
          {String(index + 1).padStart(2, "0")}
          <span className="opacity-50">/{String(TOTAL).padStart(2, "0")}</span>
        </span>
      </div>

      <h3 className="text-sm font-semibold leading-snug text-foreground sm:text-[0.95rem]">
        {step.title}
      </h3>
      <p className="text-xs leading-relaxed text-muted-foreground sm:text-[0.8rem]">
        {step.description}
      </p>
    </article>
  );
}

/* ── A node (icon disc) — used on the desktop rail + mobile spine ──────────── */
function StepNode({
  step,
  active,
  size = "md",
}: {
  step: (typeof PIPELINE)[number];
  active: boolean;
  size?: "md" | "sm";
}) {
  const Icon = step.icon;
  const dim = size === "md" ? "h-14 w-14" : "h-11 w-11";
  const icon = size === "md" ? "h-5 w-5" : "h-[18px] w-[18px]";
  return (
    <div className="relative">
      {/* soft halo on the active node (auto-frozen under reduced motion) */}
      {active && (
        <span
          aria-hidden
          className="home-pulse-glow absolute inset-0 -m-1.5 rounded-full bg-primary/25 blur-md"
        />
      )}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full border backdrop-blur transition-all duration-300",
          dim,
          active
            ? "border-primary/70 bg-primary/15 text-primary shadow-[0_0_22px_-4px_hsl(var(--primary)_/_0.9)]"
            : "border-border/70 bg-card/60 text-muted-foreground",
        )}
      >
        <Icon className={icon} aria-hidden />
      </div>
    </div>
  );
}

export interface PipelineSectionProps {
  className?: string;
}

export function PipelineSection({ className }: PipelineSectionProps) {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Scroll progress across the timeline → drives the connector draw + node glow.
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 0.82", "end 0.55"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.4,
  });
  const playheadLeft = useTransform(progress, [0, 1], ["0%", "100%"]);

  // Which steps have been "reached". Drives node lighting + vertical segment fill.
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    if (reduced) setActiveIndex(TOTAL - 1);
  }, [reduced]);
  useMotionValueEvent(progress, "change", (v) => {
    if (reduced) return;
    setActiveIndex(Math.min(TOTAL - 1, Math.floor(v * TOTAL)));
  });

  return (
    <SectionShell
      id={SECTION_IDS.howItWorks}
      tone="dark"
      mesh
      grid
      grain
      className={className}
      eyebrow={COPY.eyebrows.howItWorks}
      title={COPY.sections.howItWorks.title}
      subtitle={COPY.sections.howItWorks.subtitle}
    >
      <div ref={trackRef}>
        {/* ── DESKTOP: horizontal connected stepper ─────────────────────── */}
        <Reveal className="hidden lg:block">
          {/* Rail: base line + scroll-drawn fill + playhead + nodes */}
          <div aria-hidden className="relative mb-7 h-14">
            <div
              className="absolute top-1/2 h-[2px] -translate-y-1/2"
              style={{ left: EDGE_INSET, right: EDGE_INSET }}
            >
              {/* faint full-length rail */}
              <div className="absolute inset-0 rounded-full bg-border/60" />
              {/* drawn fill (scaleX on scroll) */}
              <motion.div
                className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-gradient-to-r from-primary/50 via-primary to-primary shadow-[0_0_12px_0_hsl(var(--primary)_/_0.55)]"
                style={{ scaleX: reduced ? 1 : progress }}
              />
              {/* glowing playhead riding the fill head */}
              {!reduced && (
                <motion.span
                  className="home-pulse-glow absolute top-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_18px_3px_hsl(var(--primary)_/_0.85)]"
                  style={{ left: playheadLeft }}
                />
              )}
            </div>

            {/* nodes aligned to the cards' columns */}
            <div className="relative z-10 grid grid-cols-7">
              {PIPELINE.map((step, i) => (
                <div key={step.key} className="flex h-14 items-center justify-center">
                  <StepNode step={step} active={i <= activeIndex} />
                </div>
              ))}
            </div>
          </div>

          {/* cards */}
          <ol className="grid grid-cols-7 gap-3 xl:gap-4">
            {PIPELINE.map((step, i) => (
              <Reveal as="li" key={step.key} index={i} className="h-full">
                <StepCard step={step} index={i} active={i <= activeIndex} />
              </Reveal>
            ))}
          </ol>
        </Reveal>

        {/* ── MOBILE / TABLET: vertical timeline ────────────────────────── */}
        <ol className="relative lg:hidden">
          {PIPELINE.map((step, i) => {
            const isFirst = i === 0;
            const isLast = i === TOTAL - 1;
            const nodeActive = i <= activeIndex;
            const segmentFilled = reduced || i < activeIndex;
            return (
              <Reveal
                as="li"
                key={step.key}
                index={i}
                className="grid grid-cols-[3.5rem_1fr] gap-x-4 pb-6 last:pb-0"
              >
                {/* spine column: connector line behind, node on top */}
                <div className="relative flex justify-center">
                  {/* base connector */}
                  <span
                    aria-hidden
                    className="absolute left-1/2 w-[2px] -translate-x-1/2 bg-border/60"
                    style={{
                      top: isFirst ? "1.75rem" : 0,
                      bottom: isLast ? "calc(100% - 1.75rem)" : 0,
                    }}
                  />
                  {/* drawn fill (scaleY as the stage activates) */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-1/2 w-[2px] -translate-x-1/2 origin-top rounded-full bg-gradient-to-b from-primary via-primary to-primary/60 transition-transform duration-500 ease-out",
                      segmentFilled ? "scale-y-100" : "scale-y-0",
                    )}
                    style={{
                      top: isFirst ? "1.75rem" : 0,
                      bottom: isLast ? "calc(100% - 1.75rem)" : 0,
                    }}
                  />
                  <div className="relative z-10">
                    <StepNode step={step} active={nodeActive} size="sm" />
                  </div>
                </div>

                {/* card */}
                <StepCard step={step} index={i} active={nodeActive} className="mb-0" />
              </Reveal>
            );
          })}
        </ol>
      </div>

      {/* closing trust caption */}
      <Reveal className="mt-10 flex justify-center sm:mt-12">
        <p className="home-glass inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-border/70 px-4 py-2 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span aria-hidden className="h-1 w-1 rounded-full bg-primary" />
          Humans approve every decision
          <span aria-hidden className="text-border">·</span>
          Every action is logged
        </p>
      </Reveal>
    </SectionShell>
  );
}

export default PipelineSection;
