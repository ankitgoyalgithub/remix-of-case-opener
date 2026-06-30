/**
 * Insure Auto — landing-page content model (single source of truth).
 *
 * Icons are exported as ACTUAL lucide-react components (not strings), so a
 * section can render them directly:
 *
 *     import { FEATURES } from "@/components/home/content";
 *     const Icon = FEATURES[0].icon;   // a LucideIcon component
 *     <Icon className="h-5 w-5" aria-hidden />
 *
 * Nothing here invents customers, logos, or metrics beyond the representative
 * stats provided in the brief. Regulator names (DHA / DOH-Shafafiya / MOHRE)
 * are real UAE context.
 */
import {
  ScanText,
  UserCheck,
  GitCompare,
  ShieldAlert,
  Flag,
  FileCheck2,
  SlidersHorizontal,
  Mail,
  LayoutDashboard,
  History,
  Columns3,
  ShieldCheck,
  Gavel,
  Inbox,
  type LucideIcon,
} from "lucide-react";

/* ── Routing / shared constants ───────────────────────────────────────────── */

/** Where the "Open the app" CTA points (the authenticated product). */
export const APP_URL = "/dashboard";

/** Canonical section anchor ids. Section builders MUST use these as their ids
 *  so the nav + footer anchor links resolve. */
export const SECTION_IDS = {
  hero: "top",
  features: "features",
  howItWorks: "how-it-works",
  platform: "platform",
  stats: "stats",
  reviews: "reviews",
  contact: "contact",
} as const;

export interface NavLink {
  id: string;
  label: string;
  href: string;
}

/** Primary nav links (shared by HomeNav + HomeFooter). */
export const NAV_LINKS: NavLink[] = [
  { id: "features", label: "Features", href: "#features" },
  { id: "how-it-works", label: "How it works", href: "#how-it-works" },
  { id: "platform", label: "Platform", href: "#platform" },
  { id: "reviews", label: "Reviews", href: "#reviews" },
  { id: "contact", label: "Contact", href: "#contact" },
];

/** UAE regulators referenced across the page (trust/compliance context). */
export const REGULATORS: { short: string; full: string }[] = [
  { short: "DHA", full: "DHA — Dubai Health Authority" },
  { short: "DOH-Shafafiya", full: "DOH-Shafafiya — Abu Dhabi" },
  { short: "MOHRE", full: "MOHRE — Ministry of Human Resources & Emiratisation" },
];

/* ── Features ─────────────────────────────────────────────────────────────── */

export interface Feature {
  /** Stable key (good for React lists + anchors). */
  key: string;
  title: string;
  /** One-to-two sentence capability description (accurate, no invented metrics). */
  description: string;
  icon: LucideIcon;
}

export const FEATURES: Feature[] = [
  {
    key: "ai-document-reading",
    title: "AI document reading",
    description:
      "Reads census files, trade licences, MOA, KYC and 25+ document types — and extracts 140+ fields automatically, no manual keying.",
    icon: ScanText,
  },
  {
    key: "member-list-validation",
    title: "Member-list validation",
    description:
      "Matches every employee against government labour records (MOL / MOHRE) on passport, name and nationality through a 4-stage match.",
    icon: UserCheck,
  },
  {
    key: "cross-document-checks",
    title: "Cross-document checks",
    description:
      "Confirms the same details — company name, dates, ownership — agree across every document in the submission.",
    icon: GitCompare,
  },
  {
    key: "sanctions-pep-aml",
    title: "Sanctions, PEP & AML screening",
    description:
      "Background-checks the company and its owners for sanctions, politically-exposed persons and adverse media.",
    icon: ShieldAlert,
  },
  {
    key: "risk-flags-gating",
    title: "Risk flags & enforced gating",
    description:
      "Surfaces risks and blocks approval until critical ones are resolved — or overridden with a logged reason.",
    icon: Flag,
  },
  {
    key: "evidence-pack",
    title: "Evidence pack",
    description:
      "Assembles one audit-ready decision file capturing every check, override and reason behind the outcome.",
    icon: FileCheck2,
  },
  {
    key: "ai-studio",
    title: "Configurable AI Studio",
    description:
      "Set up your own document types, review stages, checks and rules — no code required.",
    icon: SlidersHorizontal,
  },
  {
    key: "email-intake-portal",
    title: "Email intake & broker portal",
    description:
      "Submissions arrive by email and become a case automatically; brokers upload missing documents via a secure link.",
    icon: Mail,
  },
  {
    key: "triage-dashboard",
    title: "Triage dashboard & inbox",
    description:
      "See what's due, at risk and waiting — sorted by urgency, with clear owners and SLAs.",
    icon: LayoutDashboard,
  },
  {
    key: "audit-trail",
    title: "Full audit trail",
    description:
      "Every action — who, what, when and why — is logged for complete, defensible traceability.",
    icon: History,
  },
  {
    key: "underwriter-workbench",
    title: "Underwriter workbench",
    description:
      "Review documents, extracted data, checks and risks side by side — then decide with confidence.",
    icon: Columns3,
  },
];

