import { Button } from "@/components/Button";
import { FeatureCard } from "@/components/FeatureCard";
import { FEATURES, SITE } from "@/lib/constants";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="hero-glow relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center rounded-full border border-border bg-surface/80 px-4 py-1.5 text-xs text-muted backdrop-blur">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-accent-blue" />
              AI-native · Korean-first
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              <span className="gradient-text">{SITE.name}</span>
              <br />
              <span className="text-foreground">{SITE.tagline}</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted sm:text-xl">
              {SITE.description}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button href="/download">무료 다운로드</Button>
              <Button href="/docs" variant="secondary">
                시작하기
              </Button>
              <Button href={SITE.githubUrl} variant="ghost" external>
                GitHub →
              </Button>
            </div>
          </div>

          {/* Editor preview mockup */}
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-accent-purple/10">
              <div className="flex items-center gap-2 border-b border-border bg-surface-elevated px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-red-500/70" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
                <span className="h-3 w-3 rounded-full bg-green-500/70" />
                <span className="ml-3 font-mono text-xs text-muted">
                  kcode — main.ts
                </span>
              </div>
              <div className="grid gap-0 sm:grid-cols-5">
                <div className="hidden border-r border-border bg-background p-4 sm:col-span-1 sm:block">
                  <div className="space-y-2">
                    {["src", "lib", ".kcode"].map((dir) => (
                      <div key={dir} className="font-mono text-xs text-muted">
                        {dir}/
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-span-3 p-4 font-mono text-sm leading-relaxed sm:col-span-3">
                  <p>
                    <span className="text-accent-purple">async function</span>{" "}
                    <span className="text-accent-blue">main</span>
                    <span className="text-muted">() {"{"}</span>
                  </p>
                  <p className="pl-4 text-muted">
                    <span className="text-accent-purple">const</span> result ={" "}
                    <span className="text-accent-blue">await</span> agent.run(
                  </p>
                  <p className="pl-8 text-green-400/80">
                    &quot;리팩터링해 줘&quot;
                  </p>
                  <p className="pl-4 text-muted">);</p>
                  <p className="text-muted">{"}"}</p>
                  <p className="mt-2 text-muted/50">
                    <span className="text-muted/30">// Tab → 자동완성 제안</span>
                  </p>
                </div>
                <div className="border-t border-border bg-surface-elevated p-4 sm:col-span-1 sm:border-t-0 sm:border-l">
                  <p className="mb-2 text-xs font-medium text-accent-purple">
                    Kcode Chat
                  </p>
                  <p className="text-xs leading-relaxed text-muted">
                    이 함수를 에러 핸들링과 함께 리팩터링할까요?
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/60 bg-surface/30 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              개발에 필요한 AI, 한곳에
            </h2>
            <p className="mt-4 text-muted">
              채팅부터 에이전트까지 — 워크플로를 끊지 않는 AI 기능
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.id} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface-elevated to-surface p-12 text-center">
            <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/5 to-accent-purple/5" />
            <div className="relative">
              <h2 className="text-3xl font-bold">지금 바로 시작하세요</h2>
              <p className="mx-auto mt-4 max-w-xl text-muted">
                Windows, macOS, Linux용 빌드가 준비되면 GitHub Releases에서
                다운로드할 수 있습니다.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button href="/download">다운로드 페이지</Button>
                <Button href="/docs" variant="secondary">
                  설치 가이드 보기
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
