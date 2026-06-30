/**
 * Section C — How it works / Process pipeline.
 *
 * Visualises the 7-step underwriting PROCESS from content.ts
 * (intake → read → check → reconcile → review → decide → issue) as a premium,
 * scroll-driven flow that is deliberately DISTINCT from the Features pipeline
 * (Section A is a light, vertical, alternating capability pipeline). This one is:
 *
 *   • Dark tone (keeps the page's section rhythm: glowing trust-blue on navy).
 *   • Desktop (lg+)  → a connected HORIZONTAL stepper. A primary-gradient
 *     connector "draws" left→right via a scroll-linked scaleX, a glowing comet
 *     head rides the fill, icon NODES light up as the progression reaches them,
 *     and each stage sits in a glass <SpotlightCard> (cursor spotlight + 3D tilt
 *     + gradient hairline) carrying a ghosted index numeral + stage badge.
 *   • Mobile / tablet → a VERTICAL timeline: a left spine fills as each stage
 *     activates, nodes glow in sequence, cards sit alongside.
 *
 * Fully reduced-motion safe: with `prefers-reduced-motion` the connector is shown
 * fully drawn, every node/stage reads as active, the comet is hidden, and no
 * loops run (SpotlightCards degrade to plain static glass). Colour comes only
 * from tone-scoped tokens (--primary / --border / --card / --foreground /
 * --muted-foreground) — no hardcoded hex.
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
import { SpotlightCard } from "@/components/home/modern";
import { PIPELINE, COPY, SECTION_IDS } from "@/components/home/content";
import { cn } from "@/lib/utils";

const TOTAL = PIPELINE.length;
/** Half-a-column inset so the rail aligns with the first/last node centres in a
 *  grid-cols-N layout: each node centre sits at (i + 0.5) / N. */
const EDGE_INSET = `${100 / (TOTAL * 2)}%`;

/* ── A single process card (shared by both layouts) ───────────────────────────
   A glass SpotlightCard (tilt + cursor spotlight + gradient hairline) carrying a
   ghosted index numeral, a stage badge, the step title and its description. The
   icon lives on the rail node, not the card — keeping the card distinct from the
   Features cards and visually lighter. */
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
    <SpotlightCard
      as="article"
      className={cn(
        "flex h-full flex-col p-4 sm:p-5",
        active && "border-primary/40 home-glow-sm",
        className,
      )}
    >
      {/* Ghosted index numeral — the refined "numbering", brightens when active. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-2 right-1 select-none font-brand text-5xl font-semibold leading-none tracking-tight transition-colors duration-500 sm:right-2",
          active ? "text-primary/15" : "text-foreground/[0.07]",
        )}
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Stage badge */}
      <div className="relative flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "h-1.5 w-1.5 rounded-full transition-colors duration-500",
            active ? "bg-primary" : "bg-muted-foreground/40",
          )}
        />
        <span
          className={cn(
            "font-mono text-[11px] font-medium uppercase tracking-[0.18em] transition-colors duration-500",
            active ? "text-primary" : "text-muted-foreground",
          )}
        >
          {step.stage}
        </span>
      </div>

      <h3 className="relative mt-3 text-[0.95rem] font-semibold leading-snug tracking-tight text-foreground">
        {step.title}
      </h3>
      <p className="relative mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-[0.8rem]">
        {step.description}
      </p>
    </SpotlightCard>
  );
}

/* ── A node (icon disc) — used on the desktop rail + the mobile spine ──────────
   Lights up + halos once the scroll progression reaches it. */
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
  const iconCls = size === "md" ? "h-5 w-5" : "h-[18px] w-[18px]";
  return (
    <span className="relative inline-flex">
      {/* Soft halo on the active node (auto-frozen under reduced motion). */}
      {active && (
        <span
          aria-hidden
          className="home-pulse-glow absolute inset-0 -m-1.5 rounded-full bg-primary/25 blur-md"
        />
      )}
      <span
        className={cn(
          "relative inline-flex items-center justify-center rounded-full border backdrop-blur transition-all duration-500",
          dim,
          active
            ? "border-primary/70 bg-primary/15 text-primary shadow-[0_0_22px_-4px_hsl(var(--primary)_/_0.9)]"
            : "border-border/70 bg-card/60 text-muted-foreground",
        )}
      >
        <Icon className={iconCls} aria-hidden />
      </span>
    </span>
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

  // Which steps have been "reached". Drives node lighting + card activation +
  // the mobile per-segment fill.
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
          {/* Rail: faint base + scroll-drawn gradient fill + comet head + nodes */}
          <div aria-hidden className="relative mb-8 h-14">
            <div
              className="absolute top-1/2 h-[2px] -translate-y-1/2"
              style={{ left: EDGE_INSET, right: EDGE_INSET }}
            >
              {/* faint full-length rail */}
              <div className="absolute inset-0 rounded-full bg-border/60" />
              {/* drawn fill (scaleX on scroll) */}
              <motion.div
                className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-gradient-to-r from-primary/40 via-primary to-primary shadow-[0_0_12px_0_hsl(var(--primary)_/_0.55)]"
                style={{ scaleX: reduced ? 1 : progress }}
              />
              {/* glowing comet head riding the fill tip */}
              {!reduced && (
                <motion.span
                  className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: playheadLeft }}
                >
                  <span className="home-pulse-glow block h-3.5 w-3.5 rounded-full bg-primary shadow-[0_0_18px_4px_hsl(var(--primary)_/_0.85)]" />
                </motion.span>
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
                className="grid grid-cols-[3.5rem_1fr] items-start gap-x-4 pb-6 last:pb-0"
              >
                {/* spine column: connector behind, node on top */}
                <div className="relative flex justify-center">
                  {/* base connector */}
                  <span
                    aria-hidden
                    className="absolute left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-border/60"
                    style={{
                      top: isFirst ? "1.75rem" : 0,
                      bottom: isLast ? "calc(100% - 1.75rem)" : 0,
                    }}
                  />
                  {/* drawn fill (scaleY as the stage activates) */}
                  <span
                    aria-hidden
                    className={cn(
                      "home-pipeline-rail absolute left-1/2 w-[2px] -translate-x-1/2 origin-top rounded-full transition-transform duration-700 ease-out",
                      segmentFilled ? "scale-y-100" : "scale-y-0",
                    )}
                    style={{
                      top: isFirst ? "1.75rem" : 0,
                      bottom: isLast ? "calc(100% - 1.75rem)" : 0,
                    }}
                  />
                  <span className="relative z-10">
                    <StepNode step={step} active={nodeActive} size="sm" />
                  </span>
                </div>

                {/* card */}
                <StepCard step={step} index={i} active={nodeActive} />
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
