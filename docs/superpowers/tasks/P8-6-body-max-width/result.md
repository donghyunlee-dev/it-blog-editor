# P8-6: 본문 최대 폭 조정 — 결과

## 커밋
- `45b9a1e` feat: 본문 최대 폭을 830px로 조정 (P8-6)

## 변경 파일
- `src/components/editor/DocumentEditor.tsx` — 본문 콘텐츠 컨테이너
  `mx-auto flex max-w-[820px] flex-col px-6 py-10` → `max-w-[830px]`로 변경(다른 클래스는
  그대로).
- `src/components/editor/RichTextEditor.tsx` — 2026-08-26 SF-Note 실측 비교 주석이 언급하던
  옛 820px 값을 갱신하고, "이후 P8-6에서 830px로 조정됐고 819px과의 차이는 여전히 10px
  안쪽이라 비교 결론 자체는 바뀌지 않는다"는 문장을 덧붙였다(코드-문서 드리프트 방지).
- `src/components/editor/DocumentEditor.test.tsx` — 새 테스트 1개: 본문 컨테이너에
  `max-w-[830px]` 클래스가 적용돼 있고 옛 `max-w-[820px]` 클래스는 문서 어디에도 없음을
  확인.

## 자체 검토
- **긍정**: 클래스 문자열 하나만 바뀌는 가장 단순한 변경이라 회귀 위험이 거의 없다. 관련
  역사적 주석까지 함께 갱신해 코드-문서 드리프트를 남기지 않았다.
- **주의사항**: jsdom은 실제 레이아웃 계산(`getBoundingClientRect()`)을 하지 않으므로,
  "830px임"은 실측 픽셀이 아니라 적용된 Tailwind 클래스 문자열로 검증했다 — task.md의
  수용 기준이 원래 요구한 "getBoundingClientRect() 또는 스크린샷" 중 스크린샷 경로는 아래
  "우려사항" 참고.
- **우려사항**: AX Auth 로그인 제약으로 이 세션에서는 실제 브라우저로 픽셀 단위 렌더링
  폭을 확인하지 못했다(P7-7·P8-1·P8-4와 동일한 한계) — 클래스 적용 여부로 대신 검증했다.

## 후속 수정(2026-09-14) — 패딩이 830px 안에서 깎여나가던 문제
사용자가 실제 화면을 레퍼런스와 다시 비교하며 "본문 WIDTH가 참고 사이트와 다르다 —
830px로 읽었는데 우리는 여백 포함해서 830이다"라고 지적했다. 확인해보니 이 태스크가
바꾼 `max-w-[830px]`가 `px-6`(좌우 24px)과 **같은 엘리먼트**에 있었다 — Tailwind
기본 box-sizing(border-box)에서는 padding이 그 요소의 `max-width` 안에서 깎여나가므로,
실제 본문(읽기 영역) 폭은 830px가 아니라 830-48=782px였다. 레퍼런스가 실측한 830px는
본문 텍스트 자체의 순수 폭이라(design.md "1. 전체 그리드" 절 "패딩 겹침 정정" 참고),
782px는 그보다 48px 좁았던 것이다.

- **커밋**: `src/components/editor/DocumentEditor.tsx`의 `px-6`을 `max-w-[830px]`가
  있는 엘리먼트에서 그 바깥(`flex justify-center`) 줄로 옮겼다 — 830px는 이제 본문
  자신만의 순수 폭이고, `px-6`은 그 830px 박스 전체를 감싸는 여유 공간(좁은 화면에서만
  실제로 줄어드는 가장자리 여백)이다.
- **검증**: 로그인 화면에 접근할 수 없어, 같은 클래스만 떼어낸 정적 페이지에서
  `getBoundingClientRect()`로 직접 측정 — 수정 전에는(재현 목적으로 `px-6`을 안쪽에
  둔 버전도 함께 측정) 782px, 수정 후에는 830px 그대로 나옴을 확인했다.
  `npx vitest run src/components/editor/DocumentEditor.test.tsx` — 40개 전부 통과
  (기존 "max-w-[830px] 클래스 존재" 테스트는 클래스가 여전히 같은 값이라 그대로 통과 —
  이 회귀는 클래스 문자열이 아니라 실제 렌더링 폭에서만 드러나는 종류라, 테스트가
  이번 문제를 원래는 잡아내지 못했다는 뜻이다). `npx eslint`, `npx tsc --noEmit`,
  `npm run build` — 전부 통과.

## 산출물
- `docs/superpowers/tasks/P8-6-body-max-width/{task,plan,result,test}.md`
