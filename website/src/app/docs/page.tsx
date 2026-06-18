import type { Metadata } from "next";
import { DocsSidebar } from "@/components/DocsSidebar";
import { CodeBlock } from "@/components/CodeBlock";
import { INTEGRATION, SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "시작하기",
  description: "Kcode 설치, API 키 설정, 모델 선택, 규칙 파일 가이드",
};

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
        <DocsSidebar />

        <article className="prose-kcode min-w-0">
          <h1 className="text-4xl font-bold tracking-tight">시작하기</h1>
          <p className="mt-4 text-lg text-muted">
            {SITE.name}({SITE.nameKo})를 설치하고 AI 기능을 설정하는 방법입니다.
          </p>

          <section id="install">
            <h2>설치</h2>
            <p>
              정식 빌드가 출시되면{" "}
              <a href={SITE.releasesUrl} target="_blank" rel="noopener noreferrer">
                GitHub Releases
              </a>
              에서 OS에 맞는 설치 파일을 받으세요. 개발 중에는 소스에서 직접
              빌드할 수 있습니다.
            </p>
            <CodeBlock title="개발 빌드 (Windows)">{`cd vscode-main
npm ci
npm run watch
# 새 터미널
.\\scripts\\code.bat`}</CodeBlock>
            <p>
              설치 후 데이터는 사용자 홈 디렉터리의{" "}
              <code>{SITE.dataFolder}</code> 폴더에 저장됩니다.
            </p>
          </section>

          <section id="api-key">
            <h2>API 키 설정</h2>
            <p>
              Kcode는 OpenAI, Anthropic 등 외부 LLM API를 사용합니다. API 키는
              에디터의 Secret Storage에 안전하게 저장됩니다.
            </p>
            <ol>
              <li>
                <code>Ctrl+,</code> (macOS: <code>Cmd+,</code>)로 설정을 엽니다.
              </li>
              <li>
                <strong>Kcode → AI</strong> 섹션으로 이동합니다.
              </li>
              <li>사용할 프로바이더의 API 키를 입력합니다.</li>
            </ol>
            <p>
              또는 딥링크로 설정 화면을 바로 열 수 있습니다 (에디터 등록 후):
            </p>
            <CodeBlock title="kcode:// 딥링크">{INTEGRATION.deepLinks.openSettings}</CodeBlock>
          </section>

          <section id="models">
            <h2>모델 선택</h2>
            <p>
              채팅 패널 상단의 모델 선택기에서 사용할 LLM을 전환할 수 있습니다.
              워크스페이스별로 기본 모델을 지정할 수도 있습니다.
            </p>
            <p>
              에디터는 공개 설정 엔드포인트에서 권장 모델 목록을 동기화할 수
              있습니다:
            </p>
            <CodeBlock title="GET /api/models.json">{`{
  "version": 1,
  "updatedAt": "2026-06-18T00:00:00Z",
  "models": [
    {
      "id": "gpt-4o",
      "provider": "openai",
      "label": "GPT-4o",
      "recommended": true
    },
    {
      "id": "claude-sonnet-4",
      "provider": "anthropic",
      "label": "Claude Sonnet 4"
    }
  ]
}`}</CodeBlock>
            <p>
              로컬 개발 시{" "}
              <a href={INTEGRATION.modelsEndpoint}>
                {INTEGRATION.modelsEndpoint}
              </a>
              에서 동일한 형식의 스텁 응답을 확인할 수 있습니다.
            </p>
          </section>

          <section id="rules">
            <h2>.kcode/rules/</h2>
            <p>
              프로젝트 루트에 <code>.kcode/rules/</code> 디렉터리를 만들면 AI
              에이전트에게 프로젝트별 지침을 제공할 수 있습니다. Cursor의{" "}
              <code>.cursor/rules/</code>와 유사한 개념입니다.
            </p>
            <CodeBlock title=".kcode/rules/typescript.md">{`# TypeScript 규칙

- strict 모드를 유지한다
- any 사용을 피한다
- 공개 API에는 JSDoc을 작성한다`}</CodeBlock>
            <p>
              규칙 파일을 에디터에서 바로 열려면:
            </p>
            <CodeBlock>{INTEGRATION.deepLinks.openRules}</CodeBlock>
          </section>

          <section id="integration">
            <h2>에디터 연동 (설계)</h2>
            <p>
              Kcode 웹사이트와 에디터는 다음 훅으로 연동됩니다. 현재는
              플레이스홀더이며, 에디터 Phase 4(배포·업데이트)에서 구현됩니다.
            </p>

            <h3>kcode:// 프로토콜</h3>
            <p>
              OS에 <code>{SITE.protocol}</code> 프로토콜 핸들러를 등록하면
              웹사이트 링크가 에디터를 직접 열 수 있습니다.
            </p>
            <ul>
              <li>
                <code>{INTEGRATION.deepLinks.openDocs}</code> — 문서 열기
              </li>
              <li>
                <code>{INTEGRATION.deepLinks.openSettings}</code> — AI 설정
              </li>
              <li>
                <code>{INTEGRATION.deepLinks.openRules}</code> — 규칙 폴더
              </li>
            </ul>

            <h3>업데이트 피드</h3>
            <p>
              에디터는 자동 업데이트를 위해 다음 URL의 JSON 피드를 폴링합니다
              (배포 후 실제 도메인으로 교체):
            </p>
            <CodeBlock>{INTEGRATION.updateFeedUrl}</CodeBlock>
            <CodeBlock title="updates.json 형식 (예정)">{`{
  "version": "0.1.0",
  "url": "https://github.com/sly22/kcode/releases/download/v0.1.0/",
  "name": "0.1.0",
  "notes": "첫 공개 프리뷰",
  "pub_date": "2026-06-18T00:00:00Z",
  "platforms": {
    "win32-x64": { "url": "...KcodeSetup-x64.exe" },
    "darwin-arm64": { "url": "...Kcode-darwin-arm64.dmg" },
    "linux-x64": { "url": "...Kcode-linux-x64.tar.gz" }
  }
}`}</CodeBlock>

            <h3>공개 설정 API</h3>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="py-2 pr-4">엔드포인트</th>
                  <th className="py-2">용도</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4 font-mono text-accent-blue">
                    GET {INTEGRATION.modelsEndpoint}
                  </td>
                  <td className="py-3">권장 LLM 모델 목록 동기화</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-mono text-accent-blue">
                    GET /api/updates.json
                  </td>
                  <td className="py-3">자동 업데이트 피드 (예정)</td>
                </tr>
              </tbody>
            </table>
          </section>
        </article>
      </div>
    </div>
  );
}
