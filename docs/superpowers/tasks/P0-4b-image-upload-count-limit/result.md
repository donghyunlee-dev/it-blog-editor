# P0-4b: 이미지 업로드 개수 제한 — 구현 결과 보고서

## 구현 내용
- `RichTextEditor.tsx`에 `MAX_IMAGES_PER_DOCUMENT = 30` 상수와 `countImageNodes(doc)` 헬퍼(ProseMirror `descendants`로 `image` 노드 카운트)를 추가했다.
- 드래그앤드롭(`handleDrop`)·붙여넣기(`handlePaste`)·슬래시 메뉴 "이미지"(`createImageSlashItem`) 세 진입점 모두, 업로드를 시작하기 직전에 현재 문서의 이미지 개수를 확인해 상한 이상이면 `uploadImage`를 호출하지 않고 안내 토스트("이미지는 문서당 최대 30장까지 첨부할 수 있습니다.")만 띄운다.
- 코드를 다시 읽어보니 드래그앤드롭/붙여넣기는 이미 `files?.[0]`로 첫 파일 하나만 처리하고 있어("1회 처리량"은 이미 사실상 1로 제한돼 있었음), 실제로 비어 있던 것은 "문서당 누적" 상한뿐이었다 — 이 사실을 `task.md`에 남겨 다음에 같은 오해를 반복하지 않게 했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/RichTextEditor.tsx` | 이미지 개수 상한 상수·헬퍼 추가, 세 업로드 진입점에 검사 추가 |
| `src/components/editor/RichTextEditor.test.tsx` | 신규 — 이 컴포넌트의 첫 테스트 파일(이번 상한 로직만 다룸) |

## 자체 검토 (Self-Review)

### 긍정 사항
- `RichTextEditor`는 지금까지 테스트가 전혀 없던 컴포넌트였는데(감사에서 P1-9e로 지적됨), 이번에 실제 TipTap/ProseMirror 렌더링에 진짜 `drop`/`paste` DOM 이벤트를 디스패치해 검증하는 첫 테스트를 추가했다 — 앞으로 이 파일에 테스트를 더할 때 재사용할 수 있는 패턴(`fireDrop`/`firePaste` 헬퍼)이 생겼다.
- 세 진입점이 같은 상수·같은 헬퍼를 공유해 값이 한 곳에서만 관리된다.

### 주의사항
- jsdom(happy-dom)에서 `drop`/`paste` 이벤트를 흉내 낼 때 `dataTransfer`/`clipboardData` 객체에 `getData()` 메서드가 없으면 ProseMirror 내부 핸들러(`prosemirror-view`의 `handleDrop`)가 그 메서드를 직접 호출하다 예외를 던진다는 것을 테스트 작성 중 발견했다 — 대역 객체에 `getData: () => ""`를 추가해 해결했다. TipTap/ProseMirror를 대상으로 한 이후 테스트에서도 같은 함정이 재현될 수 있어 남겨둔다.
- 상한 값(30)은 GitHub Issue로 결정받지 않고 직접 정했다(`task.md`의 "결정이 필요한 사항" 참고 — 안전을 해치지 않는 UX 값이라 판단).

### 우려사항
- 서버 측 강제는 없다(`task.md` "범위 밖"). API를 직접 호출하면 이 상한을 우회할 수 있지만, 이 제한 자체가 보안 경계가 아니라 UX 가드레일이라는 판단 아래 이번 범위에서 제외했다.
