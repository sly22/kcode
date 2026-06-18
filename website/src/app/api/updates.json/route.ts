import { NextResponse } from "next/server";
import { INTEGRATION } from "@/lib/constants";

export async function GET() {
  const base = INTEGRATION.updateFeedUrl.replace("/api/updates.json", "");
  return NextResponse.json({
    version: "0.0.1-dev",
    url: "https://github.com/sly22/kcode/releases/tag/v0.0.1-dev",
    name: "0.0.1-dev",
    notes: "Phase 3 agent mode, @ picker, tab completion skeleton. 정식 빌드 준비 중.",
    pub_date: new Date().toUTCString(),
    platforms: {
      "win32-x64": { url: `${base}/download`, placeholder: true },
      "darwin-arm64": { url: `${base}/download`, placeholder: true },
      "darwin-x64": { url: `${base}/download`, placeholder: true },
      "linux-x64": { url: `${base}/download`, placeholder: true },
    },
  }, {
    headers: { "Cache-Control": "public, max-age=300", "Access-Control-Allow-Origin": "*" },
  });
}
