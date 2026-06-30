/**
 * Insure Auto — Reviews / Testimonials section.
 *
 * Presents the ILLUSTRATIVE, role-based REVIEWS from content.ts as a continuous
 * "pipeline" of feedback rather than a static grid:
 *
 *   1. one large standout quote (the featured review), then
 *   2. two auto-scrolling <Marquee> rows flowing in OPPOSITE directions — a
 *      seamless, edge-faded stream of testimonial cards that reads as a pipeline.
 *
 * Each card is a <SpotlightCard> (glass + cursor spotlight + subtle 3D tilt)
 * carrying a star <Rating>, the quote, and an author monogram chip with
 * role · org (no fake photos). Under `prefers-reduced-motion` the marquees
 * degrade to static, horizontally-scrollable rows (handled inside <Marquee>)
 * and the standout renders fully visible. Dark-toned; token-only colour.
 *
 * The personas/orgs are generic by design and labelled as illustrative — no
 * real customer, person or company is named.
 */
import { Quote } from "lucide-react";
import { Reveal, SectionShell } from "@/components/home/primitives";
import { Marquee, Rating, SpotlightCard } from "@/components/home/modern";
import { REVIEWS, SECTION_IDS, type Review } from "@/components/home/content";

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/** First-name + last-name initials for the avatar monogram. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Avatar monogram chip — initials in a tinted primary square (never a photo). */
function Monogram({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={
        "grid shrink-0 place-items-center rounded-xl bg-primary/10 font-semibold text-primary ring-1 ring-inset ring-primary/20 " +
        (size === "lg" ? "h-11 w-11 text-sm" : "h-10 w-10 text-[0.8rem]")
      }
    >
      {initials(name)}
    </span>
  );
}

/** Author identity row: monogram + name + role · org. */
function AuthorBlock({ review, size = "md" }: { review: Review; size?: "md" | "lg" }) {
  return (
    <div className="flex items-center gap-3">
      <Monogram name={review.author} size={size} />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold text-foreground">
          {review.author}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {review.role} · {review.org}
        </p>
      </div>
    </div>
  );
}

/* ── Featured standout quote ──────────────────────────────────────────────── */

function FeaturedReview({ review }: { review: Review }) {
  return (
    <Reveal className="mx-auto max-w-3xl">
      <SpotlightCard as="figure" className="p-7 sm:p-10">
        <Quote
          className="h-8 w-8 text-primary/70 sm:h-9 sm:w-9"
          aria-hidden
        />
        <Rating value={review.rating ?? 5} size={18} className="mt-5" />
        <blockquote className="mt-4 font-brand text-xl font-medium leading-snug tracking-tight text-foreground sm:text-2xl md:text-[1.7rem]">
          “{review.quote}”
        </blockquote>
        <figcaption className="mt-7">
          <AuthorBlock review={review} size="lg" />
        </figcaption>
      </SpotlightCard>
    </Reveal>
  );
}

/* ── One testimonial card in the stream ───────────────────────────────────── */

/** Fixed-clamped width so the marquee row never collapses. */
function ReviewCard({ review }: { review: Review }) {
  return (
    <SpotlightCard
      as="article"
      className="flex h-full w-[min(85vw,21rem)] shrink-0 flex-col p-6"
    >
      <Rating value={review.rating ?? 5} />
      <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground/90">
        “{review.quote}”
      </p>
      <div className="mt-5 border-t border-border/50 pt-4">
        <AuthorBlock review={review} />
      </div>
    </SpotlightCard>
  );
}

/* ── Section ──────────────────────────────────────────────────────────────── */

export interface ReviewsSectionProps {
  /** Optional extra classes on the section element. */
  className?: string;
}

export function ReviewsSection({ className }: ReviewsSectionProps) {
  // Feature the first review; flow the rest through the two-row stream.
  const [featured, ...rest] = REVIEWS;
  const mid = Math.ceil(rest.length / 2);
  const rowOne = rest.slice(0, mid);
  const rowTwo = rest.slice(mid);

  return (
    <SectionShell
      id={SECTION_IDS.reviews}
      tone="dark"
      mesh
      grid
      className={className}
      eyebrow="WHAT TEAMS SAY"
      title={
        <>
          What underwriting teams{" "}
          <span className="home-gradient-text">say about it</span>
        </>
      }
      subtitle="From a cluttered inbox to an audit-ready decision — here's how operations, underwriting and compliance teams describe working with Insure Auto."
    >
      {featured && <FeaturedReview review={featured} />}

      {/* Continuous feedback stream — two marquees flowing opposite directions. */}
      <div className="mt-14 sm:mt-20">
        <Reveal className="mb-7 flex items-center justify-center gap-2.5">
          <span aria-hidden className="relative flex h-2 w-2">
            <span className="home-pulse-glow absolute inline-flex h-full w-full rounded-full bg-primary/50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            A continuous stream of feedback
          </span>
        </Reveal>

        <Reveal delay={0.05} className="flex flex-col gap-5">
          <Marquee speed={56} gap="1.25rem" className="py-1">
            {rowOne.map((review) => (
              <ReviewCard key={review.author} review={review} />
            ))}
          </Marquee>
          <Marquee direction="right" speed={64} gap="1.25rem" className="py-1">
            {rowTwo.map((review) => (
              <ReviewCard key={review.author} review={review} />
            ))}
          </Marquee>
        </Reveal>
      </div>

      {/* Honesty note — these are illustrative personas, not real customers. */}
      <Reveal delay={0.1} className="mt-10 text-center sm:mt-12">
        <p className="mx-auto max-w-xl text-xs leading-relaxed text-muted-foreground/80">
          Illustrative, role-based testimonials representing UAE group-medical
          underwriting teams — not specific customers, people or companies.
        </p>
      </Reveal>
    </SectionShell>
  );
}

export default ReviewsSection;
