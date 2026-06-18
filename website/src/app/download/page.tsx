import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { DOWNLOADS, SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "다운로드",
  description: "Kcode 에디터를 Windows, macOS, Linux에 설치하세요.",
};

const platformIcons: Record<string, React.ReactNode> = {
  windows: (<svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5.5L10.5 4.4v7.1H3V5.5zm0 13V11.5h7.5V20.6L3 18.5zM11.25 4.2L21 2.5v9.2h-9.75V4.2zm0 17.3V12.7H21V22l-9.75-0.5z" /></svg>),
  apple: (<svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>),
  linux: (<svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor"><path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.183-.135a.214.214 0 00-.157-.051c-.066.008-.136.02-.199.064-.592.359-1.345.535-2.112.535-.639 0-1.254-.125-1.844-.4h-.006c-.064-.028-.133-.06-.199-.09-.741-.33-1.464-.68-2.17-1.01-1.456-.7-2.83-1.36-3.87-2.36-.522-.49-1.002-1.06-1.324-1.77-.306-.68-.45-1.44-.392-2.21.07-.93.45-1.84 1.064-2.63.48-.62 1.09-1.15 1.77-1.5.68-.35 1.43-.52 2.19-.52.38 0 .76.05 1.13.15.37.1.73.25 1.07.45.34.2.66.45.95.75.29.3.55.65.77 1.02.22.37.4.77.54 1.19.14.42.24.86.3 1.31.06.45.08.91.06 1.37-.02.46-.08.92-.18 1.37-.1.45-.24.89-.42 1.31-.18.42-.4.82-.66 1.19-.26.37-.56.71-.89 1.01-.33.3-.69.56-1.07.78-.38.22-.78.4-1.2.54-.42.14-.86.24-1.31.3-.45.06-.91.08-1.37.06z" /></svg>),
};

export default function DownloadPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">다운로드</h1>
        <p className="mt-4 text-lg text-muted">{SITE.name}를 사용하는 OS를 선택하세요. 정식 빌드는 GitHub Releases에서 배포됩니다.</p>
      </div>
      <div className="mx-auto mt-16 grid max-w-4xl gap-6">
        {DOWNLOADS.map((item) => (
          <div key={item.platform} className="card-glow flex flex-col items-start gap-6 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-surface-elevated p-3 text-accent-blue">{platformIcons[item.icon]}</div>
              <div>
                <h2 className="text-xl font-semibold">{item.platform}</h2>
                <p className="text-sm text-muted">{item.arch}</p>
                <p className="mt-1 font-mono text-xs text-muted/70">{item.filename}</p>
              </div>
            </div>
            <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
              <span className="rounded-lg border border-border bg-surface px-4 py-2.5 text-center text-sm text-muted">{item.note}</span>
              <Button href={SITE.releasesUrl} variant="ghost" external>Releases 확인 →</Button>
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-border bg-surface p-8">
        <h2 className="text-lg font-semibold">소스에서 빌드</h2>
        <p className="mt-2 text-sm text-muted">정식 빌드 전에 개발 버전을 직접 빌드할 수 있습니다.</p>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-background p-4 font-mono text-sm leading-relaxed text-muted">{`git clone https://github.com/sly22/kcode.git
cd kcode/vscode-main
npm ci
npm run watch
# 다른 터미널에서
./scripts/code.bat   # Windows
./scripts/code.sh    # macOS / Linux`}</pre>
        <div className="mt-6"><Button href={SITE.githubUrl} variant="secondary" external>저장소 열기</Button></div>
      </div>
    </div>
  );
}
