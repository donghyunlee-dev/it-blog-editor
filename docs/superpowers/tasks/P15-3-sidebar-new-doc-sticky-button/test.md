# P15-3: 사이드바 "새 문서" 버튼 sticky 고정 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/EditorSidebar.test.tsx` — 78개 전부 통과(1개
  신규 — sticky/bottom-0 클래스 확인).
- `npx eslint src/components/editor/EditorSidebar.tsx src/components/editor/EditorSidebar.test.tsx` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공(중간에 `.next` 캐시가 손상돼(다른
  프로세스의 dev 서버 잔여물로 추정, `validator.ts` 파싱 오류) 한 번 실패했으나, `.next`
  삭제 후 재빌드하니 정상 통과 — 이번 변경과 무관한 로컬 캐시 문제였다).
- **전체 `npm test`는 실행하지 않았다** — 사용자가 이번 작업 범위를 "위치 이동 후 새문서
  기능까지만"으로 명시했고, CLAUDE.md 테스트 루틴도 공용 컴포넌트 변경이라고 전체
  스위트로 확장하지 않도록 갱신됐다(같은 세션).

## 수동/시각 검증
AX Auth 로그인 제약으로 이 세션에서는 확인 불가. 문서를 30개 이상 만들어(또는 `더 보기`로
목록을 늘려) 스크롤한 상태에서 "새 문서" 버튼이 계속 하단에 떠 있는지, 스크롤되는 문서
행과 겹칠 때 잘 구분되는지(그림자 효과) 확인이 필요하다.

## 문제 → 조치 → 재검증
- `npm run build`가 `.next/dev/types/validator.ts`의 TypeScript 파싱 오류로 실패 →
  원인: 이번 변경과 무관한 손상된 로컬 빌드 캐시(다른 dev 서버 프로세스가 동시에 같은
  `.next`를 쓰며 남긴 잔여물로 추정) → 조치: `.next` 삭제 후 재빌드 → 재검증: 정상 통과.

## 새로운 결정 사항
없음.
