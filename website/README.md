# Kcode Website

[Kcode](https://github.com/sly22/kcode)(케이코드) 공식 웹사이트 — AI 네이티브 코드 에디터 랜딩, 다운로드, 문서.

## Quick Start

```bash
cd website
npm install
npm run dev
```

브라우저에서 [http://localhost:3070](http://localhost:3070) 을 엽니다.

> Windows에서 Hyper-V/WSL 예약 포트(2970–3069) 때문에 **3000번 포트는 사용할 수 없습니다**. `npm run dev`는 **3070** 포트로 실행됩니다.

| Command | Description |
|---------|-------------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 |

## Pages

| Path | Description |
|------|-------------|
| `/` | 랜딩 — 히어로, 기능 소개, CTA |
| `/download` | Windows / macOS / Linux 다운로드 |
| `/docs` | 시작하기 — 설치, API 키, 모델, `.kcode/rules/` |

## Editor Integration (Future)

### `kcode://` Deep Links

| URL | Action |
|-----|--------|
| `kcode://docs/getting-started` | 문서 열기 |
| `kcode://settings/ai` | AI 설정 패널 |
| `kcode://open?path=.kcode/rules` | 규칙 폴더 열기 |

### Public API Stubs

| Endpoint | Purpose |
|----------|---------|
| `GET /api/models.json` | 권장 LLM 모델 목록 동기화 |
| `GET /api/updates.json` | 자동 업데이트 피드 (placeholder) |

에디터 설정 예시:

```json
{
  "kcode.models.syncUrl": "https://kcode.dev/api/models.json",
  "update.url": "https://kcode.dev/api/updates.json"
}
```

## Structure

```
website/
├── public/logo.svg
├── src/app/          # 페이지 + API 라우트
├── src/components/   # Header, Footer, FeatureCard 등
└── src/lib/constants.ts  # 브랜드·연동 상수
```

## Branding

- Product: **Kcode** (케이코드)
- Protocol: `kcode://`
- Data folder: `.kcode`
- GitHub: [github.com/sly22/kcode](https://github.com/sly22/kcode)
