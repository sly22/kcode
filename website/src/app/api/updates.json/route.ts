import { NextResponse } from "next/server";
import { INTEGRATION } from "@/lib/constants";

/**
 * 자동 업데이트 피드 스텁 (에디터 Phase 4 연동용).
 */
export async function GET() {
  const payload = {
    version: "0.0.0-dev",
    url: "https://github.com/sly22/kcode/releases",
    name: "0.0.0-dev",
    notes: "정식 빌드 준비 중입니다.",
    pub_date: new Date().toUTCString(),
    platforms: {
      "win32-x64": {
        url: `${INTEGRATION.updateFeedUrl.replace("/api/updates.json", "")}/download`,
        placeholder: true,
      },
      "darwin-arm64": {
        url: `${INTEGRATION.updateFeedUrl.replace("/api/updates.json", "")}/download`,
        placeholder: true,
      },
      "darwin-x64": {
        url: `${INTEGRATION.updateFeedUrl.replace("/api/updates.json", "")}/download`,
        placeholder: true,
      },
      "linux-x64": {
        url: `${INTEGRATION.updateFeedUrl.replace("/api/updates.json", "")}/download`,
        placeholder: true,
      },
    },
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
