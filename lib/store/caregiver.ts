import { create } from "zustand";
import {
  parseCaregiverPartial,
  type PartialCaregiver,
} from "@/lib/client/partialParse";
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
  mode: "live" | "mock" | null;
  partial: PartialCaregiver;
  final: CaregiverScript | null;
  crisisCategories: string[];
  setTag: (id: string) => void;
  setNote: (v: string) => void;
  reset: () => void;
  generate: () => Promise<void>;
}

const emptyPartial: PartialCaregiver = { sayThis: [], avoid: [] };

export const useCaregiverStore = create<CaregiverState>((set, get) => ({
  tagId: null,
  note: "",
  status: "idle",
  mode: null,
  partial: emptyPartial,
  final: null,
  crisisCategories: [],

  setTag: (id) => set({ tagId: id }),
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
    const { tagId, note } = get();
    if (tagId == null) return;

    set({
      status: "streaming",
      partial: emptyPartial,
      final: null,
      crisisCategories: [],
      mode: null,
    });

    let res: Response;
    try {
      res = await fetch("/api/caregiver-copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tagId,
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
        set({ partial: parseCaregiverPartial(acc) });
      }
    } catch {
      set({ status: "error" });
      return;
    }

    try {
      const obj = JSON.parse(acc);
      const validated = caregiverScriptSchema.parse(obj);
      set({ final: validated, partial: validated, status: "done" });
    } catch {
      set({ status: "done" });
    }
  },
}));
