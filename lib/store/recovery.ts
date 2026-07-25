import { create } from "zustand";
import {
  parseRecoveryPartial,
  type PartialRecovery,
} from "@/lib/client/partialParse";
import {
  recoveryScriptSchema,
  type RecoveryScript,
} from "@/lib/schemas/response";

export type RecoveryStatus =
  | "idle"
  | "streaming"
  | "done"
  | "crisis"
  | "error";

interface RecoveryState {
  cravingValue: number | null;
  somaticId: string | null;
  note: string;
  status: RecoveryStatus;
  provider: string | null;
  partial: PartialRecovery;
  final: RecoveryScript | null;
  crisisCategories: string[];
  setCraving: (v: number) => void;
  setSomatic: (id: string) => void;
  setNote: (v: string) => void;
  reset: () => void;
  generate: () => Promise<void>;
}

const emptyPartial: PartialRecovery = {
  boundaryLines: [],
  grounding: { steps: [] },
};

// Non-reactive: tracks the in-flight request so a new generate() or reset()
// can cancel a stale stream instead of racing it.
let inflight: AbortController | null = null;

export const useRecoveryStore = create<RecoveryState>((set, get) => ({
  cravingValue: null,
  somaticId: null,
  note: "",
  status: "idle",
  provider: null,
  partial: emptyPartial,
  final: null,
  crisisCategories: [],

  setCraving: (v) => set({ cravingValue: v }),
  setSomatic: (id) => set({ somaticId: id }),
  setNote: (v) => set({ note: v }),

  reset: () => {
    inflight?.abort();
    inflight = null;
    set({
      status: "idle",
      provider: null,
      partial: emptyPartial,
      final: null,
      crisisCategories: [],
    });
  },

  generate: async () => {
    const { cravingValue, somaticId, note } = get();
    if (cravingValue == null || somaticId == null) return;

    // Cancel any prior stream so rapid re-taps don't race.
    inflight?.abort();
    const controller = new AbortController();
    inflight = controller;

    set({
      status: "streaming",
      partial: emptyPartial,
      final: null,
      crisisCategories: [],
      provider: null,
    });

    let res: Response;
    try {
      res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          cravingValue,
          somaticId,
          note: note.trim() ? note.trim() : undefined,
        }),
      });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      set({ status: "error" });
      return;
    }

    if (!res.ok) {
      set({ status: "error" });
      return;
    }

    // Deterministic safety bypass — JSON, not a stream.
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = (await res.json()) as { crisis?: boolean; categories?: string[] };
      if (data.crisis) {
        set({ status: "crisis", crisisCategories: data.categories ?? [] });
        return;
      }
      set({ status: "error" });
      return;
    }

    set({ provider: res.headers.get("x-haven-provider") });

    if (!res.body) {
      set({ status: "error" });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        set({ partial: parseRecoveryPartial(acc) });
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      set({ status: "error" });
      return;
    } finally {
      if (inflight === controller) inflight = null;
    }

    // Authoritative validate at end of stream.
    try {
      const obj = JSON.parse(acc);
      const validated = recoveryScriptSchema.parse(obj);
      set({ final: validated, partial: validated, status: "done" });
    } catch {
      // Fell short of a full valid document. If usable lines streamed, keep
      // them; otherwise surface an honest error + retry (no fake content).
      const p = get().partial;
      const usable = p.boundaryLines.length > 0 || p.grounding.steps.length > 0;
      set({ status: usable ? "done" : "error" });
    }
  },
}));
