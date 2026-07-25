"use client";

// High-contrast, presentational refusal/boundary card. Content is passed in;
// no strings hardcoded here.
export function BoundaryCard({ line, index }: { line: string; index: number }) {
  return (
    <li
      className="rounded-xl border border-primary/40 bg-surface-container-high px-5 py-4 text-headline-md leading-snug text-on-surface"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span aria-hidden="true" className="mr-2 text-primary">
        &ldquo;
      </span>
      {line}
    </li>
  );
}
