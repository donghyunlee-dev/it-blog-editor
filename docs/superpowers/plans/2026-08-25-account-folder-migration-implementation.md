# 계정 폴더 구조 마이그레이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Tasks are ordered by dependency — Task 1 → 2 → 3/4 (3와 4는 서로 독립적이라 병렬 가능) → 5 → 6 → 7.

## 배경

[2026-08-21-confluence-content-structure-design.md](../specs/2026-08-21-confluence-content-structure-design.md)가 2026-08-24에 "Space 홈페이지 → 초안 루트/게시됨 루트 → 계정 폴더" 구조에서 "Space 홈페이지 → 계정(이메일) 폴더 → 그 안에서 초안/게시 구분" 구조로 개정됐다. 그런데 그 사이 다른 작업 흐름(editor-ui-ux 브랜치)이 **이전 설계를 기준으로 Phase 1 전체(스파이크, `roots.ts`, `access.ts`, `folder.ts`, `documents.ts`, `publish.ts`, `tags.ts`)와 Phase 2(WYSIWYG, 태그 UI, 사이드바 앱 셸, `@sfood/ui`)를 이미 구현해 main에 merge했다.** 즉 지금 코드는 "예전 설계를 완성도 높게 구현한 상태"이고, 이 플랜은 그 구현을 새 설계(계정 폴더 내부 구조)에 맞게 옮기는 마이그레이션이다 — 백지에서 새로 만드는 게 아니라 기존 구현을 최대한 재사용·재배치한다.

**현재 실제 구현 상태(2026-08-25 기준, 코드를 직접 읽어 확인)**:
- `src/lib/confluence/client.ts`: `movePage`, `restrictPageToAccount`/`clearPageRestrictions`, `listLabels`/`addLabels`/`removeLabel`, `findPublishedPageBySlug`(뷰어별, Space 전체 스캔) 모두 구현 완료. **구조 변경과 무관 — 수정 불필요.**
- `src/lib/editor/access.ts`: `hidePageFromOthers`/`revealPageToSpace` 구현 완료. **수정 불필요.**
- `src/lib/editor/tags.ts`, `tag-suggestions.ts`(내부 로직)는 라벨 기반이라 **수정 불필요**(단, `tag-suggestions.ts`는 `folder.folderId`/`listDocuments` 시그니처를 호출하므로 Task 5에서 호출부만 고친다).
- `src/lib/editor/roots.ts` (`getContentRoots()`), `src/lib/editor/folder.ts`(`PersonalFolder { folderId, spaceKey }`가 "초안 루트" 하위에 이메일 폴더 하나만 둠), `src/lib/editor/documents.ts`의 `listDocuments(folderId, authorEmail)`(초안 폴더 + "게시됨 루트" 전체를 스캔해 `authorMeta`로 본인 문서만 필터링), `src/lib/editor/publish.ts`(전역 `publishedRootId`로 이동) — **모두 이전 설계 기준. 이 플랜에서 재작업.**
- 호출부: `src/app/api/editor/folder/route.ts`, `src/app/api/editor/documents/route.ts`, `src/app/editor/layout.tsx`, `src/lib/editor/tag-suggestions.ts`가 `folder.folderId`를 참조 — Task 5에서 함께 고친다.
- `README.md`의 "🛠️ 최초 1회 운영 작업" 절은 이전 설계의 수동 루트 생성 절차를 설명한다 — 새 설계에서는 이 절차 자체가 없어지므로 Task 6에서 제거한다.

**목표 구조** (상세는 스펙 문서 참고):
```
Space 홈페이지
└── {계정 이메일}  (계정 폴더, 제한 없음)
    ├── 초안  (서비스 계정 전용 제한)
    └── 게시  (제한 없음)
```

## Global Constraints

