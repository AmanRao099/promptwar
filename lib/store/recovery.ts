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
  mode: "live" | "mock" | null;
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

export const useRecoveryStore = create<RecoveryState>((set, get) => ({
  cravingValue: null,
  somaticId: null,
  note: "",
  status: "idle",
  mode: null,
  partial: emptyPartial,
  final: null,
  crisisCategories: [],

  setCraving: (v) => set({ cravingValue: v }),
  setSomatic: (id) => set({ somaticId: id }),
  setNote: (v) => set({ note: v }),

  reset: () =>
    set({
      status: "idle",
      mode: null,
      partial: emptyPartial,
      final: null,
      crisisCategories: [],
    }),

  generate: async () => {
    const { cravingValue, somaticId, note } = get();
    if (cravingValue == null || somaticId == null) return;

    set({
      status: "streaming",
      partial: emptyPartial,
      final: null,
      crisisCategories: [],
      mode: null,
    });

    let res: Response;
    try {
      res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cravingValue,
          somaticId,
          note: note.trim() ? note.trim() : undefined,
        }),
      });
    } catch {
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

    set({ mode: (res.headers.get("x-haven-mode") as "live" | "mock") ?? null });

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
    } catch {
      set({ status: "error" });
      return;
    }

    // Authoritative validate at end of stream.
    try {
      const obj = JSON.parse(acc);
      const validated = recoveryScriptSchema.parse(obj);
      set({ final: validated, partial: validated, status: "done" });
    } catch {
      // Keep whatever streamed cleanly; still usable, just mark done.
      set({ status: "done" });
    }
  },
}));
