"use client";

import { useEffect, useRef, useState } from "react";
import { parseVoicePartial, type PartialVoice } from "@/lib/client/partialParse";
import { streamRequest } from "@/lib/client/streamRequest";
import { voiceReplySchema } from "@/lib/schemas/response";
import { useRecoveryStore } from "@/lib/store/recovery";
import { logActivity } from "@/lib/store/auth";
import { ErrorRetry } from "@/components/ErrorRetry";
import { Icon } from "@/components/ui/Icon";

type VoiceStatus = "idle" | "listening" | "streaming" | "done" | "error";

const emptyReply: PartialVoice = { guidance: [] };

function getRecognitionCtor() {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

// Voice check-in: speak what's happening -> transcript runs the same pipeline
// as typed input (crisis bypass, PII scrub, live LLM) -> reply is shown and
// read back aloud. Hidden entirely when the browser lacks SpeechRecognition.
export function VoiceChat() {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState<PartialVoice>(emptyReply);
  const showEmergency = useRecoveryStore((s) => s.showEmergency);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Live transcript accumulator (state lags recognition events).
  const heardRef = useRef("");
  // True between start() and the onend that should trigger submission —
  // avoids side effects inside setState updaters (StrictMode double-invoke).
  const listeningRef = useRef(false);

  useEffect(() => {
    setSupported(Boolean(getRecognitionCtor()));
    return () => {
      recognitionRef.current?.abort();
      abortRef.current?.abort();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!supported) return null;

  const speak = (lines: string[]) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    for (const line of lines) {
      const u = new SpeechSynthesisUtterance(line);
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  };

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setStatus("idle");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("streaming");
    setReply(emptyReply);

    const result = await streamRequest(
      "/api/voice-support",
      { transcript: trimmed },
      {
        signal: controller.signal,
        onChunk: (acc) => setReply(parseVoicePartial(acc)),
      },
    );

    switch (result.outcome) {
      case "aborted":
        return;
      case "crisis":
        // Deterministic crisis bypass — spoken emergencies open the overlay.
        setStatus("idle");
        showEmergency();
        return;
      case "error":
        setStatus("error");
        return;
    }

    try {
      const validated = voiceReplySchema.parse(JSON.parse(result.text));
      setReply(validated);
      setStatus("done");
      logActivity("voice", { transcript: trimmed });
      // Voice in -> voice out: read the reply back.
      speak([validated.reflection, ...validated.guidance, validated.affirmation]);
    } catch {
      const p = parseVoicePartial(result.text);
      const usable = Boolean(p.reflection) || p.guidance.length > 0;
      setStatus(usable ? "done" : "error");
    }
  };

  const startListening = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    window.speechSynthesis?.cancel();
    const rec = new Ctor();
    recognitionRef.current = rec;
    heardRef.current = "";
    setTranscript("");
    setReply(emptyReply);
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      let full = "";
      for (let i = 0; i < ev.results.length; i++) {
        full += ev.results[i][0].transcript;
      }
      heardRef.current = full;
      setTranscript(full);
    };
    rec.onerror = () => {
      listeningRef.current = false;
      setStatus("idle");
    };
    rec.onend = () => {
      // Fires on manual stop AND on browser auto-stop (silence timeout).
      if (!listeningRef.current) return;
      listeningRef.current = false;
      void submit(heardRef.current);
    };
    listeningRef.current = true;
    setStatus("listening");
    rec.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop(); // onend handles submission
  };

  const listening = status === "listening";
  const busy = status === "streaming";

  return (
    <section
      aria-label="Voice check-in"
      className="rounded-2xl border-2 border-outline-variant bg-surface-container p-6 md:p-8"
    >
      <div className="flex flex-col items-center text-center">
        <h2 className="text-headline-md text-on-surface">Or just talk</h2>
        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          disabled={busy}
          aria-pressed={listening}
          aria-label={listening ? "Stop listening and get support" : "Start talking"}
          className={[
            "mt-6 flex h-28 w-28 items-center justify-center rounded-full border-2 transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-30",
            listening
              ? "animate-pulse-red border-error bg-error/20 text-error"
              : "border-primary bg-primary/15 text-primary hover:bg-primary/25",
          ].join(" ")}
        >
          <Icon name={listening ? "stop" : "record_voice_over"} className="text-5xl" />
        </button>
        <p className="mt-4 text-label-lg text-on-surface">
          {listening ? "Listening — tap to finish" : "Tap and say what's happening"}
        </p>
        <p className="mt-1 max-w-md text-sm text-on-surface-variant">
          Private — personal details are scrubbed before anything is processed.
        </p>
      </div>

      {(listening || transcript) && (
        <p
          aria-live="polite"
          className="mt-4 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md text-on-surface"
        >
          {transcript || <span className="text-on-surface-variant">Listening…</span>}
          {listening && <span className="ml-1 animate-pulse text-error">●</span>}
        </p>
      )}

      {busy && (
        <p className="mt-4 flex items-center gap-2 text-body-md text-on-surface-variant">
          <Icon name="hourglass_top" className="animate-spin" />
          Thinking it through with you…
        </p>
      )}

      {status === "error" && (
        <div className="mt-4">
          <ErrorRetry onRetry={() => void submit(heardRef.current)} />
        </div>
      )}

      {(reply.reflection || reply.guidance.length > 0) && (
        <div aria-live="polite" className="mt-6 space-y-4">
          {reply.reflection && (
            <p className="text-body-lg text-on-surface">{reply.reflection}</p>
          )}
          {reply.guidance.length > 0 && (
            <ol className="space-y-2">
              {reply.guidance.map((step, i) => (
                <li
                  key={i}
                  className="flex gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md text-on-surface"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary"
                  >
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
          {reply.affirmation && (
            <p className="border-l-4 border-primary pl-4 text-body-md font-medium italic text-on-surface">
              {reply.affirmation}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
