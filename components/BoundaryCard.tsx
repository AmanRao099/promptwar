"use client";

// High-contrast, presentational refusal/boundary card. Content is passed in;
// no strings hardcoded here.
export function BoundaryCard({ line, index }: { line: string; index: number }) {
  return (
    <li
      className="rounded-xl border-2 border-haven-accent bg-haven-surfaceHi px-5 py-4 text-xl font-bold leading-snug text-haven-text"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span aria-hidden="true" className="mr-2 text-haven-accent">
        &ldquo;
      </span>
      {line}
    </li>
  );
}