- 기존 코드의 검증된 안전장치를 새 구조로 옮길 때 그대로 보존한다:
  - `publish.ts`는 저장된 `isPublished` 플래그가 아니라 **실제 페이지 위치**로 게시 여부를 판단한다(재시도 안전성).
  - 물리적 이동(`movePage`)·제한 토글은 메타데이터 기록(`upsertPageProperty`)보다 **항상 먼저** 수행한다.
  - 게시 취소 시 **제한을 먼저 걸고 나서** 이동한다(이동 후 제한 실패 시 노출 창이 생기는 것을 막기 위함).
- `listChildPages`의 페이지네이션(`_links.next` 끝까지 따라가기)은 그대로 재사용한다 — 새로 페이지네이션 로직을 작성하지 않는다.
- React `cache()`를 이용한 `listDocuments` 요청 내 dedup은 유지한다.
- 계정 폴더 자신과 "게시" 서브페이지·문서에는 Restriction을 걸지 않는다. "초안" 서브페이지와 그 문서에만 건다.
- 각 Task는 반드시 `npm test -- <파일명>`으로 해당 테스트가 통과하는 것을 먼저 확인한 뒤 다음 Task로 넘어간다. 전체 마이그레이션이 끝나면 Task 7에서 `npm test`(전체) + `npm run lint`를 한 번 더 돌려 회귀가 없는지 확인한다.
- 기존 실사용 데이터가 없으므로 마이그레이션 스크립트를 작성하지 않는다(문서 이동/스캔이 목적).

---

## Task 1: `roots.ts` 제거

전역 "초안"/"게시됨" 루트 조회 자체가 더 이상 존재하지 않으므로 파일을 삭제한다. 삭제 시점에는 아직 `folder.ts`/`documents.ts`/`publish.ts`가 이 파일을 참조하므로, 이 Task는 Task 2~4와 같은 커밋으로 묶거나 이후 Task들이 즉시 뒤따르게 한다(중간에 빌드가 깨진 상태로 커밋하지 않는다 — 한 Task 안에서 삭제와 마지막 참조 제거를 함께 끝낸다).

**Files:**
- Delete: `src/lib/editor/roots.ts`, `src/lib/editor/roots.test.ts`

- [ ] **Step 1**: `src/lib/editor/roots.ts`, `src/lib/editor/roots.test.ts` 삭제. 이 시점에서는 `folder.ts`/`documents.ts`/`publish.ts`가 여전히 `./roots`를 import하므로 타입체크가 깨진다 — Task 2로 바로 이어가서 고친다(같은 작업 단위로 취급, 중간 커밋 없음).

---

## Task 2: `folder.ts` 개편 — 계정 폴더 + 초안/게시 서브폴더

**Files:**
- Modify: `src/lib/editor/folder.ts` (전체 재작성)
- Modify: `src/lib/editor/folder.test.ts` (전체 재작성)

**Interfaces:**
- Consumes: `hidePageFromOthers`(`./access`, 기존 그대로), `createPage`/`findChildPageByTitle`/`getConfiguredSpace`(`@/lib/confluence/client`, 기존 그대로)
- Produces: `export interface PersonalFolder { accountFolderId: string; draftFolderId: string; publishedFolderId: string; spaceKey: string }`, `findPersonalFolder(email)`, `createPersonalFolder(email)` — Task 3(`documents.ts`)·Task 4(`publish.ts`)·Task 5(호출부)가 새 필드명을 사용한다.

- [ ] **Step 1**: `src/lib/editor/folder.test.ts`를 다음 기준으로 다시 쓴다(기존 `roots` 모킹 제거, `client.findChildPageByTitle`/`client.createPage`를 부모/제목 조합으로 분기):
  - `findPersonalFolder`: (a) Space 홈페이지 하위에서 이메일 제목 계정 폴더를 찾고, 그 하위에서 "초안"/"게시" 두 서브폴더를 찾아 `{ accountFolderId, draftFolderId, publishedFolderId, spaceKey }`를 반환. (b) 계정 폴더가 없으면 `null`. (c) 계정 폴더는 있는데 서브폴더 중 하나라도 없으면 에러를 던진다(데이터 손상 케이스).
  - `createPersonalFolder`: (a) 계정 폴더(제한 없음) + "초안"(제한 있음) + "게시"(제한 없음) 3개를 만들고 `hidePageFromOthers`가 "초안" 페이지 id로만 호출됐는지(계정 폴더/게시 페이지 id로는 호출되지 않았는지) 확인. (b) 이미 계정 폴더가 있으면 `ConflictError`.
  - 참고 스타일: `src/lib/editor/access.test.ts`, 마이그레이션 전 `folder.test.ts`(git history)와 동일한 `vi.spyOn` 패턴을 따른다.
