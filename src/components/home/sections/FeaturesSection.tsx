/**
 * Insure Auto — Features section (Section A).
 *
 * ALL platform capabilities from content.ts FEATURES, presented "as a pipeline":
 * a single scroll-driven flow built on the shared <PipelineFlow> primitive.
 *
 *   • A central primary-gradient RAIL draws as the section scrolls (left rail on
 *     mobile, centered from md+), tying every capability into one connected line.
 *   • Each feature is a NODE that lights up (glows) as it enters view, so the
 *     capabilities read as a sequence, not a static grid.
 *   • Each feature is an alternating-side <SpotlightCard> (cursor spotlight + 3D
 *     tilt + gradient hairline): icon chip + sequence badge + Fraunces title +
 *     plain description.
 *
 * Light tone (keeps the page's dark/light rhythm). Fully responsive (single
 * column + left rail on mobile, alternating two-up from md+) and reduced-motion
 * safe (static full rail, pre-lit nodes, plain cards) — all handled by the
 * primitive. Colour comes only from tone-scoped tokens; no hardcoded hex.
 */
import { PipelineFlow, type PipelineItem } from "@/components/home/modern";
import { SectionShell } from "@/components/home/primitives";
import { FEATURES, COPY } from "@/components/home/content";

/* Map every capability onto a pipeline item. A two-digit mono badge reinforces
   the sequence (the rail node itself shows the feature's icon, not a number). */
const FEATURE_ITEMS: PipelineItem[] = FEATURES.map((feature, i) => ({
  icon: feature.icon,
  badge: String(i + 1).padStart(2, "0"),
  title: feature.title,
  description: feature.description,
}));

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
      <PipelineFlow items={FEATURE_ITEMS} />
    </SectionShell>
  );
}

export default FeaturesSection;
