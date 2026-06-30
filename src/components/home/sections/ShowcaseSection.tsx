/**
 * ShowcaseSection — the page's second WebGL "art" moment + a flagship spotlight.
 *
 * A full-bleed generative shader backdrop (ShaderField — a flowing trust-blue
 * point-cloud, "data in motion") sits behind a spotlight on the platform's
 * flagship capability: the member-list (MOL / MOHRE) matching engine. Beside the
 * copy, a live, self-animating mock walks through the 4-stage match.
 *
 * • Backdrop is wrapped in <CanvasLazy> → mounts in view, pauses off-screen, and
 *   shows a static mesh-gradient under prefers-reduced-motion.
 * • The mock animates only when in view and freezes (shows the completed state)
 *   under reduced motion.
 * • tone="dark", token-only colours, single trust-blue accent.
 *
 * Exported: <ShowcaseSection /> (named + default). Props: { className?: string }.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Fingerprint,
  Layers,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { CanvasLazy, Reveal, SectionShell } from "@/components/home/primitives";
import { APP_URL } from "@/components/home/content";
import { ShaderField } from "@/components/home/three/ShaderField";
import { cn } from "@/lib/utils";

/* ── Content (authored to the brief — no invented metrics) ─────────────────── */

const SUPPORTING_POINTS = [
  {
    icon: Fingerprint,
    title: "Government-record matching",
    description:
      "Every employee is checked against UAE labour records (MOL / MOHRE) — passport, name and nationality — not just your census spreadsheet.",
  },
  {
    icon: Layers,
    title: "A four-stage match",
    description:
      "Each stage tightens confidence in turn, so near-misses and typos are caught instead of waved through.",
  },
  {
    icon: ShieldCheck,
    title: "Nothing slips through",
    description:
      "Unmatched members are flagged and gated — cover is never issued on data that couldn't be verified.",
  },
] as const;

const STAGES = [
  { n: "01", title: "Passport number", desc: "Exact match against the MOL / MOHRE record.", done: "Matched" },
  { n: "02", title: "Full name", desc: "Normalised, fuzzy-tolerant comparison.", done: "Matched" },
  { n: "03", title: "Nationality", desc: "Confirmed against the labour record.", done: "Matched" },
  { n: "04", title: "Member verified", desc: "Cleared and ready for cover.", done: "Verified" },
] as const;

const MATCH_KEYS = ["Passport", "Name", "Nationality"] as const;

/* ── The animated flagship mock ────────────────────────────────────────────── */

