import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

const PERSONAS = [
  {
    href: "/recovery",
    title: "I'm in recovery",
    body: "Riding out a craving right now, or getting ahead of one. Two taps for words and grounding.",
    cta: "Open my space",
    icon: "dashboard_customize",
    accent: "primary",
  },
  {
    href: "/caregiver",
    title: "I'm supporting someone",
    body: "A hard moment with a loved one. Get the exact words, tone, and posture to steady it.",
    cta: "Open co-pilot",
    icon: "record_voice_over",
    accent: "secondary",
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col justify-center px-margin-mobile py-stack-lg md:px-margin-desktop">
      <div className="flex items-center gap-3">
        <Icon name="healing" className="text-3xl text-primary" />
        <span className="text-label-lg uppercase tracking-widest text-primary">
          HavenAI
        </span>
      </div>

      <h1 className="mt-4 text-headline-lg-mobile leading-tight text-on-surface md:text-headline-lg">
        Steady ground, one tap away.
      </h1>
      <p className="mt-4 max-w-xl text-body-lg text-on-surface-variant">
        A calm companion for the hardest minutes — for people in recovery from
        substance use, and for the people holding them up.
      </p>

      <div className="mt-stack-lg grid gap-4 md:grid-cols-2">
        {PERSONAS.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="group flex min-h-touch flex-col rounded-2xl border-2 border-outline-variant bg-surface-container p-6 transition-all hover:border-primary hover:bg-surface-container-high active:scale-[0.99] md:p-8"
          >
            <span
              className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl ${
                p.accent === "primary"
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary/20 text-secondary"
              }`}
            >
              <Icon name={p.icon} fill className="text-3xl" />
            </span>
            <h2 className="text-headline-md text-on-surface">{p.title}</h2>
            <p className="mt-2 flex-1 text-body-md text-on-surface-variant">
              {p.body}
            </p>
            <span
              className={`mt-4 inline-flex items-center gap-2 text-label-lg ${
                p.accent === "primary" ? "text-primary" : "text-secondary"
              }`}
            >
              {p.cta}
              <Icon name="arrow_forward" aria-hidden />
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-stack-lg text-sm text-on-surface-variant">
        <Icon name="emergency_home" className="mr-2 inline-block align-[-2px] text-error" />
        In immediate danger? Call or text{" "}
        <a href="tel:988" className="font-semibold text-on-surface underline underline-offset-4">
          988
        </a>{" "}
        (Suicide &amp; Crisis Lifeline) or{" "}
        <a href="tel:911" className="font-semibold text-on-surface underline underline-offset-4">
          911
        </a>
        .
      </p>
    </main>
  );
}
