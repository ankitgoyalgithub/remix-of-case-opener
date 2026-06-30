/**
 * HomeFooter — rich dark footer for the Insure Auto landing page.
 *
 * Brand + tagline, grouped link columns (Product / Platform / Company),
 * a UAE regulator/trust note (DHA · DOH-Shafafiya · MOHRE), and a compact
 * "Open the app" CTA. Anchor links smooth-scroll; "#" links are placeholders.
 */
import type * as React from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./primitives";
import {
  COPY,
  APP_URL,
  FOOTER_COLUMNS,
  REGULATORS,
} from "./content";

export interface HomeFooterProps {
  className?: string;
}

export function HomeFooter({ className }: HomeFooterProps) {
  const reduced = useReducedMotion();
  const year = new Date().getFullYear();

  const onAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("#") || href === "#") return;
    const el = document.getElementById(href.slice(1));
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <footer
      className={cn(
        "home-dark home-grain relative isolate overflow-hidden",
        className,
      )}
      aria-labelledby="home-footer-heading"
    >
      <h2 id="home-footer-heading" className="sr-only">
        {COPY.brand} footer
      </h2>

      {/* soft top glow */}
      <div
        aria-hidden
        className="home-mesh pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 opacity-70"
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16 sm:px-8 sm:py-20">
        <Reveal className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-12">
          {/* Brand block */}
          <div className="col-span-2 md:col-span-5">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-primary to-primary/70 text-primary-foreground"
              >
                <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2.25} />
              </span>
              <span className="font-brand text-lg font-semibold tracking-tight text-foreground">
                {COPY.brand}
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {COPY.footer.tagline}
            </p>

            <Link
              to={APP_URL}
              className="focus-ring group mt-6 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_6px_20px_-8px_hsl(var(--primary)_/_0.8)] transition-all duration-150 hover:brightness-110 active:translate-y-px"
            >
              {COPY.hero.primaryCta}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>

          {/* Link columns */}
          <nav
            aria-label="Footer"
            className="col-span-2 grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7"
          >
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading}>
                <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/70">
                  {col.heading}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => {
                    const isInternal = link.href.startsWith("/");
                    return (
                      <li key={`${col.heading}-${link.label}`}>
                        {isInternal ? (
                          <Link
                            to={link.href}
                            className="focus-ring rounded text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                          >
                            {link.label}
                          </Link>
                        ) : (
                          <a
                            href={link.href}
                            onClick={(e) => onAnchor(e, link.href)}
                            className="focus-ring rounded text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                          >
                            {link.label}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </Reveal>

        {/* Regulator / trust strip */}
        <div className="mt-14 border-t border-border/70 pt-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
              Compliance-aware
            </span>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <ul className="flex flex-wrap items-center gap-2">
              {REGULATORS.map((r) => (
                <li key={r.short}>
                  <span
                    title={r.full}
                    className="inline-flex items-center rounded-full border border-border/70 bg-card/40 px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-foreground/80"
                  >
                    {r.short}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {COPY.footer.regulatorNote}
          </p>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-2 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {COPY.footer.copyright}
          </p>
          <p className="text-muted-foreground/80">
            Humans approve every decision — every action is logged.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default HomeFooter;