/* ── Pipeline (how it works) ──────────────────────────────────────────────── */

export interface PipelineStep {
  key: string;
  /** Short stage verb, e.g. "Read". */
  stage: string;
  /** Headline for the step. */
  title: string;
  description: string;
  icon: LucideIcon;
}

export const PIPELINE: PipelineStep[] = [
  {
    key: "intake",
    stage: "Intake",
    title: "Submission becomes a case",
    description:
      "Broker emails arrive and turn into a structured case automatically — attachments and all.",
    icon: Inbox,
  },
  {
    key: "read",
    stage: "Read",
    title: "AI reads every document",
    description:
      "Census, trade licence, MOA, KYC and 25+ doc types are parsed and 140+ fields extracted.",
    icon: ScanText,
  },
  {
    key: "check",
    stage: "Check",
    title: "Run the screening checks",
    description:
      "Sanctions, PEP, AML and member-list (MOL / MOHRE) validation run together.",
    icon: ShieldCheck,
  },
  {
    key: "reconcile",
    stage: "Reconcile",
    title: "Cross-document checks",
    description:
      "Company name, dates and ownership are confirmed to agree across all documents.",
    icon: GitCompare,
  },
  {
    key: "review",
    stage: "Review",
    title: "Underwriter workbench",
    description:
      "Documents, extracted data, checks and risks sit side by side for a fast review.",
    icon: Columns3,
  },
  {
    key: "decide",
    stage: "Decide",
    title: "Gated decision",
    description:
      "Critical risks block approval until resolved or overridden with a logged reason.",
    icon: Gavel,
  },
  {
    key: "issue",
    stage: "Issue",
    title: "Evidence pack",
    description:
      "One audit-ready file captures every check, override and reason behind the decision.",
    icon: FileCheck2,
  },
];

/* ── Stats ────────────────────────────────────────────────────────────────── */

export interface Stat {
  id: string;
  /** Numeric value → render with <AnimatedCounter>. Omit for text-only stats. */
  value?: number;
  prefix?: string;
  suffix?: string;
  /** Non-numeric display (e.g. "Minutes"); used when `value` is undefined. */
  text?: string;
  /** Caption under the figure. */
  label: string;
}

export const STATS: Stat[] = [
  { id: "doc-types", value: 25, suffix: "+", label: "Document types read" },
  { id: "fields", value: 140, suffix: "+", label: "Fields read automatically" },
  { id: "match-stages", value: 4, suffix: "-stage", label: "Member-list matching" },
  { id: "turnaround", text: "Minutes", label: "Not days" },
];

/* ── Marketing copy ───────────────────────────────────────────────────────── */

export const COPY = {
  brand: "Insure Auto",
  tagline: "Underwriting operations for UAE group medical.",

  hero: {
    eyebrow: "UAE GROUP-MEDICAL UNDERWRITING",
    /** The accent word(s) inside the headline — wrap with .home-gradient-text. */
    headlinePre: "Underwriting operations, on ",
    headlineAccent: "autopilot.",
    /** Alternate headline ideas (use one; kept for variant testing). */
    headlineVariants: [
      "Every document read. Every check run. Every decision defensible.",
      "From broker email to audit-ready decision — in minutes.",
      "The underwriting workbench built for UAE compliance.",
    ],
    subhead:
      "Insure Auto reads every document, runs every check, and assembles an audit-ready decision file — so your team clears group-medical submissions in minutes, not days.",
    primaryCta: "Open the app",
    secondaryCta: "Request a demo",
  },

  /** Eyebrows for each section (mono uppercase labels). */
  eyebrows: {
    features: "THE PLATFORM",
    howItWorks: "HOW IT WORKS",
    platform: "BUILT FOR UAE COMPLIANCE",
    stats: "BY THE NUMBERS",
    contact: "GET STARTED",
  },

  /** Section titles + subtitles (defaults — sections may override). */
  sections: {
    features: {
      title: "Everything underwriting operations needs",
      subtitle:
        "Eleven capabilities that take a submission from inbox to issued decision — accurate, screened and fully auditable.",
    },
    howItWorks: {
      title: "From broker email to evidence pack",
      subtitle:
        "A single pipeline: intake, read, check, reconcile, review, decide and issue — with humans in control of every decision.",
    },
    platform: {
      title: "Configurable, compliant, and built for the UAE",
      subtitle:
        "Set up your own documents, stages, checks and rules — aware of DHA, DOH-Shafafiya and MOHRE from day one.",
    },
    contact: {
      title: "See Insure Auto on your own submissions",
      subtitle:
        "Request a walkthrough, or open the app and explore the underwriter workbench.",
    },
  },

  footer: {
    tagline:
      "AI-assisted underwriting operations for UAE group-medical insurance — read, screen, reconcile and decide, with a defensible evidence pack behind every outcome.",
    regulatorNote:
      "Aware of DHA (Dubai) · DOH-Shafafiya (Abu Dhabi) · MOHRE. Humans approve every decision; every action is logged.",
    copyright: "Insure Auto. All rights reserved.",
  },
} as const;

