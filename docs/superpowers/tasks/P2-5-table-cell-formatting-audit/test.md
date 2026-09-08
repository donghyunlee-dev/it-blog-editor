# P2-5: 표 안 텍스트 서식(색상·폰트) 격차 조사 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/RichTextEditor.test.tsx` | 28/28 통과(신규 "표 셀 안 서식 버블 메뉴(P2-5)" 1건 포함) |
| `npm test` | 55개 파일, 505/505 통과 |
| `npm run lint` | 0 errors, 기존과 동일한 경고 2건(`postcss.config.js`/`tailwind.config.js`, 이번 변경과 무관) |
| `npm run build` | 성공 |

## 수동 검증 (필요 시)
AX Auth 로그인 제약으로 실제 브라우저에서 확인하지는 못했다(기존 표 편집 항목들과 동일한 제약). 대신 자동화 테스트로 "표 셀 안 텍스트 선택 → 서식 버블 메뉴(굵게/글자 색상) 노출"을 직접 렌더링해 확인했다 — `selectText` 헬퍼로 표 셀 텍스트 노드에 실제 `Range`를 만들어 선택하고 `selectionchange`를 디스패치하는 방식이라, 실제 사용자의 드래그 선택과 동일한 경로(ProseMirror의 `domObserver`)를 탄다.

## 발견된 문제와 조치
없음 — 조사 결과 코드 버그가 발견되지 않았다(표 셀 안 서식 버블 메뉴는 이미 정상 동작). 별도로 발견한 것은 "버그"가 아니라 "폰트 서식 기능 자체의 부재"이며, 이는 아래 결정 사항으로 분리해 등록했다.

## 검증 중 새로 발견한 결정 사항
- 문서 전체(표 포함)에 글꼴 종류·글자 크기 서식을 추가할지, 추가한다면 어떤 목록/단계로 제한할지 — [Issue #69](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/69). 답변 전까지 구현 보류.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능(단, 폰트 서식 구현 자체는 Issue #69 범위로 별도 진행)
