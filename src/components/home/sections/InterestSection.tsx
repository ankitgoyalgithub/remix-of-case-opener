/**
 * Insure Auto — Section F: Interest / Demo form.
 *
 * A polished, accessible lead-capture form that POSTs to the real backend via
 * `api.interest.submit(...)`. Paired with a value-prop column ("why request a
 * demo") in a 2-column layout that stacks on mobile.
 *
 * Tone: dark · id: "contact". Uses only token utilities + home.css classes —
 * no hardcoded colours. The destructive status colour is used ONLY for genuine
 * validation/error states (a legitimate status, not decoration).
 */
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ScanText,
  ShieldCheck,
  Columns3,
  SlidersHorizontal,
  CheckCircle2,
  Loader2,
  ArrowRight,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SectionShell, Reveal } from "@/components/home/primitives";
import { COPY, SECTION_IDS, REGULATORS } from "@/components/home/content";

/* ── Validation schema ────────────────────────────────────────────────────── */
/** The "interest" values must be EXACTLY these (contract with the backend). */
const interestValues = ["demo", "pricing", "partnership", "question"] as const;

const interestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter your name")
    .max(120, "That name is a little long"),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your work email")
    .email("Enter a valid email address"),
  company: z.string().trim().max(160, "That's a little long").optional(),
  role: z.string().trim().max(120, "That's a little long").optional(),
  interest: z.enum(interestValues),
  message: z
    .string()
    .trim()
    .max(2000, "Please keep it under 2000 characters")
    .optional(),
});

type InterestForm = z.infer<typeof interestSchema>;

const INTEREST_OPTIONS: { value: (typeof interestValues)[number]; label: string }[] = [
  { value: "demo", label: "A product demo" },
  { value: "pricing", label: "Pricing & plans" },
  { value: "partnership", label: "A partnership" },
  { value: "question", label: "Something else / a question" },
];

/* ── Value-prop column content (why request a demo) ───────────────────────── */
const VALUE_PROPS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: ScanText,
    title: "See it read your own documents",
    description:
      "Watch a real broker email become a structured case — census, trade licence, MOA and KYC extracted automatically.",
  },
  {
    icon: ShieldCheck,
    title: "Every check, run live",
    description:
      "Member-list (MOL / MOHRE) matching, sanctions, PEP and AML screening and cross-document reconciliation, end to end.",
  },
  {
    icon: Columns3,
    title: "Walk the underwriter workbench",
    description:
      "Review documents, extracted data, checks and risks side by side — then reach a gated, defensible decision.",
  },
  {
    icon: SlidersHorizontal,
    title: "Make it yours in AI Studio",
    description:
      "Configure your own document types, review stages, checks and rules — no code, tailored to how your team works.",
  },
];

