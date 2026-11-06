# front-hxxnn

Liquid glass / 클레이모피즘 기반 프론트엔드 디자인 플러그인 (Claude Code).
Anthropic 공식 `frontend-design` 스킬의 구조를 참고해 만든 개인용 플러그인입니다.

## 구성

```
.claude-plugin/plugin.json      플러그인 메타데이터
skills/front-design/SKILL.md    디자인 원칙과 작업 순서
skills/front-design/references/
  dashboard-layout.md           대시보드 기본 구성(레일·상단 바·유리 패널·카드)
skills/front-design/scripts/
  derive-palette.js             배경색·강조색에서 카드·글자 색을 계산하고 대비를 검사
examples/                       지침으로 만든 시험작(가계부, 대시보드 v1~v3)
```

## 핵심 원칙

1. 주제로 스타일 선택: 기본은 liquid glass 또는 클레이모피즘. 실험적·인터랙티브 주제면 본문은 그 주제 스타일, 버튼 등 조작 요소만 liquid glass.
2. 사용자 흐름이 구조를 정한다.
3. 가시성: 대비, 위계, 조작 요소의 식별, 포커스, 반응형.
4. 반복되는 내용은 의미 있는 차이로 구분한다.
5. 주제에 맞는 색과 글꼴을 정한다.
6. 인터랙티브 요소는 쓸 수 있다고 판단하면 쓴다.

## 사용

스킬 이름은 `front-hxxnn:front-design` 입니다. UI를 만들거나 다시 디자인하는 요청에서 호출합니다.

## 버전

- 0.4.0: 대시보드 레일에 색상 설정 패널(팔레트 버튼)을 기본으로 포함
- 0.3.0: 팔레트 직접 지정(배경색·강조색) + 카드 대비 자동 계산 스크립트
- 0.2.0: 대시보드 기본 구성 추가, 그림자·색·폰트·배경 규칙 정리
- 0.1.0: 뼈대
