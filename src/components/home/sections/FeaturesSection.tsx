/**
 * Insure Auto — Features section (Section B).
 *
 * A light-toned bento grid that lists ALL eleven platform capabilities from
 * content.ts. Layout rhythm (lg, 6-col grid):
 *   row 1  →  HERO (span 4) + companion (span 2)
 *   row 2  →  three default cards (span 2 each)
 *   row 3  →  two featured cards (span 3 each)
 *   row 4  →  three default cards (span 2 each)
 *   row 5  →  FINALE full-width "workbench" card (span 6)
 * Reflows 1col (mobile) → 2col (sm) → bento (lg). Each card is a presentational
 * <article> inside a semantic list, with rich hover micro-interactions (lift +
 * accent border + glow + icon motion + a soft radial sheen). All colour comes
 * from tone-scoped tokens — no hardcoded hex.
 */
import type { LucideIcon } from "lucide-react";
import { Reveal, SectionShell } from "@/components/home/primitives";
import { FEATURES, STATS, COPY } from "@/components/home/content";
import { cn } from "@/lib/utils";

/* Card emphasis tiers. "default" = standard, others get larger type / extras. */
type Variant = "hero" | "feature" | "finale" | "default";

/* Fixed bento placement keyed by the feature's index in FEATURES.
   Span strings are full literals so Tailwind's JIT keeps them. lg grid = 6 cols.
   Row sums: (4+2) (2+2+2) (3+3) (2+2+2) (6) → every row totals 6. */
const LAYOUT: Record<number, { span: string; variant: Variant }> = {
  0: { span: "sm:col-span-2 lg:col-span-4", variant: "hero" },
  1: { span: "lg:col-span-2", variant: "default" },
  2: { span: "lg:col-span-2", variant: "default" },
  3: { span: "lg:col-span-2", variant: "default" },
  4: { span: "lg:col-span-2", variant: "default" },
  5: { span: "sm:col-span-2 lg:col-span-3", variant: "feature" },
  6: { span: "sm:col-span-2 lg:col-span-3", variant: "feature" },
  7: { span: "lg:col-span-2", variant: "default" },
  8: { span: "lg:col-span-2", variant: "default" },
  9: { span: "lg:col-span-2", variant: "default" },
  10: { span: "sm:col-span-2 lg:col-span-6", variant: "finale" },
};

/* Numeric, animated-counter-friendly stats used as chips on the hero card. */
const HERO_STATS = STATS.filter((s) => typeof s.value === "number").slice(0, 3);

/* Faux "side-by-side" panel labels for the workbench finale illustration. */
const WORKBENCH_PANELS = ["Documents", "Extracted data", "Checks", "Risks"] as const;

/** Tinted trust-blue chip holding a feature's lucide icon. */
function IconChip({ icon: Icon, big }: { icon: LucideIcon; big?: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-xl",
        "bg-primary/10 text-primary ring-1 ring-primary/20",
        "transition-[transform,background-color,box-shadow] duration-200 ease-out",
        "group-hover:bg-primary/15 group-hover:ring-primary/40",
        "group-hover:shadow-[0_8px_24px_-10px_hsl(var(--primary)_/_0.7)]",
        big ? "h-12 w-12" : "h-11 w-11",
      )}
    >
      <Icon
        className={cn(
          "transition-transform duration-200 ease-out group-hover:-translate-y-0.5",
          big ? "h-6 w-6" : "h-5 w-5",
        )}
        aria-hidden
      />
    </span>
  );
}

/** Small editorial index label, e.g. "01". Decorative. */
function CardNumber({ index }: { index: number }) {
  return (
    <span
      aria-hidden
      className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground/50 transition-colors duration-200 group-hover:text-primary"
    >
      {String(index + 1).padStart(2, "0")}
    </span>
  );
}

/** Soft radial sheen that fades in on hover. Sits behind content, non-interactive. */
function HoverSheen() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(120%_80%_at_50%_0%,hsl(var(--primary)_/_0.10),transparent_62%)]"
    />
  );
}