/* ── Field-level styling helpers (token-only) ─────────────────────────────── */
function fieldClasses(hasError: boolean) {
  return cn(
    "w-full rounded-xl border bg-card/50 px-4 py-3 text-sm text-foreground",
    "placeholder:text-muted-foreground/60 shadow-sm transition-colors duration-150",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-0",
    hasError
      ? "border-destructive/70 focus-visible:border-destructive"
      : "border-border/70 hover:border-border focus-visible:border-primary",
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-destructive"
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

/* ── Component ────────────────────────────────────────────────────────────── */
export function InterestSection({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const uid = useId();
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InterestForm>({
    resolver: zodResolver(interestSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      company: "",
      role: "",
      interest: "demo",
      message: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await api.interest.submit({
        name: values.name,
        email: values.email,
        company: values.company?.trim() || undefined,
        role: values.role?.trim() || undefined,
        interest: values.interest,
        message: values.message?.trim() || undefined,
        source: "home-page",
      });
      reset();
      setSubmitted(true);
    } catch (err) {
      // Human-readable message for the user; technical detail to the console only.
      const e = err as { detail?: string; message?: string };
      // eslint-disable-next-line no-console
      console.error("[InterestSection] submit failed:", err);
      setServerError(
        e?.detail ||
          e?.message ||
          "We couldn't send that just now. Please try again.",
      );
    }
  });

  // Stable ids for label/aria-describedby wiring.
  const ids = {
    name: `${uid}-name`,
    email: `${uid}-email`,
    company: `${uid}-company`,
    role: `${uid}-role`,
    interest: `${uid}-interest`,
    message: `${uid}-message`,
  };

  return (
    <SectionShell
      id={SECTION_IDS.contact}
      tone="dark"
      mesh
      grain
      align="center"
      eyebrow={COPY.eyebrows.contact}
      title={COPY.sections.contact.title}
      subtitle={COPY.sections.contact.subtitle}
      className={cn("home-divider", className)}
    >
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
        {/* ── Left: value-prop column ─────────────────────────────────────── */}
        <div className="flex flex-col gap-8">
          <Reveal>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
              Why request a demo
            </p>
            <p className="mt-3 text-balance text-lg leading-relaxed text-foreground/90 sm:text-xl">
              A 30-minute walkthrough on{" "}
              <span className="home-gradient-text font-brand font-semibold">
                your own submissions
              </span>{" "}
              — from broker email to audit-ready evidence pack.
            </p>
          </Reveal>

          <ul className="flex flex-col gap-5">
            {VALUE_PROPS.map((vp, i) => {
              const Icon = vp.icon;
              return (
                <Reveal as="li" key={vp.title} index={i} className="flex gap-4">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-primary/10 text-primary"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-brand text-base font-semibold text-foreground">
                      {vp.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {vp.description}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </ul>

          {/* Trust row — UAE regulators (compliance context, not decoration). */}
          <Reveal
            index={VALUE_PROPS.length}
            className="flex flex-col gap-3 border-t border-border/60 pt-6"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Built aware of
            </span>
            <ul className="flex flex-wrap gap-2">
              {REGULATORS.map((r) => (
                <li key={r.short}>
                  <span
                    title={r.full}
                    className="inline-flex items-center rounded-full border border-border/70 bg-card/40 px-3 py-1 font-mono text-[11px] font-medium text-foreground/80"
                  >
                    {r.short}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed text-muted-foreground">
              No spreadsheets, no obligation. Humans approve every decision; every
              action is logged.
            </p>
          </Reveal>
        </div>

        {/* ── Right: the form card ────────────────────────────────────────── */}
        <Reveal>
          <div className="home-glass home-glow-sm relative overflow-hidden rounded-2xl p-6 sm:p-8">
            <div
              aria-hidden
              className="home-mesh-soft pointer-events-none absolute inset-0 -z-10 opacity-70"
            />

            <AnimatePresence mode="wait" initial={false}>
              {submitted ? (
                <SuccessState
                  key="success"
                  reduced={!!reduced}
                  onReset={() => {
                    setSubmitted(false);
                    setServerError(null);
                  }}
                />
              ) : (
                <motion.form
                  key="form"
                  noValidate
                  onSubmit={onSubmit}
                  aria-label="Request a demo of Insure Auto"
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduced ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-5"
                >
                  {/* Name + Email */}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={ids.name}
                        className="mb-1.5 block text-sm font-medium text-foreground"
                      >
                        Name <span className="text-primary">*</span>
                      </label>
                      <input
                        id={ids.name}
                        type="text"
                        autoComplete="name"
                        placeholder="Jane Doe"
                        aria-required="true"
                        aria-invalid={!!errors.name || undefined}
                        aria-describedby={errors.name ? `${ids.name}-err` : undefined}
                        className={fieldClasses(!!errors.name)}
                        {...register("name")}
                      />
                      <FieldError id={`${ids.name}-err`} message={errors.name?.message} />
                    </div>

                    <div>
                      <label
                        htmlFor={ids.email}
                        className="mb-1.5 block text-sm font-medium text-foreground"
                      >
                        Work email <span className="text-primary">*</span>
                      </label>
                      <input
                        id={ids.email}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="jane@company.ae"
                        aria-required="true"
                        aria-invalid={!!errors.email || undefined}
                        aria-describedby={errors.email ? `${ids.email}-err` : undefined}
                        className={fieldClasses(!!errors.email)}
                        {...register("email")}
                      />
                      <FieldError id={`${ids.email}-err`} message={errors.email?.message} />
                    </div>
                  </div>

                  {/* Company + Role */}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={ids.company}
                        className="mb-1.5 block text-sm font-medium text-foreground"
                      >
                        Company{" "}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </label>
                      <input
                        id={ids.company}
                        type="text"
                        autoComplete="organization"
                        placeholder="Acme Insurance"
                        aria-invalid={!!errors.company || undefined}
                        aria-describedby={
                          errors.company ? `${ids.company}-err` : undefined
                        }
                        className={fieldClasses(!!errors.company)}
                        {...register("company")}
                      />
                      <FieldError
                        id={`${ids.company}-err`}
                        message={errors.company?.message}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={ids.role}
                        className="mb-1.5 block text-sm font-medium text-foreground"
                      >
                        Role{" "}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </label>
                      <input
                        id={ids.role}
                        type="text"
                        autoComplete="organization-title"
                        placeholder="Head of Underwriting"
                        aria-invalid={!!errors.role || undefined}
                        aria-describedby={errors.role ? `${ids.role}-err` : undefined}
                        className={fieldClasses(!!errors.role)}
                        {...register("role")}
                      />
                      <FieldError id={`${ids.role}-err`} message={errors.role?.message} />
                    </div>
                  </div>

                  {/* Interest select */}
                  <div>
                    <label
                      htmlFor={ids.interest}
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      I'm interested in <span className="text-primary">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id={ids.interest}
                        aria-required="true"
                        aria-invalid={!!errors.interest || undefined}
                        aria-describedby={
                          errors.interest ? `${ids.interest}-err` : undefined
                        }
                        className={cn(
                          fieldClasses(!!errors.interest),
                          "cursor-pointer appearance-none pr-10",
                        )}
                        {...register("interest")}
                      >
                        {INTEREST_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        aria-hidden
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      />
                    </div>
                    <FieldError
                      id={`${ids.interest}-err`}
                      message={errors.interest?.message}
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label
                      htmlFor={ids.message}
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      Message{" "}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <textarea
                      id={ids.message}
                      rows={4}
                      placeholder="Tell us about your submissions, volumes or timelines…"
                      aria-invalid={!!errors.message || undefined}
                      aria-describedby={
                        errors.message ? `${ids.message}-err` : undefined
                      }
                      className={cn(fieldClasses(!!errors.message), "resize-y")}
                      {...register("message")}
                    />
                    <FieldError
                      id={`${ids.message}-err`}
                      message={errors.message?.message}
                    />
                  </div>

                  {/* Server error (calm, inline, with retry via re-submit) */}
                  {serverError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground"
                    >
                      <AlertCircle
                        className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                        aria-hidden
                      />
                      <span>
                        {serverError}{" "}
                        <span className="text-muted-foreground">
                          Please try again.
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      "focus-ring group mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl",
                      "bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground",
                      "shadow-[0_8px_24px_-10px_hsl(var(--primary)_/_0.8)] transition-all duration-150",
                      "hover:brightness-110 hover:shadow-[0_12px_30px_-10px_hsl(var(--primary)_/_0.9)]",
                      "disabled:cursor-not-allowed disabled:opacity-70",
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Sending…
                      </>
                    ) : (
                      <>
                        Request a demo
                        <ArrowRight
                          className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-muted-foreground">
                    We'll reply within one business day. No spam, ever.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </SectionShell>
  );
}

/* ── Success state ────────────────────────────────────────────────────────── */
function SuccessState({
  reduced,
  onReset,
}: {
  reduced: boolean;
  onReset: () => void;
}) {
  return (
    <motion.div
      key="success"
      role="status"
      aria-live="polite"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, y: -12 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center gap-5 py-10 text-center"
    >
      <motion.span
        aria-hidden
        initial={reduced ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.05 }}
        className="home-glow flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/40"
      >
        <CheckCircle2 className="h-8 w-8" />
      </motion.span>

      <div className="space-y-2">
        <h3 className="font-brand text-2xl font-semibold text-foreground">
          Thanks — we'll be in touch
        </h3>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          Your request reached our team. Expect a reply within one business day to
          set up your walkthrough.
        </p>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="focus-ring inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/40 px-5 py-2.5 text-sm font-medium text-foreground transition-colors duration-150 hover:border-primary hover:text-primary"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
        Send another request
      </button>
    </motion.div>
  );
}

export default InterestSection;