/** Grouped footer link columns. Hrefs are anchors or "#" placeholders. */
export interface FooterColumn {
  heading: string;
  links: { label: string; href: string }[];
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Underwriter workbench", href: "#features" },
      { label: "Open the app", href: APP_URL },
    ],
  },
  {
    heading: "Platform",
    links: [
      { label: "AI document reading", href: "#features" },
      { label: "Member-list validation", href: "#features" },
      { label: "Sanctions & AML screening", href: "#features" },
      { label: "Evidence pack", href: "#features" },
      { label: "AI Studio", href: "#platform" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Security & compliance", href: "#platform" },
      { label: "Reviews", href: "#reviews" },
      { label: "Contact", href: "#contact" },
      { label: "Request a demo", href: "#contact" },
    ],
  },
];

/* ── Reviews / testimonials ───────────────────────────────────────────────────
 * ILLUSTRATIVE, role-based testimonials for a UAE group-medical underwriting
 * platform. Personas and organisations are GENERIC by design — no real customer,
 * person or company is named. Render with the <Marquee> + <SpotlightCard> + <Rating>
 * primitives (and/or <PipelineFlow>) from `modern.tsx`.
 */
export interface Review {
  /** The testimonial body. */
  quote: string;
  /** Person (illustrative persona). */
  author: string;
  /** Job title / function. */
  role: string;
  /** Generic organisation descriptor (never a real company name). */
  org: string;
  /** Optional star rating, 1–5. */
  rating?: number;
}

export const REVIEWS: Review[] = [
  {
    quote:
      "What used to take my team two days now clears before lunch. It reads the whole submission, runs every check, and hands us a decision we can actually stand behind.",
    author: "Layla Al-Mansoori",
    role: "Head of Underwriting",
    org: "UAE health insurer",
    rating: 5,
  },
  {
    quote:
      "It pulls 140-plus fields off a census and trade licence without a single keystroke from us. The accuracy is the part that surprised everyone on the desk.",
    author: "Omar Haddad",
    role: "Senior Underwriter",
    org: "Group-medical insurer",
    rating: 5,
  },
  {
    quote:
      "Our inbox finally makes sense. Every submission is triaged by urgency with a clear owner and an SLA, so nothing slips through the cracks anymore.",
    author: "Priya Nair",
    role: "Operations Lead",
    org: "Third-party administrator (TPA)",
    rating: 5,
  },
  {
    quote:
      "Sanctions, PEP and AML screening sit in one place, and every action is logged. When the regulator asks, the evidence pack already has the answer.",
    author: "Hassan Al-Farsi",
    role: "Compliance Manager",
    org: "Health insurer, UAE",
    rating: 5,
  },
  {
    quote:
      "Brokers upload missing documents through a secure link and the case updates itself. Honestly, half of the back-and-forth just disappeared overnight.",
    author: "James Whitfield",
    role: "Account Manager",
    org: "Insurance brokerage, Dubai",
    rating: 4,
  },
  {
    quote:
      "We configured our own document types, review stages and rules in the AI Studio — no developers, no waiting on a roadmap. That flexibility sold the team.",
    author: "Sara Khan",
    role: "Product Owner",
    org: "Health insurance platform",
    rating: 5,
  },
  {
    quote:
      "Critical risks block approval until they're resolved or signed off with a reason. It made our decisions consistent across the entire underwriting desk.",
    author: "Daniel Okoro",
    role: "Chief Underwriting Officer",
    org: "Group-medical insurer, Abu Dhabi",
    rating: 5,
  },
  {
    quote:
      "Member lists are matched against MOL and MOHRE records automatically. The four-stage match catches discrepancies we used to miss reviewing by hand.",
    author: "Fatima Rashed",
    role: "Risk & Governance Lead",
    org: "UAE health insurer",
    rating: 5,
  },
];
