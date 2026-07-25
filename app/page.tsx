import Link from "next/link";

const PERSONAS = [
  {
    href: "/recovery",
    title: "I'm in recovery",
    body: "Riding out a craving right now, or getting ahead of one. Two taps for words and grounding.",
    cta: "Open my space",
    ready: true,
  },
  {
    href: "/caregiver",
    title: "I'm supporting someone",
    body: "A hard moment with a loved one. Get the exact words, tone, and posture to steady it.",
    cta: "Open co-pilot",
    ready: true,
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-4 py-12">
      <p className="text-sm font-bold uppercase tracking-widest text-haven-accent">
        HavenAI
      </p>
      <h1 className="mt-2 text-4xl font-bold leading-tight text-haven-text sm:text-5xl">
        Steady ground, one tap away.
      </h1>
      <p className="mt-4 max-w-xl text-xl text-haven-muted">
        A calm companion for the hardest minutes — for people in recovery from
        substance use, and for the people holding them up.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {PERSONAS.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="group flex min-h-touch flex-col rounded-2xl border border-haven-border bg-haven-surface p-6 transition hover:border-haven-accent hover:bg-haven-surfaceHi"
          >
            <h2 className="text-2xl font-bold text-haven-text">{p.title}</h2>
            <p className="mt-2 flex-1 text-base text-haven-muted">{p.body}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-lg font-semibold text-haven-accent">
              {p.cta}
              {!p.ready && (
                <span className="rounded bg-haven-surfaceHi px-2 py-0.5 text-xs font-medium text-haven-muted">
                  soon
                </span>
              )}
              <span aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-sm text-haven-muted">
        In immediate danger? Call or text <strong className="text-haven-text">988</strong>{" "}
        (Suicide &amp; Crisis Lifeline) or <strong className="text-haven-text">911</strong>.
      </p>
    </main>
  );
}
