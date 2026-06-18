# Kcode

VSCode 소스를 기반으로 한 AI 네이티브 코드 에디터.

- **제품명**: Kcode (케이코드)
- **GitHub**: [sly21/kcode](https://github.com/sly21/kcode)
- **Upstream**: [microsoft/vscode](https://github.com/microsoft/vscode)

## 빠른 시작

### 1. VSCode 소스 준비

```powershell
.\scripts\setup-vscode.ps1
.\scripts\apply-kcode-rebranding.ps1
cd vscode-main\vscode-main
npm ci
npm run watch
```

### 2. 개발 실행 (Windows)

```powershell
cd vscode-main\vscode-main
.\scripts\code.bat
```

## 프로젝트 구조

```
kcode/
├── .cursor/rules/     # Cursor AI 가이드 (로드맵·아키텍처·리브랜딩)
├── branding/          # product.json 및 리브랜딩 오버라이드
├── scripts/           # 셋업·빌드·리브랜딩 스크립트
└── vscode-main/       # VSCode upstream (gitignore, 로컬 clone)
```

## 로드맵

| Phase | 내용 |
| ----- | ---- |
| 0 | 환경 셋업 |
| 1 | 리브랜딩 (product.json, 아이콘) |
| 2 | AI 골격 (채팅 Service, LLM 어댑터) |
| 3 | Ask / Ctrl+K / 에이전트 / Tab 완성 |
| 4 | 배포·업데이트 |
| 5 | 한국어 UX, MCP, 커스텀 룰 |

자세한 계획은 `.cursor/rules/kcode-roadmap.mdc` 참고.

## 라이선스

VSCode upstream: MIT. Kcode 고유 코드: MIT (예정).
