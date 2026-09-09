# P7-5: 새 폴더 만들기·이름 변경·삭제 UI — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/FolderFormModal.test.tsx` | 6/6 통과 |
| `npx vitest run src/components/editor/EditorSidebar.test.tsx` | 42/42 통과(기존 P7-4 회귀 없음, P7-5 신규 7건 포함) |
| `npm test` | 60개 파일, 589/589 통과 |
| `npm run lint` | 0 errors(1건 발견·수정, 아래 참고), 기존과 동일한 경고 2건(`postcss.config.js`/`tailwind.config.js`, 이번 변경과 무관) |
| `npm run build` | 성공(Turbopack 컴파일·TypeScript 검사 모두 통과) |

## 수동 검증 (필요 시)
AX Auth 로그인 제약으로 실제 브라우저 확인은 하지 못했다(기존 UI 항목들과 동일한 제약). 자동화 테스트로 다음을 확인했다.
- "새 폴더 만들기" 버튼을 누르면 생성 모달이 뜨고, 저장하면 `POST /api/editor/folders`를 올바른 `parentId`(최상위=`null`, 하위 폴더 추가=해당 폴더 id)와 함께 호출한다.
- "이름 변경" 버튼을 누르면 현재 이름이 채워진 모달이 뜨고, 저장하면 `PUT /api/editor/folders/{folderId}`를 호출한다.
- "삭제" 버튼을 누르면 바로 삭제되지 않고 확인 모달이 뜨며, 취소하면 요청을 보내지 않고 확인하면 `DELETE`를 호출하고 새로고침(`router.refresh()`)한다.
- 저장/삭제 실패 시 서버가 돌려준 오류 메시지가 Toast로 뜬다.

## 발견된 문제와 조치
- **원인**: `FolderFormModal.tsx`에서 모달이 열릴 때마다 입력값을 초기화하려고 `useEffect` 안에서 `setName`을 직접 호출했다 — `npm run lint`가 `react-hooks/set-state-in-effect` 오류로 잡아냈다.
- **조치**: 호출부(`EditorSidebar.tsx`)가 `{folderFormState && <FolderFormModal ... />}`로 모드가 바뀔 때마다 이 컴포넌트를 항상 새로 마운트한다는 것을 확인해(닫힌 뒤에만 다른 모드로 열 수 있어 매번 `null`을 거침), `useEffect` 자체를 제거하고 `useState`의 초기값만으로 대체했다.
- **재검증 결과**: `npm run lint` 재실행 결과 오류 0건. 관련 테스트(`FolderFormModal.test.tsx`, `EditorSidebar.test.tsx`) 재실행 결과 그대로 전부 통과.

## 검증 중 새로 발견한 결정 사항
없음 — `task.md`에 명시된 대로 이 항목은 결정이 필요한 사항이 없었다.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
