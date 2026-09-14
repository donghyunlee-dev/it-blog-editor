# P12-2: 태그 입력 영역 하단 이동 + 컴팩트화 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/TagInput.test.tsx` — 9개 전부 통과.
  - 기존 7개 테스트를 `aria-label="태그"` 기반 `getByRole("combobox", ...)` 쿼리로 교체해도
    그대로 통과 — 입력·삭제·자동완성·IME 처리 동작이 바뀌지 않았음을 확인.
  - 신규 2개: "태그가 없으면 예시 placeholder를 보여준다", "태그가 이미 있으면 예시
    placeholder를 보여주지 않는다(P12-2)".
- `npx vitest run src/components/editor/DocumentEditor.test.tsx` — 41개 전부 통과(TagInput
  관련 태그 저장·자동완성 전달 테스트 포함, placeholder 의존 테스트는 모두 `value=[]` 케이스라
  변경 영향 없음).
- `npx eslint src/components/editor/TagInput.tsx src/components/editor/TagInput.test.tsx
  src/components/editor/DocumentEditor.tsx` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 19개 라우트 정상 생성.

## 수동/시각 검증
AX Auth 로그인 제약으로 이 세션에서는 실제 `/editor`·`/editor/new` 화면을 열어볼 수 없다(기존
항목들과 동일한 한계, 예: P11-1 test.md). 레이아웃 변경(위치 이동, 1줄 압축)은 시각적 요소라
실제 화면 확인이 이상적이지만, 이번 세션에서는 자동화 테스트(구조·접근성 쿼리 기반)와 코드
리뷰로 대체했다.

## 문제 → 조치 → 재검증
없음 — 컴포넌트 구조 변경(래퍼 제거, 1줄 배치) + placeholder 조건 추가만으로 첫 시도에
테스트·린트·빌드가 모두 통과했다.

## 새로운 결정 사항
없음 — `task.md` "결정이 필요한 사항" 참고(위치·압축 방식·placeholder 조건 모두 사용자가 대화
중 직접 지정).