- [ ] **Step 2**: 테스트 실행 → 실패 확인(`npm test -- folder.test.ts`).
- [ ] **Step 3**: `src/lib/editor/folder.ts`를 아래 로직으로 재작성한다.

  ```ts
  import { createPage, findChildPageByTitle, getConfiguredSpace } from "@/lib/confluence/client";
  import { hidePageFromOthers } from "./access";
  import { ConflictError } from "./errors";

  const DRAFT_SUBFOLDER_TITLE = "초안";
  const PUBLISHED_SUBFOLDER_TITLE = "게시";

  export interface PersonalFolder {
    accountFolderId: string;
    draftFolderId: string;
    publishedFolderId: string;
    spaceKey: string;
  }

  async function getSpaceHomepageId() {
    const space = await getConfiguredSpace();
    if (!space.homepageId) {
      throw new Error("Confluence Space에 홈페이지가 설정되어 있지 않습니다.");
    }
    return { id: space.id, key: space.key, homepageId: space.homepageId };
  }

  export async function findPersonalFolder(email: string): Promise<PersonalFolder | null> {
    const space = await getSpaceHomepageId();
    const accountFolder = await findChildPageByTitle(space.homepageId, email);
    if (!accountFolder) return null;

    const [draftFolder, publishedFolder] = await Promise.all([
      findChildPageByTitle(accountFolder.id, DRAFT_SUBFOLDER_TITLE),
      findChildPageByTitle(accountFolder.id, PUBLISHED_SUBFOLDER_TITLE),
    ]);
    if (!draftFolder || !publishedFolder) {
      throw new Error(
        `계정 폴더(${email}) 하위에 "${DRAFT_SUBFOLDER_TITLE}"/"${PUBLISHED_SUBFOLDER_TITLE}" 서브폴더가 없습니다.`
      );
    }

    return {
      accountFolderId: accountFolder.id,
      draftFolderId: draftFolder.id,
      publishedFolderId: publishedFolder.id,
      spaceKey: space.key,
    };
  }

  export async function createPersonalFolder(email: string): Promise<PersonalFolder> {
    const space = await getSpaceHomepageId();

    const existing = await findChildPageByTitle(space.homepageId, email);
    if (existing) {
      throw new ConflictError("개인 폴더가 이미 존재합니다.");
    }

    const accountFolder = await createPage({
      spaceId: space.id,
      parentId: space.homepageId,
      title: email,
      bodyValue: `<p>${email}님의 문서함입니다.</p>`,
    });

    const [draftFolder, publishedFolder] = await Promise.all([
      createPage({
        spaceId: space.id,
        parentId: accountFolder.id,
        title: DRAFT_SUBFOLDER_TITLE,
        bodyValue: "<p>작성 중인 초안입니다. 작성자 본인 외에는 보이지 않습니다.</p>",
      }),
      createPage({
        spaceId: space.id,
        parentId: accountFolder.id,
        title: PUBLISHED_SUBFOLDER_TITLE,
        bodyValue: "<p>게시된 문서입니다.</p>",
      }),
    ]);

    await hidePageFromOthers(draftFolder.id);

    return {
      accountFolderId: accountFolder.id,
      draftFolderId: draftFolder.id,
      publishedFolderId: publishedFolder.id,
      spaceKey: space.key,
    };
  }
  ```

