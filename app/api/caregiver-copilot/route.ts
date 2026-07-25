import { NextRequest } from "next/server";
import {
  caregiverRequestSchema,
  type CaregiverRequest,
} from "@/lib/schemas/request";
import { caregiverSystemPrompt, buildCaregiverUserTurn } from "@/lib/prompts";
import { handleScriptRoute } from "@/lib/http/streamRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(req: NextRequest) {
  return handleScriptRoute<CaregiverRequest>(req, {
    scope: "caregiver-copilot",
    schema: caregiverRequestSchema,
    systemPrompt: caregiverSystemPrompt,
    getNote: (d) => d.note,
    buildUserTurn: (d, scrubbedNote) =>
      buildCaregiverUserTurn({ tagId: d.tagId, scrubbedNote }),
  });
}
