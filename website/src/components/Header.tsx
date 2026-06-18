import Link from "next/link";
import Image from "next/image";
import { SITE } from "@/lib/constants";

const navItems = [
  { href: "/", label: "홈" },
  { href: "/download", label: "다운로드" },
  { href: "/docs", label: "문서" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="Kcode logo" width={32} height={32} className="rounded-lg" />
          <span className="text-lg font-semibold tracking-tight">
            {SITE.name}
            <span className="ml-1.5 text-sm font-normal text-muted">{SITE.nameKo}</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-elevated hover:text-foreground">
              {item.label}
            </Link>
          ))}
          <a href={SITE.githubUrl} target="_blank" rel="noopener noreferrer" className="ml-2 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-elevated hover:text-foreground">
            GitHub
          </a>
        </nav>
        <Link href="/download" className="rounded-lg bg-gradient-to-r from-accent-blue to-accent-purple px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent-blue/20 transition-opacity hover:opacity-90">
          다운로드
        </Link>
      </div>
    </header>
  );
}
