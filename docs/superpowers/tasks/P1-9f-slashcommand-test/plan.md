# P1-9f: `SlashCommandExtension.ts` 테스트 — 구현 계획

## Global Constraints
- 실제 TipTap `Editor` 인스턴스를 만들지 않는다 — `run(editor, range)`가 호출하는 메서드 체인(`chain().focus().deleteRange(range)....run()`)을 기록하는 가벼운 체이닝 모킹 객체(Proxy 기반)로 대체해, 순수하게 "어떤 메서드가 어떤 인자로 호출됐는지"만 검증한다.
- `SuggestionProps`/`SuggestionKeyDownProps`는 이 파일이 실제로 읽는 필드(`items`, `editor`, `range`, `mount`, `event`)만 채운 최소 객체로 흉내 낸다.

## Files
- Create: `src/components/editor/SlashCommandExtension.test.ts`

## Steps
- [x] **Step 1**: `createChainRecorder()` 헬퍼 — `editor.chain()`이 반환하는 체이닝 가능한 Proxy를 만들어 호출된 메서드명·인자를 배열로 기록.
- [x] **Step 2**: `createSlashItems` 관련 4건(빈 쿼리, 대소문자 무시 필터, 빈 결과, extraItems 병합·필터링).
- [x] **Step 3**: 9개 기본 항목 각각의 `run` 호출 체인 검증(패널 3종의 `panelType` 구분 포함) — 9건.
- [x] **Step 4**: `createSlashMenuRenderer()` 관련 — onStart 렌더링·mount 호출, 빈 목록 안내, ArrowDown/ArrowUp 순환 + Enter 실행, 클릭 실행, onExit unmount 호출. 6건 내외.
- [x] **Step 5**: `npx vitest run "src/components/editor/SlashCommandExtension.test.ts"`로 검증.
- [x] **Step 6**: `npm run lint`, `npm run build` 실행.
