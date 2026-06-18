import Link from "next/link";
import { SITE, INTEGRATION } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-surface/50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="text-lg font-semibold">{SITE.name}</p>
            <p className="mt-2 text-sm text-muted">{SITE.tagline}</p>
            <p className="mt-1 text-xs text-muted/70">{SITE.taglineEn}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">링크</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><Link href="/download" className="hover:text-foreground">다운로드</Link></li>
              <li><Link href="/docs" className="hover:text-foreground">시작하기</Link></li>
              <li><a href={SITE.githubUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">GitHub</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">에디터 연동</p>
            <ul className="mt-3 space-y-2 font-mono text-xs text-muted">
              <li><span className="text-accent-purple">{SITE.protocol}</span> 프로토콜</li>
              <li><code className="text-accent-blue">{INTEGRATION.modelsEndpoint}</code></li>
              <li className="break-all"><code className="text-accent-blue">{INTEGRATION.updateFeedUrl}</code></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Kcode. MIT License.</p>
          <p>데이터 폴더: <code className="text-foreground">{SITE.dataFolder}</code></p>
        </div>
      </div>
    </footer>
  );
}
