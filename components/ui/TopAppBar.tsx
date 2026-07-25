import Link from "next/link";
import { Icon } from "./Icon";

// Sticky branded header shared by both dashboards. `status` shows a small live
// pill; `onEmergency` (optional) wires the emergency icon to open the overlay.
export function TopAppBar({
  title = "HavenAI",
  status,
  onEmergency,
}: {
  title?: string;
  status?: string;
  onEmergency?: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 flex w-full items-center justify-between border-b-2 border-outline-variant bg-surface/95 px-margin-mobile py-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80 md:px-margin-desktop">
      <Link href="/" className="flex items-center gap-3" aria-label="HavenAI home">
        <Icon name="healing" className="text-3xl text-primary" />
        <div className="flex flex-col">
          <span className="text-headline-md font-bold tracking-tight text-primary">
            {title}
          </span>
          {status && (
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
              <span className="text-label-lg text-xs uppercase tracking-widest text-secondary">
                {status}
              </span>
            </span>
          )}
        </div>
      </Link>

      <div className="flex items-center gap-3">
        <a
          href="tel:988"
          aria-label="Call or text 988, the Suicide and Crisis Lifeline"
          className="flex min-h-touch items-center rounded-lg bg-error-container px-3 text-sm font-bold text-on-error-container transition-transform active:scale-95"
        >
          988
        </a>
        {onEmergency && (
          <button
            type="button"
            onClick={onEmergency}
            aria-label="Open emergency help"
            className="flex min-h-touch min-w-touch items-center justify-center rounded-full transition-transform hover:bg-surface-container-highest active:scale-95"
          >
            <Icon name="emergency_home" className="text-3xl text-error" />
          </button>
        )}
      </div>
    </header>
  );
}
