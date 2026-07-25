import { create } from "zustand";
import {
  parseRecoveryPartial,
  type PartialRecovery,
} from "@/lib/client/partialParse";
import { streamRequest } from "@/lib/client/streamRequest";
import {
  recoveryScriptSchema,
  type RecoveryScript,
} from "@/lib/schemas/response";
import { logActivity } from "@/lib/store/auth";

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
  showEmergency: () => void;
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

  // Manual SOS — opens the hardcoded emergency overlay (no model involved).
  showEmergency: () => {
    inflight?.abort();
    inflight = null;
    set({ status: "crisis", crisisCategories: [] });
    logActivity("sos", { trigger: "manual" });
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

    const result = await streamRequest(
      "/api/generate-script",
      {
        cravingValue,
        somaticId,
        note: note.trim() ? note.trim() : undefined,
      },
      {
        signal: controller.signal,
        onChunk: (acc) => set({ partial: parseRecoveryPartial(acc) }),
      },
    );
    if (inflight === controller) inflight = null;

    switch (result.outcome) {
      case "aborted":
        return;
      case "crisis":
        set({ status: "crisis", crisisCategories: result.crisisCategories });
        logActivity("sos", {
          trigger: "crisis-detect",
          categories: result.crisisCategories.join(","),
        });
        return;
      case "error":
        set({ status: "error" });
        return;
    }

    set({ provider: result.provider });

    // Authoritative validate at end of stream.
    try {
      const validated = recoveryScriptSchema.parse(JSON.parse(result.text));
      set({ final: validated, partial: validated, status: "done" });
      logActivity("checkin", {
        cravingValue,
        somaticId,
        note: note.trim() || undefined,
      });
    } catch {
      // Fell short of a full valid document. If usable lines streamed, keep
      // them; otherwise surface an honest error + retry (no fake content).
      const p = get().partial;
      const usable = p.boundaryLines.length > 0 || p.grounding.steps.length > 0;
      set({ status: usable ? "done" : "error" });
    }
  },
}));