/* Shared card chrome: rounded glass-ish surface, border + lift + glow on hover. */
const cardBase = cn(
  "group relative isolate flex h-full flex-col overflow-hidden rounded-2xl",
  "border border-border/70 bg-card",
  "transition-[transform,border-color,box-shadow] duration-200 ease-out",
  "hover:-translate-y-1 hover:border-primary/50",
  "hover:shadow-[0_22px_50px_-24px_hsl(var(--primary)_/_0.45)]",
);

function FeatureCard({
  index,
  variant,
}: {
  index: number;
  variant: Variant;
}) {
  const feature = FEATURES[index];
  const big = variant !== "default";

  /* The workbench finale: horizontal split — copy on the left, a faux
     "review side-by-side" panel illustration on the right. */
  if (variant === "finale") {
    return (
      <article className={cn(cardBase, "gap-6 p-7 sm:flex-row sm:items-center sm:gap-10 sm:p-9")}>
        <HoverSheen />
        <div className="relative flex-1">
          <div className="flex items-start justify-between gap-4">
            <IconChip icon={feature.icon} big />
            <CardNumber index={index} />
          </div>
          <h3 className="mt-5 font-brand text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {feature.title}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            {feature.description}
          </p>
        </div>

        {/* Decorative "panels side by side, then decide" mini-illustration. */}
        <div aria-hidden className="relative w-full sm:max-w-md">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {WORKBENCH_PANELS.map((label) => (
              <div
                key={label}
                className="rounded-lg border border-border/70 bg-background/60 p-2.5 transition-colors duration-200 group-hover:border-primary/30"
              >
                <span className="mb-2 block h-1.5 w-8 rounded-full bg-primary/45" />
                <span className="mb-1 block h-1 w-full rounded-full bg-muted" />
                <span className="block h-1 w-2/3 rounded-full bg-muted" />
                <span className="mt-2.5 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </article>
    );
  }

  /* Hero + feature + default share the vertical layout. */
  return (
    <article className={cn(cardBase, big ? "p-7 sm:p-8" : "p-6")}>
      <HoverSheen />
      <div className="relative flex items-start justify-between gap-4">
        <IconChip icon={feature.icon} big={big} />
        <CardNumber index={index} />
      </div>

      <h3
        className={cn(
          "relative mt-5 tracking-tight text-foreground",
          variant === "hero" && "font-brand text-xl font-semibold sm:text-2xl",
          variant === "feature" && "font-brand text-lg font-semibold sm:text-xl",
          variant === "default" && "text-base font-semibold sm:text-[1.05rem]",
        )}
      >
        {feature.title}
      </h3>

      <p
        className={cn(
          "relative mt-2 text-sm leading-relaxed text-muted-foreground",
          variant === "hero" && "sm:text-base sm:max-w-md",
        )}
      >
        {feature.description}
      </p>

      {/* Hero card pins quantified proof chips to its base. */}
      {variant === "hero" && (
        <ul className="relative mt-auto flex flex-wrap gap-2 pt-6" role="list">
          {HERO_STATS.map((stat) => (
            <li
              key={stat.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-3 py-1 font-mono text-[11px] text-muted-foreground transition-colors duration-200 group-hover:border-primary/30"
            >
              <span aria-hidden className="h-1 w-1 rounded-full bg-primary" />
              <span className="text-foreground/90">
                {stat.value}
                {stat.suffix}
              </span>
              <span>{stat.label.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export interface FeaturesSectionProps {
  /** Optional extra classes on the section element. */
  className?: string;
}

export function FeaturesSection({ className }: FeaturesSectionProps) {
  return (
    <SectionShell
      id="features"
      tone="light"
      mesh
      grid
      eyebrow={COPY.eyebrows.features}
      title={COPY.sections.features.title}
      subtitle={COPY.sections.features.subtitle}
      className={className}
    >
      <ul
        role="list"
        className="grid grid-flow-row-dense grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-6 lg:gap-6"
      >
        {FEATURES.map((feature, i) => {
          const { span, variant } = LAYOUT[i] ?? { span: "lg:col-span-2", variant: "default" };
          return (
            <Reveal
              key={feature.key}
              as="li"
              index={i}
              stagger={0.05}
              className={cn("h-full", span)}
            >
              <FeatureCard index={i} variant={variant} />
            </Reveal>
          );
        })}
      </ul>
    </SectionShell>
  );
}

export default FeaturesSection;
