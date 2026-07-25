"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth";
import { cravingLevels } from "@/lib/config/craving";
import { somaticPoints } from "@/lib/config/somatic";
import { Icon } from "@/components/ui/Icon";

interface FeedEvent {
  id: number;
  user_email: string;
  type: "checkin" | "voice" | "sos" | "location";
  payload: Record<string, unknown>;
  created_at: string;
}

const TYPE_META: Record<FeedEvent["type"], { icon: string; label: string; tone: string }> = {
  sos: { icon: "sos", label: "SOS", tone: "text-error" },
  location: { icon: "location_on", label: "Location shared", tone: "text-error" },
  checkin: { icon: "dashboard_customize", label: "Check-in", tone: "text-primary" },
  voice: { icon: "record_voice_over", label: "Voice check-in", tone: "text-secondary" },
};

function describe(e: FeedEvent): string {
  if (e.type === "checkin") {
    const lvl = cravingLevels.find((c) => c.value === e.payload.cravingValue);
    const spot = somaticPoints.find((p) => p.id === e.payload.somaticId);
    const bits = [
      lvl ? `craving ${lvl.value}/5 (${lvl.label})` : null,
      spot ? `felt in ${spot.label.toLowerCase()}` : null,
      typeof e.payload.note === "string" ? `note: "${e.payload.note}"` : null,
    ].filter(Boolean);
    return bits.join(" · ") || "Check-in";
  }
  if (e.type === "voice") {
    return typeof e.payload.transcript === "string"
      ? `"${e.payload.transcript}"`
      : "Spoke to the companion";
  }
  if (e.type === "sos") {
    return e.payload.trigger === "crisis-detect"
      ? `Crisis language detected (${String(e.payload.categories ?? "")})`
      : "Opened the emergency screen";
  }
  return "";
}

// Caretaker home: link a loved one by their share code, then follow their
// check-ins, SOS alerts, and shared live locations.
export function CaretakerFeed() {
  const { user, loaded, refresh } = useAuthStore();
  const [events, setEvents] = useState<FeedEvent[] | null>(null);
  const [code, setCode] = useState("");
  const [linkMsg, setLinkMsg] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/feed", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setEvents(data.events);
    } catch {
      /* keep whatever we had */
    }
  }, []);

  useEffect(() => {
    if (!loaded) void refresh();
  }, [loaded, refresh]);

  useEffect(() => {
    if (user?.role === "caretaker") {
      void loadFeed();
      // Light polling keeps SOS/location fresh without extra infra.
      const t = setInterval(loadFeed, 15000);
      return () => clearInterval(t);
    }
  }, [user?.role, loadFeed]);

  if (!loaded) return null;

  if (!user || user.role !== "caretaker") {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-container-low px-6 py-4 text-sm text-on-surface-variant">
        <Link href="/login" className="font-semibold text-secondary underline underline-offset-4">
          Sign in as a caretaker
        </Link>{" "}
        to follow your loved one&apos;s check-ins, SOS alerts, and shared locations.
      </div>
    );
  }

  const link = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkMsg(null);
    const res = await fetch("/api/link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (res.ok) {
      setLinkMsg(`Linked with ${data.linked.email}.`);
      setCode("");
      await refresh();
      await loadFeed();
    } else {
      setLinkMsg(
        data.error === "code_not_found"
          ? "No account matches that code."
          : "Enter the 6-character code from their recovery screen.",
      );
    }
  };

  return (
    <section aria-label="Your loved ones" className="space-y-stack-md">
      <div className="rounded-2xl border-2 border-outline-variant bg-surface-container p-6">
        <h2 className="text-headline-md text-on-surface">Your loved ones</h2>
        {user.linked && user.linked.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {user.linked.map((u) => (
              <li
                key={u.id}
                className="rounded-full border border-outline-variant bg-surface-container-low px-4 py-1.5 text-sm text-on-surface"
              >
                {u.email}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-on-surface-variant">
            No one linked yet. Ask them for the caretaker code on their recovery
            screen.
          </p>
        )}

        <form onSubmit={link} className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="link-code" className="sr-only">
            Caretaker code
          </label>
          <input
            id="link-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="w-36 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 font-mono text-lg uppercase tracking-[0.2em] text-on-surface placeholder:text-on-surface-variant/50 focus:border-secondary"
          />
          <button
            type="submit"
            disabled={code.length !== 6}
            className="min-h-touch rounded-xl bg-secondary px-5 py-3 text-label-lg font-semibold text-on-secondary transition-all active:scale-95 disabled:opacity-30"
          >
            Link
          </button>
          {linkMsg && <p className="text-sm text-on-surface-variant">{linkMsg}</p>}
        </form>
      </div>

      <div className="rounded-2xl border-2 border-outline-variant bg-surface-container p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-md text-on-surface">Activity</h2>
          <button
            type="button"
            onClick={loadFeed}
            aria-label="Refresh activity"
            className="flex min-h-touch min-w-touch items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high"
          >
            <Icon name="refresh" />
          </button>
        </div>

        {!events || events.length === 0 ? (
          <p className="mt-3 text-sm text-on-surface-variant">
            Nothing yet. Check-ins, SOS alerts, and shared locations appear here
            the moment they happen.
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {events.map((e) => {
              const meta = TYPE_META[e.type];
              const urgent = e.type === "sos" || e.type === "location";
              return (
                <li
                  key={e.id}
                  className={[
                    "flex items-start gap-3 rounded-xl border px-4 py-3",
                    urgent
                      ? "border-error/60 bg-error/10"
                      : "border-outline-variant bg-surface-container-low",
                  ].join(" ")}
                >
                  <Icon name={meta.icon} className={`mt-0.5 shrink-0 ${meta.tone}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface">
                      {meta.label} — {e.user_email}
                      <span className="ml-2 font-normal text-on-surface-variant">
                        {e.created_at} UTC
                      </span>
                    </p>
                    {e.type === "location" ? (
                      <a
                        href={`https://maps.google.com/?q=${e.payload.lat},${e.payload.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-error underline underline-offset-4"
                      >
                        Open live location in Maps ({String(e.payload.lat)},{" "}
                        {String(e.payload.lng)})
                      </a>
                    ) : (
                      <p className="break-words text-sm text-on-surface-variant">
                        {describe(e)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