function MatchPipeline() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduced = useReducedMotion();
  const total = STAGES.length;
  const [active, setActive] = useState(0); // count of completed stages

  useEffect(() => {
    if (reduced) {
      setActive(total);
      return;
    }
    if (!inView) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setActive(i);
      if (i >= total) window.clearInterval(id);
    }, 760);
    return () => window.clearInterval(id);
  }, [inView, reduced, total]);

  const complete = active >= total;
  // Fill the rail up to the current node (cap at the last node centre).
  const fillFrac = Math.min(active, total - 1) / (total - 1);
  const statusLabel = complete
    ? "All stages cleared"
    : active === 0
      ? "Scanning census…"
      : `Matched ${active}/${total}`;

  return (
    <div ref={ref} className="relative">
      {/* Depth — soft primary orbs behind the panel */}
      <div
        aria-hidden
        className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-primary/20 blur-3xl home-pulse-glow"
      />
      <div
        aria-hidden
        className="absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="home-glass home-glow-sm home-float relative z-10 overflow-hidden rounded-2xl border border-border/70 p-5 sm:p-6">
        {/* Scanning sweep along the top edge — only while verifying */}
        {!reduced && !complete && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 h-px w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: "300%" }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-inset ring-primary/25"
            >
              <UserCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Member-list match</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                MOL / MOHRE · 4-stage
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] transition-colors duration-300",
              complete
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/70 bg-card/50 text-muted-foreground",
            )}
          >
            {complete ? (
              <Check className="h-3 w-3" aria-hidden />
            ) : (
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary home-pulse-glow" />
            )}
            {statusLabel}
          </span>
        </div>

        {/* Stage rail */}
        <ol className="relative mt-4">
          {/* track + animated fill (left rail) */}
          <span
            aria-hidden
            className="absolute left-[1.125rem] top-9 bottom-9 w-px -translate-x-1/2 bg-border/70"
          />
          <motion.span
            aria-hidden
            className="absolute left-[1.125rem] top-9 bottom-9 w-px -translate-x-1/2 origin-top bg-gradient-to-b from-primary to-primary/50"
            initial={false}
            animate={{ scaleY: fillFrac }}
            transition={reduced ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />

          {STAGES.map((stage, i) => {
            const isDone = i < active;
            const isCurrent = i === active && !complete;
            const rightLabel = isDone ? stage.done : isCurrent ? "Checking…" : "Queued";
            return (
              <li
                key={stage.n}
                className="relative grid min-h-[4.5rem] grid-cols-[2.25rem_1fr] items-center gap-x-4"
              >
                {/* node */}
                <span className="flex justify-center">
                  <span
                    className={cn(
                      "relative z-10 grid h-9 w-9 place-items-center rounded-full border text-xs font-semibold transition-colors duration-300",
                      isDone &&
                        "border-transparent bg-primary text-primary-foreground shadow-[0_0_18px_-4px_hsl(var(--primary)_/_0.85)]",
                      isCurrent && "border-primary bg-primary/10 text-primary home-pulse-glow",
                      !isDone && !isCurrent && "border-border bg-card/50 text-muted-foreground",
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" aria-hidden /> : stage.n}
                  </span>
                </span>

                {/* content */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={cn(
                        "text-sm font-semibold transition-colors duration-300",
                        isDone || isCurrent ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {stage.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {stage.desc}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 font-mono text-[10px] uppercase tracking-wide transition-colors duration-300",
                      isDone ? "text-primary" : "text-muted-foreground/70",
                    )}
                  >
                    {rightLabel}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Match-key chips */}
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          {MATCH_KEYS.map((key) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/50 px-2.5 py-1 font-mono text-[11px] text-muted-foreground"
            >
              <span aria-hidden className="h-1 w-1 rounded-full bg-primary" />
              {key}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Section ───────────────────────────────────────────────────────────────── */

export interface ShowcaseSectionProps {
  className?: string;
}

export function ShowcaseSection({ className }: ShowcaseSectionProps) {
  return (
    <SectionShell id="showcase" tone="dark" grain className={cn("home-divider", className)}>
      {/* Full-bleed generative shader backdrop (breaks out of the container width). */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[160%] w-screen max-w-none -translate-x-1/2 -translate-y-1/2"
      >
        <CanvasLazy
          className="h-full w-full"
          camera={{ position: [0, 0, 9], fov: 45 }}
          fallback={<div className="home-mesh home-aurora absolute inset-0" />}
        >
          <ShaderField />
        </CanvasLazy>
        {/* Legibility scrims (token-based): darker toward the copy on the left. */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/55 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-background/85" />
      </div>

      <div className="relative z-10 grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
        {/* Spotlight copy */}
        <div className="lg:col-span-6 xl:col-span-5">
          <Reveal>
            <span className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
              <span aria-hidden className="h-1 w-1 rounded-full bg-primary" />
              Spotlight · Member-list engine
            </span>
          </Reveal>

          <Reveal delay={0.05}>
            <h2 className="mt-4 font-brand text-[clamp(2rem,4.6vw,3.4rem)] font-semibold leading-[1.05] tracking-tight text-foreground">
              Match every member to the{" "}
              <span className="home-gradient-text">source of truth</span>.
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              The member-list engine reconciles your census against UAE government
              labour records through a four-stage match — so no employee is enrolled
              on coverage without being verified first.
            </p>
          </Reveal>

          <ul className="mt-8 space-y-5">
            {SUPPORTING_POINTS.map((point, i) => {
              const Icon = point.icon;
              return (
                <Reveal as="li" key={point.title} index={i} delay={0.15} className="flex gap-3.5">
                  <span
                    aria-hidden
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20"
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{point.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                      {point.description}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </ul>

          <Reveal delay={0.3} className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to={APP_URL}
              className="focus-ring group inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_6px_20px_-8px_hsl(var(--primary)_/_0.8)] transition-all duration-150 hover:brightness-110 active:translate-y-px"
            >
              Open the workbench
              <ArrowRight
                className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <a
              href="#features"
              className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-card/40 px-4 py-2.5 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-card/70"
            >
              See all capabilities
            </a>
          </Reveal>
        </div>

        {/* Flagship mock */}
        <div className="lg:col-span-6 xl:col-start-7 xl:col-span-6">
          <Reveal y={32} delay={0.1}>
            <MatchPipeline />
          </Reveal>
        </div>
      </div>
    </SectionShell>
  );
}

export default ShowcaseSection;
