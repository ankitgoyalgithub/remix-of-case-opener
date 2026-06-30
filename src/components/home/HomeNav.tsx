/**
 * HomeNav — sticky, glassy marketing nav for the Insure Auto landing page.
 *
 * • Transparent over the dark hero, frosted dark glass once scrolled.
 * • Smooth-scroll anchor links (respects reduced motion → instant jump).
 * • Primary "Open the app" → /dashboard (react-router Link, SPA nav).
 *   Secondary "Request a demo" → #contact.
 * • Mobile: accessible hamburger → animated drawer (Esc to close, focus-safe,
 *   body-scroll locked while open).
 *
 * Self-contained dark token context (`.home-tokens-dark`) so text stays light
 * and readable whether it floats over the hero or its own glass bar.
 */
import type * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X, ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_LINKS, COPY, APP_URL, SECTION_IDS } from "./content";

/** Smooth-scroll to an in-page anchor, honouring reduced motion + nav offset. */
function scrollToAnchor(href: string, reduced: boolean | null) {
  if (!href.startsWith("#")) return false;
  const id = href.slice(1);
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  return true;
}

function BrandMark() {
  return (
    <span
      aria-hidden
      className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-[0_4px_16px_-4px_hsl(var(--primary)_/_0.7)]"
    >
      <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2.25} />
    </span>
  );
}

export interface HomeNavProps {
  className?: string;
}

export function HomeNav({ className }: HomeNavProps) {
  const reduced = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // Solidify the bar after a little scroll.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Esc closes the drawer; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const handleAnchor = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (scrollToAnchor(href, reduced)) {
        e.preventDefault();
        setOpen(false);
      }
    },
    [reduced],
  );

  const goTop = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      setOpen(false);
    },
    [reduced],
  );

  return (
    <header
      className={cn(
        "home-tokens-dark fixed inset-x-0 top-0 z-50 text-foreground transition-[background-color,box-shadow,border-color] duration-300",
        scrolled
          ? "border-b border-border/70 bg-background/70 shadow-[0_8px_30px_-12px_hsl(var(--background)_/_0.7)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
        className,
      )}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 sm:px-8 lg:h-[4.5rem]"
      >
        {/* Wordmark */}
        <a
          href={`#${SECTION_IDS.hero}`}
          onClick={goTop}
          className="focus-ring group flex items-center gap-2.5 rounded-md"
          aria-label={`${COPY.brand} — back to top`}
        >
          <BrandMark />
          <span className="font-brand text-lg font-semibold tracking-tight text-foreground">
            {COPY.brand}
          </span>
        </a>

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.id}>
              <a
                href={link.href}
                onClick={(e) => handleAnchor(e, link.href)}
                className="focus-ring relative rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-2 lg:flex">
          <a
            href="#contact"
            onClick={(e) => handleAnchor(e, "#contact")}
            className="focus-ring rounded-md px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            {COPY.hero.secondaryCta}
          </a>
          <Link
            to={APP_URL}
            className="focus-ring group inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_6px_20px_-8px_hsl(var(--primary)_/_0.8)] transition-all duration-150 hover:brightness-110 active:translate-y-px"
          >
            {COPY.hero.primaryCta}
            <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-border/70 bg-card/50 text-foreground lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="home-mobile-menu"
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="home-mobile-menu"
            key="mobile-menu"
            initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="home-tokens-dark overflow-hidden border-b border-border/70 bg-background/95 backdrop-blur-xl lg:hidden"
          >
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-6 py-4 sm:px-8">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => handleAnchor(e, link.href)}
                  className="focus-ring rounded-md px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-card/60"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-4">
                <a
                  href="#contact"
                  onClick={(e) => handleAnchor(e, "#contact")}
                  className="focus-ring rounded-md border border-border bg-card/50 px-4 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:bg-card"
                >
                  {COPY.hero.secondaryCta}
                </a>
                <Link
                  to={APP_URL}
                  onClick={() => setOpen(false)}
                  className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
                >
                  {COPY.hero.primaryCta}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default HomeNav;