- [ ] **Step 4**: `npm test -- folder.test.ts` 통과 확인. (이 시점에는 `documents.ts`/`publish.ts`가 아직 옛 시그니처를 참조해 `npm run build`/전체 테스트는 깨질 수 있음 — Task 3·4까지 마친 뒤 정상화된다.)
- [ ] **Step 5**: Commit (`feat: rebuild personal folder as account/draft/published subfolders`) — Task 1의 `roots.ts` 삭제도 이 커밋에 포함한다.

---

## Task 3: `documents.ts` 개편 — `listDocuments` 단순화(계정 내부 병합으로 전환)

**Files:**
- Modify: `src/lib/editor/documents.ts` (`listDocuments`만)
- Modify: `src/lib/editor/documents.test.ts` (`listDocuments` 관련 describe 블록들)

**Interfaces:**
- Consumes: `listChildPages`(`@/lib/confluence/client`, 그대로), `getPublishState`(`./publish`, 그대로), `getTags`(`./tags`, 그대로)
- Produces: `listDocuments(folders: { draftFolderId: string; publishedFolderId: string }): Promise<DocumentSummary[]>` — **시그니처 변경**(기존 `listDocuments(folderId, authorEmail)`에서 `authorEmail` 파라미터와 `getContentRoots()`/공유 게시됨 루트 스캔 로직이 사라진다. 계정별 "게시" 서브폴더 자체가 이미 그 작성자 소유 문서만 담고 있으므로 `authorMeta` 소유권 필터링이 더 이상 필요 없다 — 성능상으로도 개선: 이전에는 Space 전체 게시 문서를 스캔해 매번 `authorMeta`를 조회했다). Task 5가 새 시그니처로 호출부를 갱신한다.

- [ ] **Step 1**: `documents.test.ts`의 `describe("listDocuments", ...)`와 `describe("listDocuments 요청 내 중복 조회 방지 (React cache)", ...)` 블록을 다음 기준으로 다시 쓴다:
  - `roots` 모킹 제거. `client.listChildPages`를 `draftFolderId`/`publishedFolderId`로 분기해 각각의 자식을 반환하도록 스텁.
  - `listDocuments({ draftFolderId: "draft-1", publishedFolderId: "published-1" })` 형태로 호출.
  - "초안만 있으면 초안만", "게시된 문서도 함께 반환", "각 문서의 게시 상태·태그 포함" 세 케이스는 유지하되 `authorMeta` 소유권 필터링 관련 모킹(`readAuthorEmail`을 위한 `getPageProperty` 스텁)은 제거한다(더 이상 그 필터를 거치지 않으므로).
  - React cache dedup 테스트는 같은 `(draftFolderId, publishedFolderId)` 튜플로 두 번 호출해 `listChildPages`가 폴더당 한 번만 불렸는지 확인하도록 바꾼다.
- [ ] **Step 2**: `npm test -- documents.test.ts` → 실패 확인.
- [ ] **Step 3**: `documents.ts` 상단 `import { getContentRoots } from "./roots";` 제거, `listDocuments`를 아래로 교체한다.

  ```ts
  export const listDocuments = cache(async function listDocuments(folders: {
    draftFolderId: string;
    publishedFolderId: string;
  }): Promise<DocumentSummary[]> {
    const [draftPages, publishedPages] = await Promise.all([
      listChildPages(folders.draftFolderId),
      listChildPages(folders.publishedFolderId),
    ]);

    return Promise.all(
      [...draftPages, ...publishedPages].map(async (page) => {
        const [publishState, tagList] = await Promise.all([
          getPublishState(page.id),
          getTags(page.id),
        ]);
        return {
          pageId: page.id,
          title: page.title,
          updatedAt: page.version.createdAt,
          isPublished: publishState.isPublished,
          tags: tagList,
        };
      })
    );
  });
  ```

  (draft/published 두 폴더는 서로 다른 페이지 집합이므로 기존의 `seen`/`Set` 중복 제거, `readAuthorEmail`을 이용한 소유권 필터링 코드는 전부 삭제한다. `readAuthorEmail`이 다른 곳(예: `requireDocumentOwner`)에서도 쓰이는지 확인 후, 안 쓰이면 그 함수도 함께 정리한다 — 실제로 `requireDocumentOwner`가 별도로 `getPageProperty`를 호출하는지 코드를 다시 확인할 것.)

