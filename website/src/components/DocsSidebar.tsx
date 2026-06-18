import Link from "next/link";

const sections = [
  { id: "install", label: "설치" },
  { id: "api-key", label: "API 키 설정" },
  { id: "models", label: "모델 선택" },
  { id: "rules", label: ".kcode/rules/" },
  { id: "integration", label: "에디터 연동" },
];

export function DocsSidebar() {
  return (
    <aside className="hidden lg:block">
      <nav className="sticky top-24 space-y-1">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">시작하기</p>
        {sections.map((section) => (
          <Link key={section.id} href={`/docs#${section.id}`} className="block rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-elevated hover:text-foreground">
            {section.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
