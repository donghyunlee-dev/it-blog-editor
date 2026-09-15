# P17-1/P17-2: 슬래시 메뉴 이미지·문서 링크 무반응 수정 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/RichTextEditor.test.tsx
  src/components/editor/SlashCommandExtension.test.ts
  src/components/editor/DocumentEditor.test.tsx` — 3개 파일 119개 전부 통과(새로 추가한
  4개 포함: pageId 없음/있음 × 이미지/문서 링크).
- `npx eslint src/components/editor/RichTextEditor.tsx
  src/components/editor/RichTextEditor.test.tsx` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 20개 라우트 정상 생성.
- 사용자 요청대로 범위를 이 변경(슬래시 메뉴 이미지·문서 링크)과 직접 연관된 파일로
  좁혀 전체 `npm test`/`npm run lint`는 실행하지 않았다(CLAUDE.md 테스트 루틴).

## 수동/시각 검증
AX Auth(사내 SSO) 로그인 제약으로 이 세션에서는 실제 브라우저로 확인할 수 없다. 실사용
확인이 필요한 시나리오:
1. 새 문서(`/editor/new`, 저장 전)에서 `/이미지`를 입력 → 메뉴에 "이미지" 항목이 보임 →
   클릭 시 파일 선택 창 대신 "문서를 먼저 저장한 뒤에 이미지를 추가할 수 있습니다." 토스트.
2. 같은 화면에서 `/문서 링크` → 클릭 시 피커 모달 대신 "문서를 먼저 저장한 뒤에 문서
   링크를 추가할 수 있습니다." 토스트.
3. 문서를 저장한 뒤(pageId 확정) 같은 두 항목이 기존과 동일하게 정상 동작(파일 선택 →
   업로드 → 삽입 / 피커 → 검색 → 카드 삽입).

## 문제 → 조치 → 재검증
없음 — 원인 진단(슬래시 메뉴만 항목을 조건부로 숨김)부터 수정까지 한 번에 반영됐고,
테스트/lint/빌드 모두 첫 시도에 통과했다.

## 새로운 결정 사항
없음.