- [ ] **Step 4**: `npm test -- documents.test.ts` 통과 확인.
- [ ] **Step 5**: Commit (`feat: simplify listDocuments to merge account draft/published folders`).

---

## Task 4: `publish.ts` 개편 — 계정 폴더 기준 게시/게시취소 (병렬로 Task 3과 함께 진행 가능)

**Files:**
- Modify: `src/lib/editor/publish.ts`
- Modify: `src/lib/editor/publish.test.ts`

**Interfaces:**
- Consumes: `movePage`/`getPage`/`getPageProperty`/`upsertPageProperty`/`findPublishedPageBySlug`(그대로), `hidePageFromOthers`/`revealPageToSpace`(그대로), `findPersonalFolder`/`createPersonalFolder`(Task 2 산출물)
- Produces: `setPublishState` 반환 타입·검증 로직은 동일. 내부적으로 게시·게시취소 두 분기 모두 "작성자의 계정 폴더"를 조회해 그 안의 `draftFolderId`/`publishedFolderId` 사이로 이동한다(기존에는 게시 분기만 전역 루트를 쓰고 게시취소 분기만 작성자 조회를 했는데, 두 분기가 대칭이 된다).

- [ ] **Step 1**: `publish.test.ts`에서 `import * as roots from "./roots";`와 관련 `getContentRoots` 모킹을 전부 제거한다. `stubCurrentPage(parentId)`가 반환하는 `parentId`를 "draft-1"/"published-1" 같은 폴더 id로 바꾸고, `isCurrentlyPublished` 판정이 더 이상 `publishedRootId`와의 비교가 아니라 **`getPublishState`가 반환하는 `isPublished` 플래그**(또는 그 대체 판정 방식, Step 3 참고)로 이루어지는지에 맞게 테스트를 조정한다. 두 생명주기 테스트("처음 게시할 때", "게시 취소 시")에서 `folder.findPersonalFolder`가 `{ accountFolderId, draftFolderId, publishedFolderId, spaceKey }`를 반환하도록 스텁하고, `movePage`가 각각 `publishedFolderId`/`draftFolderId`로 호출됐는지 검증한다. "실제 페이지 위치로 판단" 테스트, "이동 실패 시 메타데이터 미기록" 테스트, "제한을 먼저 걸고 이동" 순서 테스트는 그대로 유지한다(계정 폴더 구조로 바뀌어도 이 안전장치들은 동일하게 성립해야 한다).

  > **주의 — `isCurrentlyPublished` 판정 방식 재검토**: 기존 코드는 `currentPage.parentId === publishedRootId`로 전역 비교했다. 계정 폴더 구조에서는 이 비교를 하려면 먼저 작성자의 `publishedFolderId`를 알아야 하는데, 그러려면 먼저 `authorMeta`를 읽어야 한다 — 즉 "실제 위치로 판단"이라는 안전장치를 유지하려면 게시 분기에서도 항상 작성자 조회가 선행되어야 한다(기존에는 게시 분기가 작성자 조회 없이 전역 루트로만 이동했다). 이 변화를 반영해 아래 Step 3 구현에서는 게시·게시취소 두 분기 모두 먼저 `authorMeta`를 읽고 `findPersonalFolder`/`createPersonalFolder`로 계정 폴더를 얻은 뒤, `currentPage.parentId === accountFolder.publishedFolderId`로 판단한다.

