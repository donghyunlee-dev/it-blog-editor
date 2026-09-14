# P14-3: 문서 옵션 메뉴 클리핑 수정 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/EditorSidebar.test.tsx` — 75개 전부 통과, 변경 없이
  그대로 통과했다(접근성 역할·라벨을 유지했기 때문).
- `npx eslint src/components/editor/EditorSidebar.tsx` — 0 errors.
- `npm run build` — 최초 시도에서 TypeScript 오류 발생(아래 "문제 → 조치" 참고), 수정 후
  Turbopack 프로덕션 빌드 성공, TypeScript 통과, 19개 라우트 정상 생성.
- **`npm test`(전체) — 63개 파일, 691개 테스트 전부 통과.** `<nav>` 바깥에 새 팝업을
  추가하고 이벤트 리스너(mousedown/keydown/scroll/resize)를 전역에 등록하는 변경이라, 다른
  화면에 부작용이 없는지 확인하기 위해 전체 스위트를 추가로 돌렸다.

## 수동/시각 검증
AX Auth 로그인 제약으로 이 세션에서는 실제 `/editor` 화면을 열어볼 수 없다(기존 항목들과
동일한 한계). 이번 변경은 원인 분석(CSS 스펙의 overflow-x/overflow-y 강제 계산 규칙,
`<nav>`가 실제 클리핑 조상이라는 것)을 코드로 직접 확인한 뒤 진행했지만, 메뉴가 실제로
페이지 영역까지 잘리지 않고 온전히 보이는지는 사용자 캡처로 확인이 필요하다.

## 문제 → 조치 → 재검증
- `npm run build`의 TypeScript 단계에서 `document.addEventListener("keydown", handleKeyDown)`가
  타입 오류를 냈다 → 원인: 이 파일 상단에서 `KeyboardEvent`를 React의 합성 이벤트 타입으로
  import하고 있어, 새로 추가한 DOM 네이티브 핸들러의 파라미터 타입이 그 import와 충돌함 →
  조치: 해당 파라미터 타입을 `globalThis.KeyboardEvent`로 명시해 DOM 타입임을 분명히 함 →
  재검증: `npm run build` 재실행, TypeScript 통과.

## 새로운 결정 사항
없음 — 원인·해법 모두 코드 분석만으로 확정했다(`task.md` "결정이 필요한 사항" 참고).
