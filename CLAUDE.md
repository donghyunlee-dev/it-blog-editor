@AGENTS.md

# UI 컴포넌트

UI 컴포넌트는 사내 디자인 시스템 `@sfood/ui`를 사용한다. 새 화면을 만들거나 화면을 수정할 때:

- **우선순위: ① `@sfood/ui`가 제공하는 컴포넌트·토큰(색상·타이포·spacing·radius 등)을 항상 최우선으로 쓴다.** ② `@sfood/ui`에 대응하는 요소가 없을 때만 `docs/product/design.md`에 기록된 대체 구성을 따른다 — design.md는 `@sfood/ui`와 별개의 디자인 시스템이 아니라 `@sfood/ui`를 이 프로젝트에 실제로 어떻게 적용했는지 기록한 문서다. ③ design.md의 서술과 `@sfood/ui`의 실제 타입/런타임 구현(`node_modules/@sfood/ui/dist/index.d.ts` 등)이 다르면 항상 실제 구현을 우선하고, design.md를 갱신한다. `@sfood/ui`가 이미 값을 제공하는 토큰(브랜드 컬러 등)을 이 프로젝트의 CSS에서 별도로 하드코딩·재정의하지 않는다.
- 템플릿(`LoginSimple`, `SettingsSidebar` 등)이 있으면 직접 마크업을 짜지 않고 템플릿을 우선 사용한다.
- 커스텀 색상은 하드코딩(`#e4002b`, `text-gray-900` 등)하지 않고 CSS Variables(`var(--color-brand)` 등, Tailwind 클래스로는 `text-brand`/`bg-surface`/`border-border` 등)로 참조한다.
- 한 화면에 `Button variant="primary"`는 1개만 둔다.
- 폼은 `FormField`로 라벨·에러를 감싼다.
- 확인이 필요한 삭제 등의 동작은 `window.confirm()` 대신 `Modal`을, 저장 성공/실패 안내는 인라인 텍스트 대신 `Toast`(`useToast()`)를 쓴다.
- 컴포넌트 목록·사용법은 `docs/product/design.md`와 Storybook(https://sfood-design-system.vercel.app/?path=/docs/docs-getting-started--docs)을 참고한다.

# 작업 루틴 (Task → Plan → Result → Test → PRD)

**`docs/product/prd.md`는 항상 최종 결과물과 동일해야 한다.** 코드가 바뀌었는데 PRD가 그대로면
그 자체가 결함이다 — 어떤 작업도 "완료"로 보고하기 전에 반드시 PRD의 해당 체크리스트 항목을
갱신한다(화면 정의·기능별 정의·산출물 목록 등 영향을 받는 부분 전부. 예: 화면 라우트가
바뀌었는데 "화면 정의" 표가 옛 라우트를 가리키고 있으면 그것도 고친다).

버그의 즉석 수정처럼 아주 사소한 변경이 아닌 이상(신규 기능, 구조 변경, 프로덕션 하드닝 항목
등) 모든 개발 작업은 아래 순서로 4개 파일을 만들며 진행한다. 디렉터리는
`docs/superpowers/tasks/{ID}-{slug}/`(ID는 PRD 체크리스트의 항목 ID, 예:
`P0-1a-unsaved-changes-warning`)이고, 형식은 `docs/superpowers/tasks/_template/`을 그대로
복사해서 쓴다. 이 디렉터리 구조는 기존 `docs/superpowers/specs/`(설계)·`docs/superpowers/plans/`
(구현 계획)의 연장선이다 — 더 작은 단위로, 항목마다 검증 기록까지 남기도록 확장한 것뿐이다.

1. **`task.md`** — 무엇을 왜 하는지, 검증 가능한 수용 기준(acceptance criteria)을 체크리스트로
   정의한다. 값·방식이 아직 정해지지 않은 결정 사항(예: "자동저장 주기를 몇 초로 할지",
   "이미지 최대 용량을 얼마로 할지")이 있으면 **추측으로 진행하지 않고 먼저 GitHub Issue로
   등록한다**(`gh issue create --repo sfood-pioneer-1st/sfood-it-editor`). 이슈 링크를
   `task.md`에 남기고, 답을 받을 때까지 그 결정에 의존하는 부분은 보류한다. `gh`가 설치·인증되어
   있지 않으면 먼저 사용자에게 알리고, 대신 `docs/superpowers/tasks/_pending-decisions.md`에
   이슈 초안(제목·본문·추천안)을 남겨 등록 가능해지는 즉시 그대로 옮길 수 있게 한다.
2. **`plan.md`** — 구현 접근과 변경 파일 목록을 체크박스 단계로 정리한다(`docs/superpowers/plans/`
   의 기존 플랜 형식을 그대로 따른다 — Global Constraints, Task별 Files/Interfaces/Steps 구조).
3. 구현을 진행한다.
4. **`result.md`** — 구현 내용, 파일 변경 내역, 커밋 SHA, 자체 검토(긍정 사항/주의사항/우려사항)를
   기록한다(`docs/superpowers/plans/task-1-report.md` 형식을 따른다).
5. **`test.md`** — 검증 단계의 기록이다. 실행한 자동화 커맨드와 결과(필요 시 Playwright/
   브라우저 수동 검증 시나리오)를 남긴다.
   - **테스트는 전체 스위트(`npm test`)를 돌리지 않는다.** 지금 개발하는 기능·고치는
     오류/버그, 그리고 그것과 직접 연관된 기능(같은 컴포넌트·같은 훅·같은 API를 쓰는
     화면 등)까지만 골라서 실행한다(예: `npx vitest run <바뀐 파일과 짝인 *.test.ts(x),
     그리고 그 기능을 함께 쓰는 화면의 테스트 파일>`). 린트도 같은 이유로 변경 파일만
     대상으로 한다(`npx eslint <바뀐 파일>`) — 저장소 전체 `npm run lint`는 이 프로젝트와
     무관한 로컬 워크트리 파일까지 함께 검사해 노이즈가 커진다(P8-1 `test.md` 사례 참고).
   - `npm run build`는 범위를 좁히기 어려운 전체 컴파일 확인이라, 코드 변경(문서 전용이
     아닌 경우)이 있으면 그대로 실행한다.
   - 변경이 공용 모듈·훅처럼 여러 화면이 함께 쓰는 코드에 걸쳐 있어도, 전체 `npm test`로
     확장하지 않는다 — 대신 그 공용 코드를 실제로 쓰는 화면·기능을 구체적으로 짚어(예:
     "이 훅을 쓰는 화면 목록") 그 테스트 파일들만 추가로 골라 돌린다. 전체 스위트 실행은
     사용자가 명시적으로 요청했을 때만 한다.
   - 문제를 발견하면 그 자리에서 고치고, "원인 → 조치 → 재검증 결과" 순서로 `test.md`에 추가한다.
   - 검증 중 새로운 결정 사항이 나오면 마찬가지로 GitHub Issue로 등록하고 `test.md`에 링크한다.
6. 위 네 파일이 모두 통과 상태가 되어야 비로소 `docs/product/prd.md`의 해당 체크리스트 항목을
   완료로 표시하고, 네 파일 경로를 산출물로 남긴다. **이 6단계 전까지는 PRD를 완료로 표시하지
   않는다.**
