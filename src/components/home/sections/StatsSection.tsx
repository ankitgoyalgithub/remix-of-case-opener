/**
 * Section E — Stats / Outcomes + Trust bar.
 *
 * A confident, light-toned "by the numbers" band: four scroll-triggered
 * count-up figures from `content.ts` STATS, followed by a tasteful UAE
 * regulator trust strip (DHA · DOH-Shafafiya · MOHRE).
 *
 * Motion: each tile reveals (fade + slide) on scroll and numeric figures
 * count up via <AnimatedCounter>. Under `prefers-reduced-motion` the tiles
 * render static and the figures show their final values immediately (both
 * behaviours are handled by the shared primitives).
 */
import { ShieldCheck } from "lucide-react";
import {
  AnimatedCounter,
  Reveal,
  SectionShell,
} from "@/components/home/primitives";
import {
  COPY,
  REGULATORS,
  SECTION_IDS,
  STATS,
  type Stat,
} from "@/components/home/content";

/* The figure (big number/text). Numeric stats count up on scroll; the suffix
   is rendered separately so "+" / "-stage" stay a smaller accent next to the
   number instead of inheriting the full display size. */
function StatFigure({ stat }: { stat: Stat }) {
  if (typeof stat.value === "number") {
    return (
      <>
        <AnimatedCounter value={stat.value} prefix={stat.prefix} />
        {stat.suffix ? (
          <span className="ml-0.5 text-[0.42em] font-semibold tracking-tight text-primary">
            {stat.suffix}
          </span>
        ) : null}
      </>
    );
  }
  return <span>{stat.text}</span>;
}

export interface StatsSectionProps {
  className?: string;
}

export function StatsSection({ className }: StatsSectionProps) {
  return (
    <SectionShell
      id={SECTION_IDS.stats}
      tone="light"
      mesh
      grain
      className={className}
      eyebrow={COPY.eyebrows.stats}
      title={
        <>
          Built to clear submissions in{" "}
          <span className="home-gradient-text">minutes, not days</span>
        </>
      }
      subtitle="Every figure reflects what Insure Auto handles automatically on a single group-medical submission — read, screened and reconciled before an underwriter even opens the case."
    >
      {/* Stats band */}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        {STATS.map((stat, i) => (
          <Reveal
            as="li"
            index={i}
            key={stat.id}
            className="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-6 home-glass transition-transform duration-200 hover:-translate-y-1 sm:p-7"
          >
            {/* Hover accent line along the top edge */}
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            />
            {/* Editorial index + live dot */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-primary/60 transition-colors duration-200 group-hover:bg-primary"
              />
            </div>

            {/* Figure */}
            <div className="flex items-baseline font-brand text-[clamp(2.5rem,6vw,3.75rem)] font-semibold leading-none tracking-tight text-foreground">
              <StatFigure stat={stat} />
            </div>

            {/* Caption */}
            <p className="text-sm leading-snug text-muted-foreground sm:text-base">
              {stat.label}
            </p>
          </Reveal>
        ))}
      </ul>

      {/* Trust / regulator strip */}
      <Reveal
        delay={0.1}
        className="mt-12 flex justify-center sm:mt-16"
      >
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-3 rounded-2xl border border-border/70 bg-card/50 px-5 py-4 home-glass sm:rounded-full sm:px-7">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
            Built for UAE group-medical underwriting
          </span>
          <span
            aria-hidden
            className="hidden h-4 w-px bg-border sm:block"
          />
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {REGULATORS.map((regulator) => (
              <li key={regulator.short}>
                <span
                  aria-label={regulator.full}
                  title={regulator.full}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground"
                >
                  <span
                    aria-hidden
                    className="h-1 w-1 rounded-full bg-primary"
                  />
                  {regulator.short}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </SectionShell>
  );
}

export default StatsSection;
