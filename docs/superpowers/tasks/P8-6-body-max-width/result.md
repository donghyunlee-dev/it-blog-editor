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

## 산출물
- `docs/superpowers/tasks/P8-6-body-max-width/{task,plan,result,test}.md`
