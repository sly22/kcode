# Kcode

VSCode 소스를 기반으로 한 AI 네이티브 코드 에디터.

- **제품명**: Kcode (케이코드)
- **GitHub**: [sly22/kcode](https://github.com/sly22/kcode)
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

루트에서 Kcode 래퍼를 사용하거나 upstream 스크립트를 직접 호출합니다.

```powershell
.\scripts\code.bat
# 또는
cd vscode-main\vscode-main
.\scripts\code.bat
```

### 4. Kcode AI 기능 (Phase 3)

| 기능 | 단축키 / UI |
| ---- | ----------- |
| 채팅 | 보조 사이드바 **Kcode Chat**, `Ctrl+Shift+L` |
| 인라인 편집 | 코드 선택 후 `Ctrl+K` → 적용/취소 확인 |
| Agent mode | 채팅 툴바 **Agent mode** — read_file/search/terminal, 채팅 UI 승인 (Reject 시 배치 스킵) |
| @ 멘션 | `@path/to/file.ts`, `@symbol:Name`, `@docs`, `@web` + `@` 입력 시 피커 |
| Tab 완성 | LLM 고스트 텍스트 (`kcode.completion.enabled`, `kcode.privacy.sendCode` 필요) |
| 워크스페이스 룰 | `.kcode/rules/*.md` — 채팅 시스템 프롬프트에 자동 주입 |
| 업데이트 체크 | 시작 30초 후 `kcode.update.feedUrl` 피드 확인 (기본 `https://kcode.dev/api/updates.json`) |
| 컨텍스트 첨부 | Attach file / selection / terminal / problems |

### 5. API 키 설정

Kcode 실행 후 명령 팔레트(Ctrl+Shift+P):

- `Kcode: Set OpenAI API Key`
- `Kcode: Set Anthropic API Key`

로컬 모델은 [Ollama](https://ollama.com/)를 설치하고 `ollama serve` 실행 후 `local:*` 모델을 선택합니다.

## 프로젝트 구조

```
kcode/
├── .cursor/rules/     # Cursor AI 가이드 (로드맵·아키텍처·리브랜딩)
├── branding/          # product.json 및 리브랜딩 오버라이드
├── kcode-src/         # Kcode contrib 소스 (apply 시 vscode-main에 복사)
├── scripts/           # 셋업·빌드·리브랜딩 스크립트
├── website/           # 마케팅 사이트 (Next.js, dev/website 브랜치)
└── vscode-main/       # VSCode upstream (gitignore, 로컬 clone)
```

## 빌드 문제 해결

### 디스크 공간 (ENOSPC)

VSCode 전체 빌드는 **10GB+** 여유 공간이 필요합니다.

- `node_modules`, `.build`, `out` 정리 후 재시도
- Windows: 디스크 정리, `%TEMP%` 비우기
- `npm ci` 실패 시 `ENOSPC` 로그 확인

### Node.js 버전

`.nvmrc`에 명시된 LTS 버전을 사용하세요. **Node 24** 등 최신 메이저는 upstream과 호환되지 않을 수 있습니다.

```powershell
node -v   # vscode-main/vscode-main/.nvmrc 와 일치하는지 확인
```

#### Windows에서 Node 24.15.0 (fnm)

시스템에 Node 22만 설치된 경우 [fnm](https://github.com/Schniz/fnm)으로 .nvmrc 버전을 맞춥니다.

`powershell
winget install Schniz.fnm
# 새 PowerShell 창에서:
fnm install 24.15.0
fnm use 24.15.0
# 프로필에 fnm env 추가 (https://github.com/Schniz/fnm#shell-setup)
node -v   # v24.15.0
`

빌드 전 
ode_modules를 지우고 **Node 24 PATH**가 잡힌 터미널에서 
pm ci를 실행하세요.

### Visual Studio Build Tools (Windows)

네이티브 모듈 컴파일에 **C++ 워크로드**와 **Spectre-mitigated libraries**가 필요합니다.

- Visual Studio Installer → *Desktop development with C++*
- 개별 구성 요소: *MSVC … Spectre-mitigated libs* (x64/x86)
- Spectre 오류 예: `MSB8040: Spectre-mitigated libraries are required`

### 첫 실행 체크리스트

1. `.\scripts\apply-kcode-rebranding.ps1` — product.json + kcode-src 복사
2. `npm ci` + `npm run watch` (별도 터미널, 완료까지 10~30분)
3. `.\scripts\code.bat` — Kcode 창 실행
4. 보조 사이드바 → **Kcode Chat** 또는 `Ctrl+Shift+L`

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
