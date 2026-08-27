# P0-1a: 저장하지 않은 변경사항 이탈 경고 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/UnsavedChangesContext.test.tsx` | 통과 (3/3) |
| `npx vitest run src/components/editor/DocumentEditor.test.tsx` | 통과 (20/20, 신규 2건 포함) |
| `npx vitest run src/components/editor/EditorSidebar.test.tsx` | 통과 (16/16, 신규 1건 포함) |
| `npx vitest run src/components/editor/EditorShell.test.tsx` | 통과 (3/3, 기존 3건 — 신규 `next/navigation` 모킹으로 회귀 없음 확인) |
| `npm test`(전체) | 통과 (138/138 — 변경 전 132/132에서 6건 순증) |
| `npx tsc --noEmit` | 통과 (에러 없음) |
| `npm run lint` | 통과 — 에러 0, 경고 2(둘 다 `postcss.config.js`/`tailwind.config.js`의 기존 무관 경고) |
| `npm run build` | 통과 — 프로덕션 빌드 성공, 라우트 목록에 `/editor/[pageId]/publish`가 여전히 없음(이전 세션에서 제거된 상태 유지 확인) |

## 수동 검증
이 환경의 Browser 프리뷰 도구가 로컬 dev 서버(`npm run dev`)로의 `navigate` 호출을 반복적으로
거부해(원인 불명 — `preview_start`로 서버는 기동됐으나 탭 이동이 계속 실패) 실제 브라우저
클릭으로는 확인하지 못했다. AX Auth/Confluence 실 자격증명이 있는 `.env`가 존재해 로그인
자체는 가능할 수 있었으나, 그 이전 단계인 페이지 네비게이션에서 막혔다.

대신 `@testing-library/user-event`로 실제 타이핑·클릭 시퀀스를 그대로 재현하는 통합 테스트로
같은 시나리오를 확인했다(위 자동화 테스트 표의 `DocumentEditor.test.tsx`/`EditorSidebar.test.tsx`
신규 케이스):
- 제목을 수정한 뒤 "문서함으로 돌아가기" 클릭 → 확인 Modal 노출, `router.push` 미호출
- Modal에서 "계속 편집" 클릭 → Modal 닫힘, 이동 안 함
- 다시 클릭 후 "변경사항 버리고 이동" 클릭 → `router.push("/editor")` 호출
- 저장 성공 후에는 같은 링크를 클릭해도 Modal 없이 이동
- 사이드바에서 편집 중 표시 상태로 다른 문서 행 클릭 → Modal 노출 → 확인 시 `push("/editor/2")`
- `beforeunload`: dirty일 때 `event.defaultPrevented === true`, dirty 해제 후 `false`(jsdom에서 실제 `Event` 디스패치로 검증)

## 발견된 문제와 조치
- **원인**: 처음 작성한 통합 테스트가 실패했다 — Next.js `<Link>`의 실제 클릭 핸들러
  (`node_modules/next/dist/client/app-dir/link.js`)는 `React.useContext(AppRouterContext)`가
  존재해야만 `onNavigate`를 호출하는데, RTL 테스트에는 이 내부 컨텍스트가 없어(공개
  `next/navigation` 모킹으로는 채워지지 않음) `onNavigate`가 한 번도 호출되지 않았다.
- **조치**: `next/link`를 "onClick 먼저 호출 → onNavigate 호출(막히면 중단)"이라는 Link의
  실제 계약만 재현하는 가벼운 대역으로 테스트 파일에서 모킹했다(`DocumentEditor.test.tsx`,
  `EditorSidebar.test.tsx`). AppRouterContext를 억지로 흉내 내는 대신, 이미 검증된 계약
  수준에서만 대역을 두어 프로덕션 코드는 실제 `next/link`의 `Link`를 그대로 쓴다.
- **재검증 결과**: 조치 후 두 파일 모두 전체 테스트 통과(위 표 참고). 다른 기존 테스트(링크의
  `href`/`aria-current` 속성 확인 등)도 대역이 `...rest` props를 그대로 전달해 영향받지
  않았다.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능. 단, "범위 밖" 절에 명시한
  브라우저 뒤로가기/앞으로가기 버튼 케이스는 의도적으로 제외됐고, 실제 브라우저를 통한
  수동 클릭 검증은 이 환경의 제약으로 대체 수단(통합 테스트)으로 갈음했다 — 배포 후 1회
  사람이 직접 확인하는 것을 권장한다(`result.md` 우려사항 참고).
