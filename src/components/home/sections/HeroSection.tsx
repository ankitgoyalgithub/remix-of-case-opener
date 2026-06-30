/**
 * HeroSection — the landing-page showpiece (section id="top").
 *
 * Full-viewport, deep-space (tone "dark") stage: a big Fraunces headline +
 * plain-language subhead, two CTAs, a kinetic value-prop ticker, a trust line
 * with regulator chips, and a scroll cue — layered over the animated WebGL
 * verification core (HeroScene), with mesh / grid / grain / glow atmosphere and
 * floating glass proof-chips for depth.
 *
 * Motion is tasteful and fully reduced-motion-safe:
 *   - Entrance copy uses <Reveal> (fade + slide, frozen under reduced motion).
 *   - The 3D core is wrapped in <CanvasLazy> → mounts in-view, pauses off-screen,
 *     and is swapped for the static <HeroFallback> under prefers-reduced-motion.
 */
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  FileCheck2,
  ScanText,
  ShieldCheck,
} from "lucide-react";
import { Reveal, CanvasLazy } from "@/components/home/primitives";
import { COPY, REGULATORS, SECTION_IDS, APP_URL } from "@/components/home/content";
import { HeroScene } from "@/components/home/three/HeroScene";

/* Smooth-scroll to an in-page anchor, honouring reduced motion + the nav offset. */
function useAnchorScroll() {
  const reduced = useReducedMotion();
  return useCallback(
    (e: MouseEvent<HTMLAnchorElement>, href: string) => {
      if (!href.startsWith("#")) return;
      const el = document.getElementById(href.slice(1));
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    },
    [reduced],
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   RotatingLine — cycles the value-prop variants under the headline.
   Reduced motion → the first variant, static.
   ─────────────────────────────────────────────────────────────────────────── */
function RotatingLine() {
  const reduced = useReducedMotion();
  const variants = COPY.hero.headlineVariants;
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(
      () => setI((v) => (v + 1) % variants.length),
      3400,
    );
    return () => window.clearInterval(id);
  }, [reduced, variants.length]);

  return (
    <p className="flex min-h-[1.75rem] items-center gap-2.5 font-mono text-[13px] uppercase tracking-[0.14em] text-muted-foreground">
      <span aria-hidden className="h-1.5 w-1.5 flex-none rounded-full bg-primary home-pulse-glow" />
      {reduced ? (
        <span>{variants[0]}</span>
      ) : (
        <AnimatePresence mode="wait">
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            {variants[i]}
          </motion.span>
        </AnimatePresence>
      )}
    </p>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   HeroFallback — premium static stand-in for the WebGL core (reduced motion /
   pre-mount / asset load). Mesh glow + a faceted shield glyph in the accent.
   ─────────────────────────────────────────────────────────────────────────── */
function HeroFallback() {
  return (
    <div aria-hidden className="absolute inset-0">
      <div className="home-mesh home-aurora absolute inset-0" />
      <div className="absolute left-1/2 top-1/2 h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[80px]" />
      <svg
        viewBox="0 0 200 200"
        className="absolute left-1/2 top-1/2 h-[56%] w-[56%] -translate-x-1/2 -translate-y-1/2 text-primary"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
      >
        <ellipse cx="100" cy="100" rx="92" ry="34" strokeOpacity="0.22" strokeWidth="1" transform="rotate(28 100 100)" />
        <ellipse cx="100" cy="100" rx="92" ry="30" strokeOpacity="0.16" strokeWidth="1" transform="rotate(-22 100 100)" />
        <polygon points="100,18 171,59 171,141 100,182 29,141 29,59" strokeOpacity="0.55" strokeWidth="1.5" />
        <polygon points="100,42 150,71 150,129 100,158 50,129 50,71" strokeOpacity="0.32" strokeWidth="1" />
        <line x1="100" y1="18" x2="100" y2="182" strokeOpacity="0.18" />
        <line x1="29" y1="59" x2="171" y2="141" strokeOpacity="0.18" />
        <line x1="171" y1="59" x2="29" y2="141" strokeOpacity="0.18" />
        <circle cx="100" cy="100" r="6" fill="currentColor" stroke="none" />
        <circle cx="171" cy="59" r="3" fill="currentColor" stroke="none" fillOpacity="0.7" />
        <circle cx="29" cy="141" r="3" fill="currentColor" stroke="none" fillOpacity="0.7" />
        <circle cx="100" cy="18" r="2.5" fill="currentColor" stroke="none" fillOpacity="0.6" />
      </svg>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   FloatingChips — decorative glass proof-chips that overlap the 3D core (lg+).
   aria-hidden: the same proof lives, accessibly, in the Features/Stats sections.
   ─────────────────────────────────────────────────────────────────────────── */
function FloatingChips() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
      <Reveal delay={0.55} className="absolute left-[1%] top-[18%]">
        <div
          className="home-glass home-glow-sm home-float flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
          style={{ animationDelay: "0s" }}
        >
          <ScanText className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">
            140+ fields <span className="text-muted-foreground">read automatically</span>
          </span>
        </div>
      </Reveal>

      <Reveal delay={0.7} className="absolute right-[12%] top-[46%]">
        <div
          className="home-glass home-glow-sm home-float flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
          style={{ animationDelay: "1.4s" }}
        >
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Sanctions · PEP · AML</span>
        </div>
      </Reveal>

      <Reveal delay={0.85} className="absolute bottom-[15%] left-[10%]">
        <div
          className="home-glass home-glow-sm home-float flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
          style={{ animationDelay: "2.6s" }}
        >
          <FileCheck2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">
            Evidence pack <span className="text-muted-foreground">audit-ready</span>
          </span>
        </div>
      </Reveal>
    </div>
  );
}

export interface HeroSectionProps {
  className?: string;
}

export function HeroSection({ className }: HeroSectionProps) {
  const reduced = useReducedMotion();
  const onAnchor = useAnchorScroll();

  return (
    <section
      id={SECTION_IDS.hero}
      aria-label={`${COPY.brand} — overview`}
      className={[
        "home-dark home-grain relative isolate flex min-h-[100svh] flex-col overflow-hidden",
        className ?? "",
      ].join(" ")}
    >
      {/* ── Atmosphere ─────────────────────────────────────────────── */}
      <div aria-hidden className="home-mesh pointer-events-none absolute inset-0 -z-20" />
      <div
        aria-hidden
        className="home-grid home-grid-fade pointer-events-none absolute inset-0 -z-20 opacity-[0.35]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-12%] -z-10 h-[58vh] w-[58vh] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]"
      />

      {/* ── WebGL core (full-bleed behind copy on mobile, right-half on lg) ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(60%_60%_at_50%_42%,#000_55%,transparent_100%)] [-webkit-mask-image:radial-gradient(60%_60%_at_50%_42%,#000_55%,transparent_100%)] lg:inset-y-0 lg:left-[38%] lg:right-[-6%] lg:opacity-100 lg:[mask-image:none] lg:[-webkit-mask-image:none]"
      >
        <CanvasLazy
          className="h-full w-full"
          camera={{ position: [0, 0, 6.6], fov: 40 }}
          fallback={<HeroFallback />}
        >
          <HeroScene />
        </CanvasLazy>
        <FloatingChips />
      </div>

      {/* Mobile-only scrim — keeps copy legible over the full-bleed core. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-[5] bg-gradient-to-b from-background/70 via-background/35 to-background/80 lg:hidden"
      />

      {/* ── Copy ───────────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-28 pt-32 sm:px-8 lg:pb-32 lg:pt-36">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="flex max-w-2xl flex-col items-start gap-6 lg:col-span-7">
            <Reveal index={0}>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary backdrop-blur">
                <span aria-hidden className="h-1 w-1 rounded-full bg-primary home-pulse-glow" />
                {COPY.hero.eyebrow}
              </span>
            </Reveal>

            <Reveal index={1}>
              <h1 className="max-w-[20ch] font-brand text-[clamp(2.6rem,6.6vw,5rem)] font-semibold leading-[1.02] tracking-tight text-foreground">
                {COPY.hero.headlinePre}
                <span className="home-gradient-text">{COPY.hero.headlineAccent}</span>
              </h1>
            </Reveal>

            <Reveal index={2}>
              <RotatingLine />
            </Reveal>

            <Reveal index={3}>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {COPY.hero.subhead}
              </p>
            </Reveal>

            <Reveal index={4}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="#contact"
                  onClick={(e) => onAnchor(e, "#contact")}
                  className="focus-ring group inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)_/_0.85)] transition-all duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
                >
                  {COPY.hero.secondaryCta}
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </a>
                <Link
                  to={APP_URL}
                  className="focus-ring group inline-flex items-center justify-center gap-2 rounded-lg border border-border/70 bg-card/40 px-6 py-3.5 text-sm font-semibold text-foreground backdrop-blur transition-all duration-150 hover:-translate-y-0.5 hover:border-border hover:bg-card/70"
                >
                  {COPY.hero.primaryCta}
                  <ArrowUpRight
                    className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden
                  />
                </Link>
              </div>
            </Reveal>

            <Reveal index={5}>
              <div className="flex flex-col gap-3">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 flex-none text-primary" aria-hidden />
                  Humans approve every decision — every action is logged.
                </p>
                <ul className="flex flex-wrap items-center gap-2">
                  {REGULATORS.map((r) => (
                    <li
                      key={r.short}
                      title={r.full}
                      className="rounded-full border border-border/60 bg-card/40 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground backdrop-blur"
                    >
                      {r.short}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          {/* Spacer column — the canvas occupies this region on lg via absolute placement. */}
          <div aria-hidden className="hidden lg:col-span-5 lg:block" />
        </div>
      </div>

      {/* ── Scroll cue ─────────────────────────────────────────────── */}
      <a
        href="#features"
        onClick={(e) => onAnchor(e, "#features")}
        aria-label="Scroll to features"
        className="focus-ring absolute bottom-6 left-1/2 z-10 inline-flex -translate-x-1/2 flex-col items-center gap-1.5 rounded-md px-3 py-1 text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.3em]">Scroll</span>
        <motion.span
          aria-hidden
          animate={reduced ? undefined : { y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </a>
    </section>
  );
}

export default HeroSection;
