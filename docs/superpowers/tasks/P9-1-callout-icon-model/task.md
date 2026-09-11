# P9-1: 패널 노드 데이터 모델 확장 + Confluence storage 직렬화

## 배경
[노션 페이지 재현 검토](https://bird-earl-256.notion.site/SFOOD-AI-3d7be4fbb834817f8ed2c4742219ce7b)에서 원본이 콜아웃마다 다른 이모지(📷/💡/⚠️ 등)를 자유롭게 쓰는 반면, 이 프로젝트의 패널(`panel` 노드, `src/components/editor/RichTextEditor.tsx:156-174`)은 아이콘 개념 자체가 없다는 격차가 드러났다(시각적 구분은 `globals.css`의 `.panel-info`/`.panel-warning`/`.panel-note` 테두리·배경색뿐). 사용자 요청(2026-09-11)으로 콜아웃 아이콘을 자유롭게(큐레이션 목록 중에서) 지정하는 기능을 추가한다. `docs/product/prd.md`의 Phase 9(P9-1) 항목.

이 항목은 데이터 모델·직렬화만 다룬다 — 아이콘 선택 UI는 [P9-2](../P9-2-callout-icon-picker-ui/task.md)에서 다룬다(큐레이션 이모지 목록이 정해져야 착수 가능).

## 수용 기준 (Acceptance Criteria)
- [ ] `panel` 노드에 `icon` attrs(문자열, 이모지 1개)가 추가된다. 기본값은 `panelType`별로 다르다: `info` → `ℹ️`, `warning` → `⚠️`, `note` → `📝`.
- [ ] `icon` attrs가 없는 기존 문서(과거에 저장된 패널)를 열어도 `panelType` 기준 기본 아이콘으로 정상 렌더링된다(마이그레이션 스크립트 없이 조회 시점 기본값 보정).
- [ ] 슬래시 메뉴로 정보/경고/노트 패널을 삽입하면 각각의 기본 아이콘이 `icon` attrs에 함께 설정된다.
- [ ] `tiptap-to-storage.ts`가 패널을 직렬화할 때 기존 `ac:structured-macro ac:name="{panelType}"` 구조는 그대로 유지하고, 그 안에 `<ac:parameter ac:name="icon">{이스케이프된 이모지}</ac:parameter>`를 추가로 넣는다(기존 XSS 이스케이프 테스트 패턴 재사용).
- [ ] 패널 노드의 attrs 구조가 노션 콜아웃 블록 스키마(`icon: {type:"emoji", emoji}`, `color`)와 1:1로 매핑 가능하다는 것을 코드 주석 또는 설계 노트로 명시한다 — 실제 변환 함수는 이번 범위가 아니다(범위 밖 참고).
- [ ] 기존 회귀 테스트(`RichTextEditor.test.tsx`, `SlashCommandExtension.test.ts`, `tiptap-to-storage.test.ts`)가 모두 통과하고, 새 attrs를 검증하는 테스트가 추가된다.

## 결정이 필요한 사항
없음 — 타입별 기본 아이콘(ℹ️/⚠️/📝)은 이미 정해진 색상 테마(3종)에 대응하는 값이라 정답이 없는 결정이 아니고, storage 직렬화 방식(매크로 파라미터 추가)도 기존 패턴(이미지 노드의 `filename` attrs → `ri:filename` 분기, `RichTextEditor.tsx:147-154`/`tiptap-to-storage.ts:120-140`)을 그대로 재사용하는 기술적 선택이라 GitHub Issue 없이 직접 정했다(P1-6a와 같은 근거).

아이콘을 사용자가 실제로 고르는 UI(큐레이션 목록 구성)는 별도 결정 사항이라 [Issue #101](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/101)로 등록했다 — 이 항목(P9-1)은 그 답변을 기다리지 않고 진행 가능하다(목록과 무관하게 attrs 구조·직렬화는 고정).

## 범위 밖
- 아이콘 선택 UI(이모지 그리드, NodeView) — [P9-2](../P9-2-callout-icon-picker-ui/task.md).
- Confluence storage → TipTap JSON 역방향 파서 신설 — 저장소 전체에 이미 존재하지 않고(`sourceDocument` property가 진짜 소스), 이번 기능과 무관하게 별도로 필요해질 사안이라 다루지 않는다.
- 노션 문서 실제 가져오기/내보내기(전체 블록 타입 매핑) — Phase 9 narrative의 "범위 밖" 참고, 훨씬 큰 별도 작업.
- 색상 팔레트 확장(정보/경고/노트 3종 외 배경색 추가) — 이번 요청은 아이콘에 관한 것.
