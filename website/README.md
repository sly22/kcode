# Kcode Website

[Kcode](https://github.com/sly22/kcode)(케이코드) 공식 웹사이트 — AI 네이티브 코드 에디터 랜딩, 다운로드, 문서.

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- Dark theme (dev tool aesthetic)

## Quick Start

```bash
cd website
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | 개발 서버 (Turbopack) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 |
| `npm run lint` | ESLint |

## Pages

| Path | Description |
|------|-------------|
| `/` | 랜딩 — 히어로, 기능 소개, CTA |
| `/download` | Windows / macOS / Linux 다운로드 (GitHub Releases 연동 예정) |
| `/docs` | 시작하기 — 설치, API 키, 모델, `.kcode/rules/` |

## Editor Integration (Future)

웹사이트는 Kcode 에디터와 다음 방식으로 연동되도록 설계되어 있습니다.

### `kcode://` Deep Links

| URL | Action |
|-----|--------|
| `kcode://docs/getting-started` | 문서 열기 |
| `kcode://settings/ai` | AI 설정 패널 |
| `kcode://open?path=.kcode/rules` | 규칙 폴더 열기 |

에디터 `product.json`에 프로토콜 핸들러를 등록하면 웹 링크가 앱을 직접 실행합니다.

### Public API Stubs

| Endpoint | Purpose |
|----------|---------|
| `GET /api/models.json` | 권장 LLM 모델 목록 동기화 |
| `GET /api/updates.json` | 자동 업데이트 피드 (placeholder) |

에디터에서 설정 예시 (`settings.json` 또는 product override):

```json
{
  "kcode.models.syncUrl": "https://kcode.dev/api/models.json",
  "update.mode": "manual",
  "update.url": "https://kcode.dev/api/updates.json"
}
```

### Update Feed

`src/lib/constants.ts`의 `INTEGRATION.updateFeedUrl`에 프로덕션 URL을 설정합니다.
현재 placeholder: `https://kcode.dev/api/updates.json`

## Project Structure

```
website/
├── public/
│   └── logo.svg          # Kcode 로고 placeholder
├── src/
│   ├── app/
│   │   ├── api/          # 에디터 연동 API 스텁
│   │   ├── docs/
│   │   ├── download/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   └── lib/
│       └── constants.ts  # 브랜드·연동 상수
├── package.json
└── README.md
```

## Branding

- Product: **Kcode** (케이코드)
- Protocol: `kcode://`
- Data folder: `.kcode`
- GitHub: [github.com/sly22/kcode](https://github.com/sly22/kcode)
- Colors: dark bg `#0b0d14`, accent blue `#3b82f6`, purple `#8b5cf6`

## License

MIT — same as the Kcode editor project.
