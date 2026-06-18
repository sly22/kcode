import { NextResponse } from "next/server";

/**
 * Kcode 에디터가 동기화할 권장 모델 목록 스텁.
 * 배포 시 CDN 또는 정적 JSON으로 대체 가능.
 */
export async function GET() {
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    models: [
      {
        id: "gpt-4o",
        provider: "openai",
        label: "GPT-4o",
        description: "범용 고성능 모델",
        recommended: true,
        capabilities: ["chat", "inline", "agent"],
      },
      {
        id: "gpt-4o-mini",
        provider: "openai",
        label: "GPT-4o mini",
        description: "빠른 응답, 저비용",
        capabilities: ["chat", "inline", "completion"],
      },
      {
        id: "claude-sonnet-4",
        provider: "anthropic",
        label: "Claude Sonnet 4",
        description: "코딩·추론에 강함",
        recommended: true,
        capabilities: ["chat", "inline", "agent"],
      },
      {
        id: "claude-haiku",
        provider: "anthropic",
        label: "Claude Haiku",
        description: "경량·저지연",
        capabilities: ["chat", "completion"],
      },
      {
        id: "local-llm",
        provider: "ollama",
        label: "로컬 LLM (Ollama)",
        description: "오프라인·프라이버시",
        capabilities: ["chat", "inline"],
      },
    ],
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
