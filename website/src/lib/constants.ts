export const SITE = {
  name: "Kcode",
  nameKo: "케이코드",
  tagline: "AI 네이티브 코드 에디터",
  taglineEn: "AI-native code editor",
  description:
    "채팅, 인라인 편집, 에이전트, 탭 자동완성을 갖춘 한국어 우선 개발 환경",
  githubUrl: "https://github.com/sly22/kcode",
  releasesUrl: "https://github.com/sly22/kcode/releases",
  protocol: "kcode://",
  dataFolder: ".kcode",
} as const;

export const INTEGRATION = {
  updateFeedUrl: "https://kcode.dev/api/updates.json",
  modelsEndpoint: "/api/models.json",
  deepLinks: {
    openDocs: "kcode://docs/getting-started",
    openSettings: "kcode://settings/ai",
    openRules: "kcode://open?path=.kcode/rules",
  },
} as const;

export const FEATURES = [
  {
    id: "chat",
    title: "AI 채팅",
    titleEn: "Chat",
    description:
      "파일, 선택 영역, 터미널 출력을 컨텍스트로 붙여 코드베이스에 대해 질문하세요.",
    icon: "chat",
  },
  {
    id: "inline",
    title: "인라인 편집",
    titleEn: "Ctrl+K",
    description:
      "선택한 코드를 자연어로 변환·생성합니다. 리팩터링과 보일러플레이트 작성에 최적화.",
    icon: "edit",
  },
  {
    id: "agent",
    title: "에이전트 모드",
    titleEn: "Agent",
    description:
      "파일 편집, 터미널, 검색 도구를 호출하며 작업을 자율적으로 수행합니다.",
    icon: "agent",
  },
  {
    id: "completion",
    title: "탭 자동완성",
    titleEn: "Tab Completion",
    description:
      "고스트 텍스트와 Next Edit Suggestion으로 흐름을 끊지 않고 코딩하세요.",
    icon: "completion",
  },
  {
    id: "models",
    title: "모델 선택",
    titleEn: "Model Picker",
    description:
      "OpenAI, Anthropic, 로컬 LLM 등 원하는 모델을 프로젝트별로 전환합니다.",
    icon: "models",
  },
] as const;

export const DOWNLOADS = [
  {
    platform: "Windows",
    arch: "x64",
    icon: "windows",
    filename: "KcodeSetup-x64.exe",
    available: false,
    note: "GitHub Releases 준비 중",
  },
  {
    platform: "macOS",
    arch: "Apple Silicon / Intel",
    icon: "apple",
    filename: "Kcode-darwin-universal.dmg",
    available: false,
    note: "GitHub Releases 준비 중",
  },
  {
    platform: "Linux",
    arch: "x64",
    icon: "linux",
    filename: "Kcode-linux-x64.tar.gz",
    available: false,
    note: "GitHub Releases 준비 중",
  },
] as const;
