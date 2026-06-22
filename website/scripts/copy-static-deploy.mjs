import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "out");
const deployDir = join(root, "static-deploy");

if (!existsSync(outDir)) {
  console.error("out/ 폴더가 없습니다. 먼저 next build 를 실행하세요.");
  process.exit(1);
}

if (existsSync(deployDir)) {
  rmSync(deployDir, { recursive: true, force: true });
}

mkdirSync(deployDir, { recursive: true });
cpSync(outDir, deployDir, { recursive: true });

const readme = `# Kcode 정적 사이트 (업로드용)

이 폴더 전체를 웹 호스팅 루트(document root)에 업로드하세요.

## 구조

- index.html — 메인 랜딩
- download/index.html — 다운로드
- docs/index.html — 시작하기 문서
- logo.svg — 로고
- api/models.json, api/updates.json — 에디터 연동 API
- _next/ — CSS·JS·폰트 에셋

## 업로드 방법

1. FTP/SFTP 또는 호스팅 파일 관리자로 \`static-deploy/\` **안의 파일**을 서버 루트에 복사
2. 또는 zip으로 압축 후 호스팅에 업로드·압축 해제

## 로컬 미리보기

\`\`\`bash
npx serve static-deploy
\`\`\`

## 재빌드

\`\`\`bash
npm run build:static
\`\`\`
`;

cpSync(join(root, "public", "logo.svg"), join(deployDir, "logo.svg"), { force: true });

writeFileSync(join(deployDir, "README.txt"), readme, "utf8");

console.log(`✓ static-deploy/ 준비 완료 (${deployDir})`);