- [ ] **Step 2**: `npm test -- publish.test.ts` → 실패 확인.
- [ ] **Step 3**: `publish.ts`를 아래 기준으로 수정한다.

  - import에서 `import { getContentRoots } from "./roots";` 제거, `createPersonalFolder, findPersonalFolder` import를 파일 상단으로 옮긴다(기존에는 게시취소 분기에서만 지역적으로 썼다).
  - 작성자의 계정 폴더를 얻는 헬퍼를 추가한다:
    ```ts
    async function getAuthorFolderOrThrow(pageId: string) {
      const authorProperty = await getPageProperty<{ actualAuthorEmail: string }>(
        pageId,
        AUTHOR_PROPERTY_KEY
      );
      const authorEmail = authorProperty?.value.actualAuthorEmail;
      if (!authorEmail) {
        throw new Error("작성자 정보를 찾을 수 없어 문서를 이동할 수 없습니다.");
      }
      return (await findPersonalFolder(authorEmail)) ?? (await createPersonalFolder(authorEmail));
    }
    ```
  - `setPublishState` 본문 시작 부분을 아래로 교체한다(기존의 `getContentRoots()` 병렬 호출을 `getAuthorFolderOrThrow` 병렬 호출로 대체):
    ```ts
    const [currentPage, authorFolder] = await Promise.all([
      getPage(input.pageId),
      getAuthorFolderOrThrow(input.pageId),
    ]);
    const isCurrentlyPublished = currentPage.parentId === authorFolder.publishedFolderId;
    ```
  - 게시 분기의 `if (!isCurrentlyPublished) { await movePage(input.pageId, publishedRootId); await revealPageToSpace(input.pageId); }`를 `await movePage(input.pageId, authorFolder.publishedFolderId); await revealPageToSpace(input.pageId);`로 바꾼다(변수명만 교체, 순서·조건 동일).
  - 게시취소 분기에서 기존에 별도로 하던 `authorProperty`/`findPersonalFolder`/`createPersonalFolder` 조회를 제거하고(이미 위에서 `authorFolder`를 구했으므로 중복), `movePage(input.pageId, authorFolder.draftFolderId)`로 교체한다. `hidePageFromOthers` 먼저 → `movePage` 나중이라는 기존 순서는 그대로 유지한다.

- [ ] **Step 4**: `npm test -- publish.test.ts` 통과 확인.
- [ ] **Step 5**: Commit (`feat: move documents between account draft/published subfolders on publish toggle`).

---

## Task 5: 호출부 갱신 — API 라우트·레이아웃·태그 자동완성

Task 2~4로 `PersonalFolder`와 `listDocuments`의 시그니처가 바뀌었으므로, 이를 참조하는 4개 파일을 갱신한다. 이 Task 전까지는 `npm run build`/`tsc`가 실패하는 상태다.

**Files:**
- Modify: `src/app/api/editor/folder/route.ts`
- Modify: `src/app/api/editor/documents/route.ts`
- Modify: `src/app/editor/layout.tsx`
- Modify: `src/lib/editor/tag-suggestions.ts` (+ `tag-suggestions.test.ts`)

- [ ] **Step 1**: `src/app/api/editor/folder/route.ts`의 GET/POST 응답을 `folderId` 대신 `accountFolderId`/`draftFolderId`/`publishedFolderId`로 바꾼다(`docs/product/api-spec.md`에 이미 이 응답 형태가 기록돼 있으니 그대로 맞춘다).
- [ ] **Step 2**: `src/app/api/editor/documents/route.ts`:
  - `GET`: `listDocuments(folder.folderId, email)` → `listDocuments({ draftFolderId: folder.draftFolderId, publishedFolderId: folder.publishedFolderId })`.
  - `POST`: `createDocument({ folderId: folder.folderId, ... })` → `createDocument({ folderId: folder.draftFolderId, ... })`(새 문서는 항상 초안으로 생성).
