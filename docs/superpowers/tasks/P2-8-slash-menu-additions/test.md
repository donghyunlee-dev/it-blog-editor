# P2-8: 인용구·구분선·밑줄 서식과 "제목 3" 진입점 추가 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/SlashCommandExtension.test.ts` — 29개 전부 통과(기본 항목 개수 갱신 + 신규 항목 3개 커맨드 체인 검증 포함).
- `npx vitest run src/components/editor/RichTextEditor.test.tsx` — 39개 전부 통과(밑줄 버튼 노출·클릭 시 마크 적용 신규 테스트 포함).
- `npm test` — 63개 파일, 641개 테스트 전부 통과.
- `npm run lint` — 0 errors, 2 warnings(`postcss.config.js`/`tailwind.config.js`의 기존 경고, 이 작업과 무관).
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 19개 라우트 정상 생성.

## 문제 → 조치 → 재검증
없음 — 이미 활성화된 커맨드에 UI만 연결하는 작업이라 처음부터 순조롭게 진행됐다.

## 수동 검증
- AX Auth 로그인 제약으로 이 세션에서는 실제 브라우저로 확인할 수 없었다(PRD의 기존 항목들과 동일한 한계). 자동화 테스트로만 검증했다.

## 새로운 결정 사항
없음 — 슬래시 메뉴 vs 버블 툴바 배치는 GitHub Issue 없이 기존 코드 관례를 근거로 직접 정했다(task.md "결정이 필요한 사항" 참고).
