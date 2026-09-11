# P9-1: 패널 노드 데이터 모델 확장 + Confluence storage 직렬화 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/RichTextEditor.test.tsx src/components/editor/SlashCommandExtension.test.ts src/lib/editor/tiptap-to-storage.test.ts` — 100개 전부 통과.
  - `RichTextEditor.test.tsx`: 신규 "패널 아이콘(P9-1)" 블록 — `icon` attrs 없는 패널이 `panelType`별 기본 아이콘(ℹ️/⚠️/📝)으로 렌더링되는지 3종 각각 검증, `icon` attrs가 명시된 패널이 타입 기본값 대신 그 아이콘을 쓰는지 검증.
  - `SlashCommandExtension.test.ts`: 정보/경고/노트 3개 항목의 `insertContent` attrs에 `panelType`과 함께 기본 아이콘이 포함되는지 검증(기존 "panelType 혼동 방지" 테스트 확장).
  - `tiptap-to-storage.test.ts`: 패널 매크로 변환 시 `<ac:parameter ac:name="icon">`가 추가되는지, `icon` attrs를 명시하면 타입 기본값 대신 그대로 쓰이는지, `icon` 값 자체도 이스케이프 처리되는지(신규 XSS 테스트) 검증.
- `npx eslint src/components/editor/RichTextEditor.tsx src/components/editor/SlashCommandExtension.ts src/lib/editor/tiptap-to-storage.ts src/lib/editor/panel-icons.ts` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 19개 라우트 정상 생성(회귀 없음).

## 수동/시각 검증
AX Auth 로그인 제약으로 이 세션에서는 실제 `/editor` 화면을 열어볼 수 없다(PRD의 기존 항목들과 동일한 한계 — 예: P8-5 result.md). 이번 변경은 P8-5(TOC)와 달리 새 레이아웃·색상을 도입하지 않고 기존 `.panel`(이미 `display:flex; gap:0.5rem`)에 아이콘 텍스트 노드 하나를 추가하는 수준이라, 시각 비교 Artifact 없이 자동화 테스트(`container.querySelector(".panel-icon")`로 실제 렌더링된 DOM의 아이콘 문자를 직접 확인)만으로 충분하다고 판단했다.

## 문제 → 조치 → 재검증
없음 — 첫 구현에서 테스트·린트·빌드가 모두 통과했다.

## 새로운 결정 사항
없음 — `task.md` "결정이 필요한 사항" 참고(타입별 기본 아이콘·storage 직렬화 방식 모두 기존 패턴 재사용으로 GitHub Issue 없이 직접 정함).