- [ ] **Step 3**: `src/app/editor/layout.tsx`의 `listDocuments(folder.folderId, email)` 호출을 `listDocuments({ draftFolderId: folder.draftFolderId, publishedFolderId: folder.publishedFolderId })`로 바꾼다.
- [ ] **Step 4**: `src/lib/editor/tag-suggestions.ts`의 `listDocuments(folder.folderId, email)` 호출도 동일하게 바꾼다. `tag-suggestions.test.ts`가 `findPersonalFolder`를 모킹하는 부분이 있다면 새 `PersonalFolder` 형태(`accountFolderId`/`draftFolderId`/`publishedFolderId`)로 갱신한다.
- [ ] **Step 5**: `npm test`(전체)와 `npx tsc --noEmit`(또는 `npm run build`)을 돌려 타입 오류·테스트 실패가 없는지 확인한다.
- [ ] **Step 6**: Commit (`feat: update folder/documents call sites for the account-folder structure`).

---

## Task 6: 문서 정리 — README, prd.md, data-spec.md, api-spec.md 최종화

지금까지의 Task로 실제 구현이 새 설계와 일치하게 됐으므로, 남아있던 "재작업 필요"/"대기" 표시를 "완료"로 갱신하고, 더 이상 유효하지 않은 운영 절차를 제거한다.

**Files:**
- Modify: `README.md`
- Modify: `docs/product/prd.md`
- Modify: `docs/product/data-spec.md`

- [ ] **Step 1**: `README.md`의 "🛠️ 최초 1회 운영 작업" 절 전체를 삭제한다(계정 폴더 구조에서는 관리자의 사전 수동 작업이 없다 — 계정 폴더가 없는 사용자가 처음 접근하면 코드가 3개 페이지를 자동 생성한다). 필요하면 "별도 운영 작업 없음"이라는 한 줄로 대체한다.
- [ ] **Step 2**: `docs/product/prd.md`의 Phase 1 체크리스트에서 "(재작업 필요)"로 표시된 항목들을 실제 커밋된 산출물 경로로 "(완료)"로 갱신하고, 상단 진행률 줄의 숫자와 날짜를 갱신한다. "내 문서함 조회" 기능의 "상태" 줄도 "완료"로 바꾼다.
- [ ] **Step 3**: `docs/product/data-spec.md`에서 Task 2 이전에 추가했던 "2026-08-24 설계 개정으로 아래 표는 마이그레이션 대상이다" 안내문을 제거한다(마이그레이션이 끝났으므로).
- [ ] **Step 4**: Commit (`docs: mark account-folder migration complete`).

---

## Task 7: 최종 검증

**Files:** 없음(검증만)

- [ ] **Step 1**: `npm test` 전체 통과 확인.
- [ ] **Step 2**: `npm run lint` 통과 확인(경고 2개는 기존부터 있던 것과 동일한지 확인, 새 에러 없어야 함).
- [ ] **Step 3**: 개발 서버(`npm run dev`)를 띄우고 브라우저로 다음 흐름을 확인한다: 로그인 → `/editor`(빈 문서함, 계정 폴더 최초 생성) → "새 문서" 작성·저장(초안으로 목록에 뜨는지) → 게시 설정에서 게시(목록에서 "게시됨" 뱃지로 바뀌고 사라지지 않는지) → 게시 취소(다시 "초안"으로 바뀌는지). 실제 Confluence 인스턴스에 접근 가능한 `.env`가 있다면 실제로 계정 폴더/초안/게시 서브페이지가 만들어지는지 Confluence UI에서도 확인한다.
- [ ] **Step 4**: 스펙 문서의 "검증이 필요한 가정 4번"(계정 폴더가 열려 있고 그 하위 "초안"만 제한된 상태에서 "게시" 서브페이지가 실제로 열람되는지)은 이 플랜의 범위 밖이다 — 실제 Confluence 인스턴스에 대한 별도 스파이크로 후속 확인이 필요하다는 점을 결과 보고에 남긴다.

## 범위 밖

- 스펙 문서 "검증이 필요한 가정" 4번의 실제 스파이크 실행(운영 중인 Confluence Space에 대한 수동/반자동 검증이 필요 — 별도로 진행).
- 코멘트(Comment) API/화면, 2차 UI/UX 항목 중 이번 구조 변경과 무관한 나머지 작업.
