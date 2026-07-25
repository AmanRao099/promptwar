"use client";

import { useEffect, useState } from "react";

// Web Speech API audio grounding. Reads the grounding script aloud, slowly,
// so a person can close their eyes and follow. No typing, one tap.
export function AudioGroundingButton({ lines }: { lines: string[] }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!supported || lines.length === 0) return null;

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const speak = () => {
    window.speechSynthesis.cancel();
    setSpeaking(true);
    lines.forEach((line, i) => {
      const u = new SpeechSynthesisUtterance(line);
      u.rate = 0.85;
      u.pitch = 1;
      // Pause between steps by trailing punctuation; mark end on last line.
      if (i === lines.length - 1) u.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    });
  };

  return (
    <button
      type="button"
      onClick={speaking ? stop : speak}
      aria-pressed={speaking}
      aria-label={speaking ? "Stop the spoken grounding" : "Play the grounding aloud"}
      className="inline-flex min-h-touch items-center gap-3 rounded-xl border-2 border-haven-calm bg-haven-surface px-5 py-3 text-lg font-semibold text-haven-text transition hover:bg-haven-surfaceHi"
    >
      <span aria-hidden="true" className="text-2xl">
        {speaking ? "⏹" : "🔊"}
      </span>
      {speaking ? "Stop" : "Read it to me"}
    </button>
  );
}
