# P8-6: 본문 최대 폭 조정 — 구현 계획

## Global Constraints
- 클래스 값 하나만 바꾸는 작업이라 다른 레이아웃·스타일에 영향이 없어야 한다 — 같은 요소의
  다른 클래스(`mx-auto flex flex-col px-6 py-10`)는 그대로 둔다.
- `RichTextEditor.tsx`에 있는 역사적 비교 주석(2026-08-26, SF-Note 실측)이 옛 820px 값을
  언급하고 있어 코드가 바뀌면 그 주석도 드리프트한다 — CLAUDE.md "실제 구현 우선" 원칙에
  따라 함께 갱신한다.

## Files
- Modify: `src/components/editor/DocumentEditor.tsx` — `max-w-[820px]` → `max-w-[830px]`.
- Modify: `src/components/editor/RichTextEditor.tsx` — 위 주석의 옛 값 언급을 갱신(비교
  결론 자체는 유지, 값만 최신화).
- Modify: `src/components/editor/DocumentEditor.test.tsx` — 새 클래스 적용 확인 테스트 추가.
- Modify: `docs/product/prd.md` — P8-6 체크리스트 완료 표시.
- Create: `docs/superpowers/tasks/P8-6-body-max-width/{task,plan,result,test}.md`.

## Steps
- [x] **Step 1**: `DocumentEditor.tsx`의 본문 컨테이너 클래스를 830px로 바꾼다.
- [x] **Step 2**: `RichTextEditor.tsx`의 관련 주석 값을 갱신한다.
- [x] **Step 3**: `DocumentEditor.test.tsx`에 "컨테이너 최대 폭이 830px"(그리고 820px
  클래스가 더는 없음) 테스트를 추가한다. `npx vitest run DocumentEditor.test.tsx`로 검증.
- [x] **Step 4**: `npx tsc --noEmit`, 변경 파일 대상 `npx eslint` 확인.
- [x] **Step 5**: `npm test`/`npm run build` 전체 실행, PRD P8-6 완료 표시, `result.md`/
  `test.md` 작성.
