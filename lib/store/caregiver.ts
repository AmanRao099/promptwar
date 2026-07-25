import { create } from "zustand";
import {
  parseCaregiverPartial,
  type PartialCaregiver,
} from "@/lib/client/partialParse";
import { streamRequest } from "@/lib/client/streamRequest";
import {
  caregiverScriptSchema,
  type CaregiverScript,
} from "@/lib/schemas/response";

export type CaregiverStatus =
  | "idle"
  | "streaming"
  | "done"
  | "crisis"
  | "error";

interface CaregiverState {
  tagId: string | null;
  note: string;
  status: CaregiverStatus;
  provider: string | null;
  partial: PartialCaregiver;
  final: CaregiverScript | null;
  crisisCategories: string[];
  setTag: (id: string) => void;
  setNote: (v: string) => void;
  reset: () => void;
  showEmergency: () => void;
  generate: () => Promise<void>;
}

const emptyPartial: PartialCaregiver = { sayThis: [], avoid: [] };

// Non-reactive: tracks the in-flight request so a new generate() or reset()
// can cancel a stale stream instead of racing it.
let inflight: AbortController | null = null;

export const useCaregiverStore = create<CaregiverState>((set, get) => ({
  tagId: null,
  note: "",
  status: "idle",
  provider: null,
  partial: emptyPartial,
  final: null,
  crisisCategories: [],

  setTag: (id) => set({ tagId: id }),
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
  },

  generate: async () => {
    const { tagId, note } = get();
    if (tagId == null) return;

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
      "/api/caregiver-copilot",
      { tagId, note: note.trim() ? note.trim() : undefined },
      {
        signal: controller.signal,
        onChunk: (acc) => set({ partial: parseCaregiverPartial(acc) }),
      },
    );
    if (inflight === controller) inflight = null;

    switch (result.outcome) {
      case "aborted":
        return;
      case "crisis":
        set({ status: "crisis", crisisCategories: result.crisisCategories });
        return;
      case "error":
        set({ status: "error" });
        return;
    }

    set({ provider: result.provider });

    try {
      const validated = caregiverScriptSchema.parse(JSON.parse(result.text));
      set({ final: validated, partial: validated, status: "done" });
    } catch {
      const p = get().partial;
      const usable = p.sayThis.length > 0 || p.avoid.length > 0;
      set({ status: usable ? "done" : "error" });
    }
  },
}));
