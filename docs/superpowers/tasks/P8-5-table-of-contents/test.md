# P8-5: 우측 목차(TOC) 신규 구현 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/TableOfContents.test.tsx` — 8개 전부 통과: 헤딩 없음(렌더링 안 함), 문서 순서대로 목록 표시, h3가 h2보다 더 들여쓰기됨, 클릭 시 `scrollIntoView` 호출, 빈 제목 헤딩은 "(제목 없음)" 표시, 단일/동시 교차 시 활성 헤딩 추적(가장 나중 것 우선), `doc` prop 변경 시 재스캔.
- `npx vitest run src/components/editor/DocumentEditor.test.tsx` — 40개 전부 통과(레이아웃 재구성에 따른 회귀 없음 — 기존 테스트가 쓰는 대역 `RichTextEditor`는 실제 h2/h3를 렌더링하지 않아 TOC는 항상 렌더링되지 않고, 기존 어서션은 그대로 유지된다).
- `npm test` — 64개 파일, 660개 테스트 전부 통과.
- `npm run lint` — 0 errors, 2 warnings(`postcss.config.js`/`tailwind.config.js`의 기존 경고, 이 작업과 무관).
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 19개 라우트 정상 생성.

## 문제 → 조치 → 재검증
1. **원인**: `vitest.setup.ts`에 `IntersectionObserver` 스텁을 `if (!("IntersectionObserver" in window))`로 감쌌더니 `npm run build`의 TypeScript 검사가 `error TS2339: Property 'IntersectionObserver' does not exist on type 'never'`로 실패했다 — `in` 연산자로 이미 타입에 존재가 보장된 속성을 부정 검사하면 TypeScript가 그 분기를 `never`로 좁혀버리는 알려진 동작이었다.
   **조치**: `typeof window.IntersectionObserver === "undefined"`로 바꿨다(값 기준 검사라 타입 좁히기 부작용이 없다).
   **재검증**: `npm run build` 재실행 → TypeScript 통과.
2. **원인**: `TableOfContents.test.tsx`에서 `vi.fn().mockImplementation((callback) => {...})`(화살표 함수)로 `IntersectionObserver` 생성자를 대역했더니 `new` 호출 시 "is not a constructor"로 실패했다 — 화살표 함수는 `new`로 호출할 수 없다.
   **조치**: 일반 `function` 표현식으로 바꿨다.
   **재검증**: 해당 테스트 8개 전부 통과.
3. **원인**: `npm run lint`가 `react-hooks/set-state-in-effect`(활성 헤딩 없음 처리에서의 `setActiveId(null)`)와, 테스트 파일의 사용되지 않는 `eslint-disable-next-line react/no-danger` 주석(이 프로젝트 eslint 설정에 그 규칙이 없어 불필요) 두 가지를 지적했다.
   **조치**: 전자는 `EditorSidebar.tsx`의 기존 P7-7 선례와 같은 근거(외부 시스템 변화에 반응하는 동기화)로 `eslint-disable-next-line` 주석을 남겼다. 후자는 불필요한 주석을 삭제했다.
   **재검증**: `npm run lint` 재실행 → 0 errors, 이 작업과 무관한 기존 경고 2건만 남음.

## 수동/시각 검증
- **AX Auth 로그인 제약으로 이 세션에서는 실제 앱 화면을 캡처할 수 없다**(PRD의 기존 항목들과 동일한 한계). 수용 기준의 "1280px 이상에서 TOC 노출·1279px 이하에서 숨김(수동 스크린샷 3종)"을 대신해, 이 프로젝트의 실제 색상 토큰으로 두 브레이크포인트를 재현한 정적 비교를 만들어 Artifact로 공유했다: https://claude.ai/code/artifact/483531a6-a01a-49db-a263-47b31ba9f775
  - 위 프레임: TOC 노출(≥1280px), 아래 프레임: TOC 숨김(≤1279px).
  - 표에 노출 조건·폭·활성 표시 색상·클릭 동작·활성 추적 방식을 정리.
  - 스크롤에 따른 active 헤딩 전환, 부드러운 스크롤 이동 같은 동적 동작은 정적 페이지로 재현할 수 없어 `TableOfContents.test.tsx`의 자동화 테스트(IntersectionObserver 시뮬레이션, `scrollIntoView` 호출 검증)로 대신 확인했다.

## 새로운 결정 사항
없음 — 헤딩 추출 방식(DOM 직독)·활성 색상(`.prose` 링크색 재사용)·레이아웃 조합 방식(justify-center 그룹 정렬)은 GitHub Issue 없이 기존 코드 근거로 직접 정했다(task.md "결정이 필요한 사항" 참고).
