import "@/components/home/home.css";
import { ScrollProgress } from "@/components/home/ScrollProgress";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { HeroSection } from "@/components/home/sections/HeroSection";
import { FeaturesSection } from "@/components/home/sections/FeaturesSection";
import { PipelineSection } from "@/components/home/sections/PipelineSection";
import { ShowcaseSection } from "@/components/home/sections/ShowcaseSection";
import { StatsSection } from "@/components/home/sections/StatsSection";
import { InterestSection } from "@/components/home/sections/InterestSection";

/**
 * Public marketing / landing page at /home-page.
 *
 * Standalone (no app shell), manually navigable — the default "/" still
 * redirects to the dashboard behind auth. Lazy-loaded in App.tsx so its WebGL
 * (three.js) + framer-motion payload never reaches the operational app bundle.
 *
 * Narrative order, with the two WebGL moments (hero + showcase) spaced apart:
 *   Hero → Features (what it does) → Pipeline (how it works)
 *        → Showcase (flagship, WebGL art) → Stats (proof) → Contact (lead form).
 */
export default function HomePage() {
  return (
    <div className="home-root">
      <ScrollProgress />
      <HomeNav />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PipelineSection />
        <ShowcaseSection />
        <StatsSection />
        <InterestSection />
      </main>
      <HomeFooter />
    </div>
  );
}
