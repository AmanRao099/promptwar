import { NextRequest } from "next/server";
import {
  generateScriptRequestSchema,
  type GenerateScriptRequest,
} from "@/lib/schemas/request";
import { refusalSystemPrompt, buildRecoveryUserTurn } from "@/lib/prompts";
import { buildRecoveryMock } from "@/lib/genai/mocks";
import { handleScriptRoute } from "@/lib/http/streamRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(req: NextRequest) {
  return handleScriptRoute<GenerateScriptRequest>(req, {
    scope: "generate-script",
    schema: generateScriptRequestSchema,
    systemPrompt: refusalSystemPrompt,
    getNote: (d) => d.note,
    buildUserTurn: (d, scrubbedNote) =>
      buildRecoveryUserTurn({
        cravingValue: d.cravingValue,
        somaticId: d.somaticId,
        scrubbedNote,
      }),
    buildMock: (d) =>
      buildRecoveryMock({ cravingValue: d.cravingValue, somaticId: d.somaticId }),
  });
}
