# Confluence 콘텐츠 구조 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 초안 문서는 작성자 본인 외 다른 직원에게 보이지 않고, 게시하면 Space 전체에 공개되도록 Confluence 콘텐츠 구조를 개편하고, 태그·뷰어별 게시 메타데이터 구조를 도입한다.

**Architecture:** Space 홈페이지 하위에 "초안"/"게시됨" 두 루트 페이지를 두고, 게시 여부에 따라 문서 페이지를 두 루트 사이로 이동(parentId 변경)한다. 숨김은 상속에 의존하지 않고 페이지 생성 시점에 서비스 계정 자신을 대상으로 한 Confluence Restriction을 명시적으로 건다. 기존 계층 구조(`confluence/client.ts` → `editor/*.ts` → `app/api/editor/**` → `app/editor/**`/`components/editor/*`)를 그대로 따른다.

**Tech Stack:** Next.js 16(App Router), TypeScript, next-auth v5, Confluence Cloud REST API(v1/v2), Vitest(신규 도입, 이 저장소에 테스트 러너가 없었음).

**Spec:** [docs/superpowers/specs/2026-08-21-confluence-content-structure-design.md](../specs/2026-08-21-confluence-content-structure-design.md)

## Global Constraints

- 모든 Confluence 쓰기는 항상 공용 서비스 계정(`CONFLUENCE_EMAIL`/`CONFLUENCE_API_TOKEN`)으로만 이루어진다. 직원 개인 Confluence 계정을 조회하거나 매핑하는 코드를 추가하지 않는다.
- 초안 숨김의 제한 대상은 서비스 계정 자신(`getCurrentConfluenceUser()`의 accountId)이다.
- 페이지 생성 시점에 명시적으로 Restriction을 걸어야 한다 — 부모 페이지의 Restriction이 하위 페이지에 상속된다고 가정하지 않는다.
- 게시됨 루트 하위는 평평한 목록이다 — 작성자별 하위 폴더를 만들지 않는다.
- 새 문서의 초기 내용은 빈 백지(제목+본문)를 유지한다 — 템플릿을 추가하지 않는다.
- 댓글(footer comment) 관련 API·화면은 이 플랜의 범위 밖이다. `commenterMeta` 스키마는 문서화만 하면 되고(이미 `docs/product/data-spec.md`에 반영됨), 코드를 작성하지 않는다.
- 기존 실사용 데이터가 없으므로 마이그레이션 스크립트를 작성하지 않는다.
- 태그 입력 UI, 게시 설정 화면의 뷰어별 UI 확장 등 "편집 경험" 성격의 UI 개선은 2차 서브 프로젝트(개인 에디터 기능 강화) 범위이며, 이 플랜에서는 기존 화면이 계속 동작하도록 최소한으로만 맞춘다.

---

## Task 1: 스파이크 — Confluence API 가정 검증

이 작업은 코드를 작성하지 않는다. 실제 Confluence 인스턴스(테스트 가능한 Space)에 대해 스펙 문서의 "검증이 필요한 가정" 3가지를 직접 확인하고 결과를 기록한다. 이후 모든 코드 작업(Task 4, 5)이 이 결과에 의존한다.

**Files:**
- Modify: `docs/superpowers/specs/2026-08-21-confluence-content-structure-design.md` (검증 결과 기록)

**Interfaces:**
- Consumes: 없음 (수동 API 호출)
- Produces: 스펙 문서에 기록된 3가지 검증 결과(✅/❌ + 실제 응답 형식) — Task 4·5가 이 결과를 참고해 구현을 조정한다.

- [ ] **Step 1: 테스트용 문서 페이지 하나 준비**

`.env`에 설정된 실제 Confluence Space에, 이번 스파이크 전용으로 지울 수 있는 테스트 페이지를 하나 만든다(Confluence UI에서 직접 만들어도 되고, 기존 `POST /api/editor/documents`로 만들어도 된다). 이 페이지의 `pageId`를 기록해 둔다.

- [ ] **Step 2: parentId 변경(페이지 이동) 지원 여부 확인**

`.env`의 값으로 아래를 채워 실행한다(실제 토큰 값은 터미널 히스토리 외 어디에도 남기지 않는다):

```bash
curl -s -u "$CONFLUENCE_EMAIL:$CONFLUENCE_API_TOKEN" \
  -X PUT "$CONFLUENCE_BASE_URL/api/v2/pages/<테스트pageId>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "<테스트pageId>",
    "status": "current",
    "title": "<현재 제목 그대로>",
    "parentId": "<다른 페이지 ID>",
    "version": { "number": <현재 버전+1> }
  }'
```

응답의 `parentId`가 요청한 값으로 바뀌어 있는지 확인한다. 200이 아니거나 `parentId`가 안 바뀌면 실패로 기록한다.

- [ ] **Step 3: 페이지 Restriction API 확인**

```bash
curl -s -u "$CONFLUENCE_EMAIL:$CONFLUENCE_API_TOKEN" \
  -X PUT "$CONFLUENCE_BASE_URL/rest/api/content/<테스트pageId>/restriction" \
  -H "Content-Type: application/json" \
  -d '[
    {"operation":"read","restrictions":{"user":[{"type":"known","accountId":"<서비스 계정 accountId>"}]}},
    {"operation":"update","restrictions":{"user":[{"type":"known","accountId":"<서비스 계정 accountId>"}]}}
  ]'
```

서비스 계정의 accountId는 `GET $CONFLUENCE_BASE_URL/rest/api/user/current`로 먼저 확인한다. 200이 오는지, 그리고 이어서 `GET $CONFLUENCE_BASE_URL/rest/api/content/<테스트pageId>/restriction`으로 실제 반영됐는지 확인한다.

- [ ] **Step 4: 자기 자신에게 건 제한이 자기 API 호출을 막는지 확인**

Step 3의 제한을 건 상태에서, 같은 서비스 계정으로 `GET $CONFLUENCE_BASE_URL/api/v2/pages/<테스트pageId>?body-format=storage`를 호출해 200이 오는지 확인한다.

- [ ] **Step 5: 결과를 스펙 문서에 기록하고 커밋**

`docs/superpowers/specs/2026-08-21-confluence-content-structure-design.md`의 "검증이 필요한 가정" 절 각 항목 옆에 결과를 추가한다. 예:

```markdown
1. ... parentId 변경 지원 여부.
   → ✅ 확인됨(2026-XX-XX). `PUT /api/v2/pages/{id}`에 `parentId` 필드를 포함하면 실제로 이동한다.
```

세 항목 중 하나라도 예상과 다르게 나오면(예: v2가 이동을 지원하지 않아 v1 API가 필요하거나, restriction 엔드포인트 경로/바디 형식이 다르거나), 그 내용도 그대로 기록한다. Task 4·5는 이 기록을 기준으로 조정한다.

테스트용으로 만든 페이지는 삭제한다.

```bash
git add docs/superpowers/specs/2026-08-21-confluence-content-structure-design.md
git commit -m "docs: record Confluence API spike results"
```

---

## Task 2: 테스트 러너 도입 (Vitest)

이 저장소에는 테스트 러너가 없다. 이후 모든 TDD 작업이 이 설정에 의존하므로 먼저 도입한다.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/editor/markdown.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `npm test` 명령, `@/*` 별칭이 적용된 Vitest 환경 — 이후 모든 Task의 테스트가 이 설정을 사용한다.

- [ ] **Step 1: Vitest 설치**

```bash
npm install --save-dev vitest
```

- [ ] **Step 2: `package.json`에 test 스크립트 추가**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest run"
  }
}
```

- [ ] **Step 3: `vitest.config.ts` 작성**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 4: 스모크 테스트 작성 (기존 순수 함수 대상)**

```ts
// src/lib/editor/markdown.test.ts
import { describe, expect, it } from "vitest";
import { buildAttachmentImageReference, markdownToStorageFormat } from "./markdown";

describe("markdown", () => {
  it("buildAttachmentImageReference는 confluence-attachment:// 스킴을 만든다", () => {
    expect(buildAttachmentImageReference("photo.png")).toBe(
      "confluence-attachment://photo.png"
    );
  });

  it("markdownToStorageFormat은 첨부 이미지 참조를 ac:image 매크로로 변환한다", () => {
    const html = markdownToStorageFormat(
      `![photo](${buildAttachmentImageReference("photo.png")})`
    );
    expect(html).toContain('<ac:image><ri:attachment ri:filename="photo.png" /></ac:image>');
  });
});
```

- [ ] **Step 5: 테스트 실행 및 통과 확인**

Run: `npm test`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/editor/markdown.test.ts
git commit -m "test: add vitest test runner"
```

---

## Task 3: `confluence/client.ts` — `getCurrentConfluenceUser` 타입화 + `movePage` 추가

**Files:**
- Modify: `src/lib/confluence/client.ts:56-58` (getCurrentConfluenceUser)
- Test: `src/lib/confluence/client.test.ts`

**Interfaces:**
- Consumes: 기존 `confluenceRequest`, `getPage`(같은 파일)
- Produces: `export interface ConfluenceUser { accountId: string }`, `export async function getCurrentConfluenceUser(): Promise<ConfluenceUser>`, `export async function movePage(pageId: string, newParentId: string): Promise<ConfluencePage>` — Task 7(access.ts)이 `getCurrentConfluenceUser`를, Task 10(publish.ts)이 `movePage`를 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/lib/confluence/client.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentConfluenceUser, movePage } from "./client";

const BASE_URL = "https://test.atlassian.net/wiki";

beforeEach(() => {
  process.env.CONFLUENCE_BASE_URL = BASE_URL;
  process.env.CONFLUENCE_EMAIL = "service@example.com";
  process.env.CONFLUENCE_API_TOKEN = "test-token";
  vi.restoreAllMocks();
});

describe("getCurrentConfluenceUser", () => {
  it("서비스 계정의 accountId를 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ accountId: "acc-1" }), { status: 200 }))
    );

    const user = await getCurrentConfluenceUser();

    expect(user.accountId).toBe("acc-1");
  });
});

describe("movePage", () => {
  it("현재 페이지를 조회한 뒤 parentId를 바꿔 PUT 요청을 보낸다", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init || init.method === undefined) {
        return new Response(
          JSON.stringify({
            id: "111",
            status: "current",
            title: "문서 A",
            spaceId: "1",
            parentId: "222",
            version: { number: 3, createdAt: "2026-08-21T00:00:00.000Z" },
            body: { storage: { value: "<p>내용</p>", representation: "storage" } },
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          id: "111",
          status: "current",
          title: "문서 A",
          spaceId: "1",
          parentId: "999",
          version: { number: 4, createdAt: "2026-08-21T00:00:00.000Z" },
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await movePage("111", "999");

    expect(result.parentId).toBe("999");
    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(putCall).toBeDefined();
    const body = JSON.parse((putCall![1] as RequestInit).body as string);
    expect(body.parentId).toBe("999");
    expect(body.version.number).toBe(4);
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- client.test.ts`
Expected: FAIL (`movePage` is not exported, `getCurrentConfluenceUser` 반환 타입 관련 타입 오류 없음이지만 함수 자체는 아직 존재)

- [ ] **Step 3: 구현**

`src/lib/confluence/client.ts`의 기존 56-58번째 줄:

```ts
export async function getCurrentConfluenceUser() {
  return confluenceRequest("/rest/api/user/current");
}
```

을 아래로 교체한다:

```ts
export interface ConfluenceUser {
  accountId: string;
}

export async function getCurrentConfluenceUser(): Promise<ConfluenceUser> {
  return confluenceRequest<ConfluenceUser>("/rest/api/user/current");
}

export async function movePage(
  pageId: string,
  newParentId: string
): Promise<ConfluencePage> {
  const current = await getPage(pageId);

  return confluenceRequest<ConfluencePage>(`/api/v2/pages/${pageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: pageId,
      status: "current",
      title: current.title,
      parentId: newParentId,
      body: current.body
        ? { representation: "storage", value: current.body.storage.value }
        : undefined,
      version: { number: current.version.number + 1 },
    }),
  });
}
```

Task 1의 스파이크에서 `parentId` 필드 방식이 아닌 다른 방식이 필요하다고 확인됐다면, 이 요청 바디를 그 결과에 맞게 조정한다.

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- client.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/confluence/client.ts src/lib/confluence/client.test.ts
git commit -m "feat: type getCurrentConfluenceUser and add movePage"
```

---

## Task 4: `confluence/client.ts` — 페이지 Restriction 적용/해제 함수 추가

**Files:**
- Modify: `src/lib/confluence/client.ts`
- Test: `src/lib/confluence/client.test.ts`

**Interfaces:**
- Consumes: `confluenceRequest`(같은 파일)
- Produces: `export async function restrictPageToAccount(pageId: string, accountId: string): Promise<void>`, `export async function clearPageRestrictions(pageId: string): Promise<void>` — Task 7(access.ts)이 이 둘을 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성 (기존 `client.test.ts`에 추가)**

```ts
describe("restrictPageToAccount", () => {
  it("read/update 제한을 지정한 accountId로 PUT 요청을 보낸다", async () => {
    const fetchMock = vi.fn(
      async () => new Response(null, { status: 204 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await restrictPageToAccount("111", "acc-service");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/rest/api/content/111/restriction`);
    expect(init?.method).toBe("PUT");
    const body = JSON.parse(init!.body as string);
    expect(body).toEqual([
      { operation: "read", restrictions: { user: [{ type: "known", accountId: "acc-service" }] } },
      { operation: "update", restrictions: { user: [{ type: "known", accountId: "acc-service" }] } },
    ]);
  });
});

describe("clearPageRestrictions", () => {
  it("read/update 제한을 빈 목록으로 PUT 요청을 보낸다", async () => {
    const fetchMock = vi.fn(
      async () => new Response(null, { status: 204 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await clearPageRestrictions("111");

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body).toEqual([
      { operation: "read", restrictions: { user: [] } },
      { operation: "update", restrictions: { user: [] } },
    ]);
  });
});
```

`import`문에 `clearPageRestrictions`, `restrictPageToAccount`를 추가한다.

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- client.test.ts`
Expected: FAIL (두 함수 모두 export되지 않음)

- [ ] **Step 3: 구현**

`src/lib/confluence/client.ts`의 Footer Comments 절 앞(또는 뒤)에 추가한다:

```ts
// ── Restrictions (v1 REST API — v2에는 페이지 제한 엔드포인트가 없음) ──

export async function restrictPageToAccount(
  pageId: string,
  accountId: string
): Promise<void> {
  await confluenceRequest<void>(`/rest/api/content/${pageId}/restriction`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([
      {
        operation: "read",
        restrictions: { user: [{ type: "known", accountId }] },
      },
      {
        operation: "update",
        restrictions: { user: [{ type: "known", accountId }] },
      },
    ]),
  });
}

export async function clearPageRestrictions(pageId: string): Promise<void> {
  await confluenceRequest<void>(`/rest/api/content/${pageId}/restriction`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([
      { operation: "read", restrictions: { user: [] } },
      { operation: "update", restrictions: { user: [] } },
    ]),
  });
}
```

Task 1의 스파이크에서 경로나 바디 형식이 다르게 확인됐다면 이 구현을 그 결과에 맞게 조정한다.

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/confluence/client.ts src/lib/confluence/client.test.ts
git commit -m "feat: add Confluence page restriction helpers"
```

---

## Task 5: `confluence/client.ts` — 라벨(태그) API 래퍼 추가

**Files:**
- Modify: `src/lib/confluence/client.ts`
- Test: `src/lib/confluence/client.test.ts`

**Interfaces:**
- Consumes: `confluenceRequest`(같은 파일)
- Produces: `export interface ConfluenceLabel { id: string; name: string }`, `export async function listLabels(pageId: string): Promise<ConfluenceLabel[]>`, `export async function addLabels(pageId: string, labels: string[]): Promise<void>`, `export async function removeLabel(pageId: string, name: string): Promise<void>` — Task 13(editor/tags.ts)이 이 셋을 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성 (기존 `client.test.ts`에 추가)**

```ts
describe("listLabels", () => {
  it("페이지에 붙은 라벨 목록을 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ results: [{ id: "1", name: "React" }] }),
            { status: 200 }
          )
      )
    );

    const labels = await listLabels("111");

    expect(labels).toEqual([{ id: "1", name: "React" }]);
  });
});

describe("addLabels", () => {
  it("global prefix로 라벨을 추가하는 POST 요청을 보낸다", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ results: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await addLabels("111", ["React", "Backend"]);

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init!.body as string)).toEqual([
      { prefix: "global", name: "React" },
      { prefix: "global", name: "Backend" },
    ]);
  });
});

describe("removeLabel", () => {
  it("이름으로 라벨을 삭제하는 DELETE 요청을 보낸다", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await removeLabel("111", "React");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/rest/api/content/111/label?name=React`);
    expect(init?.method).toBe("DELETE");
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- client.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현**

```ts
// ── Labels (태그) ──

export interface ConfluenceLabel {
  id: string;
  name: string;
}

export async function listLabels(pageId: string): Promise<ConfluenceLabel[]> {
  const result = await confluenceRequest<{ results: ConfluenceLabel[] }>(
    `/rest/api/content/${pageId}/label`
  );
  return result.results;
}

export async function addLabels(pageId: string, labels: string[]): Promise<void> {
  await confluenceRequest<{ results: ConfluenceLabel[] }>(
    `/rest/api/content/${pageId}/label`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(labels.map((name) => ({ prefix: "global", name }))),
    }
  );
}

export async function removeLabel(pageId: string, name: string): Promise<void> {
  await confluenceRequest<void>(
    `/rest/api/content/${pageId}/label?name=${encodeURIComponent(name)}`,
    { method: "DELETE" }
  );
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/confluence/client.ts src/lib/confluence/client.test.ts
git commit -m "feat: add Confluence label helpers for tags"
```

---

## Task 6: `confluence/client.ts` — `findPublishedPageBySlug` 뷰어별 검사로 변경

**Files:**
- Modify: `src/lib/confluence/client.ts:286-316`
- Test: `src/lib/confluence/client.test.ts`

**Interfaces:**
- Consumes: `confluenceRequest`, `getPageProperty`(같은 파일)
- Produces: `export async function findPublishedPageBySlug(spaceId: string, viewerId: string, slug: string, propertyKey: string): Promise<ConfluencePage | null>` (기존 시그니처에 `viewerId` 파라미터 추가) — Task 10(publish.ts)이 이 새 시그니처로 호출한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
describe("findPublishedPageBySlug", () => {
  it("지정한 viewerId의 slug가 일치하는 페이지를 찾는다", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/pages?limit=100")) {
        return new Response(
          JSON.stringify({
            results: [
              { id: "1", status: "current", title: "A", spaceId: "1", parentId: null, version: { number: 1, createdAt: "" } },
              { id: "2", status: "current", title: "B", spaceId: "1", parentId: null, version: { number: 1, createdAt: "" } },
            ],
            _links: {},
          }),
          { status: 200 }
        );
      }
      if (url.includes("/pages/1/properties")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: "p1",
                key: "publishMetadata",
                value: { viewers: { "tech-blog": { slug: "other-post" } } },
                version: { number: 1 },
              },
            ],
          }),
          { status: 200 }
        );
      }
      if (url.includes("/pages/2/properties")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: "p2",
                key: "publishMetadata",
                value: { viewers: { "tech-blog": { slug: "my-post" } } },
                version: { number: 1 },
              },
            ],
          }),
          { status: 200 }
        );
      }
      throw new Error(`unexpected url: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await findPublishedPageBySlug("1", "tech-blog", "my-post", "publishMetadata");

    expect(result?.id).toBe("2");
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- client.test.ts`
Expected: FAIL (함수가 3개 인자만 받음)

- [ ] **Step 3: 구현**

기존(286-316번째 줄 부근):

```ts
export async function findPublishedPageBySlug(
  spaceId: string,
  slug: string,
  propertyKey: string
): Promise<ConfluencePage | null> {
  let cursor: string | null = null;

  do {
    const query: string = cursor
      ? cursor
      : `/api/v2/spaces/${spaceId}/pages?limit=100`;
    const page = await confluenceRequest<{
      results: ConfluencePage[];
      _links: { next?: string };
    }>(query);

    for (const candidate of page.results) {
      const property = await getPageProperty<{ slug?: string }>(
        candidate.id,
        propertyKey
      );
      if (property?.value?.slug === slug) {
        return candidate;
      }
    }

    cursor = page._links.next ?? null;
  } while (cursor);

  return null;
}
```

을 아래로 교체:

```ts
export async function findPublishedPageBySlug(
  spaceId: string,
  viewerId: string,
  slug: string,
  propertyKey: string
): Promise<ConfluencePage | null> {
  let cursor: string | null = null;

  do {
    const query: string = cursor
      ? cursor
      : `/api/v2/spaces/${spaceId}/pages?limit=100`;
    const page = await confluenceRequest<{
      results: ConfluencePage[];
      _links: { next?: string };
    }>(query);

    for (const candidate of page.results) {
      const property = await getPageProperty<{
        viewers?: Record<string, { slug?: string }>;
      }>(candidate.id, propertyKey);
      if (property?.value?.viewers?.[viewerId]?.slug === slug) {
        return candidate;
      }
    }

    cursor = page._links.next ?? null;
  } while (cursor);

  return null;
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/confluence/client.ts src/lib/confluence/client.test.ts
git commit -m "feat: check slug uniqueness per viewer"
```

---

## Task 7: `editor/roots.ts` + `editor/access.ts` 신규 작성

**Files:**
- Create: `src/lib/editor/roots.ts`
- Create: `src/lib/editor/access.ts`
- Test: `src/lib/editor/roots.test.ts`
- Test: `src/lib/editor/access.test.ts`

**Interfaces:**
- Consumes: `getConfiguredSpace`, `findChildPageByTitle`, `getCurrentConfluenceUser`, `restrictPageToAccount`, `clearPageRestrictions` (모두 `@/lib/confluence/client`, Task 3·4 산출물)
- Produces: `export interface ContentRoots { draftsRootId: string; publishedRootId: string }`, `export async function getContentRoots(): Promise<ContentRoots>` (roots.ts) / `export async function hidePageFromOthers(pageId: string): Promise<void>`, `export async function revealPageToSpace(pageId: string): Promise<void>` (access.ts) — Task 8·9·10·11이 이 네 함수를 사용한다.

- [ ] **Step 1: `roots.ts` 실패하는 테스트 작성**

```ts
// src/lib/editor/roots.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import { getContentRoots } from "./roots";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("getContentRoots", () => {
  it("Space 홈페이지 하위의 초안/게시됨 루트 페이지 ID를 반환한다", async () => {
    vi.spyOn(client, "getConfiguredSpace").mockResolvedValue({
      id: "1",
      key: "SFOODIT",
      homepageId: "home-1",
    });
    vi.spyOn(client, "findChildPageByTitle").mockImplementation(async (_parentId, title) => {
      if (title === "초안") {
        return { id: "drafts-1", status: "current", title: "초안", spaceId: "1", parentId: "home-1", version: { number: 1, createdAt: "" } };
      }
      if (title === "게시됨") {
        return { id: "published-1", status: "current", title: "게시됨", spaceId: "1", parentId: "home-1", version: { number: 1, createdAt: "" } };
      }
      return null;
    });

    const roots = await getContentRoots();

    expect(roots).toEqual({ draftsRootId: "drafts-1", publishedRootId: "published-1" });
  });

  it("루트 페이지가 없으면 에러를 던진다", async () => {
    vi.spyOn(client, "getConfiguredSpace").mockResolvedValue({
      id: "1",
      key: "SFOODIT",
      homepageId: "home-1",
    });
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(null);

    await expect(getContentRoots()).rejects.toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- roots.test.ts`
Expected: FAIL (`./roots` 모듈 없음)

- [ ] **Step 3: `roots.ts` 구현**

```ts
// src/lib/editor/roots.ts
import { findChildPageByTitle, getConfiguredSpace } from "@/lib/confluence/client";

const DRAFTS_ROOT_TITLE = "초안";
const PUBLISHED_ROOT_TITLE = "게시됨";

export interface ContentRoots {
  draftsRootId: string;
  publishedRootId: string;
}

export async function getContentRoots(): Promise<ContentRoots> {
  const space = await getConfiguredSpace();
  if (!space.homepageId) {
    throw new Error("Confluence Space에 홈페이지가 설정되어 있지 않습니다.");
  }

  const [draftsRoot, publishedRoot] = await Promise.all([
    findChildPageByTitle(space.homepageId, DRAFTS_ROOT_TITLE),
    findChildPageByTitle(space.homepageId, PUBLISHED_ROOT_TITLE),
  ]);

  if (!draftsRoot || !publishedRoot) {
    throw new Error(
      `Confluence Space에 "${DRAFTS_ROOT_TITLE}"/"${PUBLISHED_ROOT_TITLE}" 루트 페이지가 준비되어 있지 않습니다. 운영자가 두 페이지를 먼저 만들고 "${DRAFTS_ROOT_TITLE}"에 권한 제한을 설정해야 합니다.`
    );
  }

  return { draftsRootId: draftsRoot.id, publishedRootId: publishedRoot.id };
}
```

- [ ] **Step 4: `roots.ts` 테스트 통과 확인**

Run: `npm test -- roots.test.ts`
Expected: PASS

- [ ] **Step 5: `access.ts` 실패하는 테스트 작성**

```ts
// src/lib/editor/access.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import { hidePageFromOthers, revealPageToSpace } from "./access";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("hidePageFromOthers", () => {
  it("서비스 계정 자신의 accountId로 페이지를 제한한다", async () => {
    vi.spyOn(client, "getCurrentConfluenceUser").mockResolvedValue({ accountId: "acc-service" });
    const restrictSpy = vi.spyOn(client, "restrictPageToAccount").mockResolvedValue(undefined);

    await hidePageFromOthers("111");

    expect(restrictSpy).toHaveBeenCalledWith("111", "acc-service");
  });
});

describe("revealPageToSpace", () => {
  it("페이지 제한을 해제한다", async () => {
    const clearSpy = vi.spyOn(client, "clearPageRestrictions").mockResolvedValue(undefined);

    await revealPageToSpace("111");

    expect(clearSpy).toHaveBeenCalledWith("111");
  });
});
```

- [ ] **Step 6: 테스트 실행 → 실패 확인**

Run: `npm test -- access.test.ts`
Expected: FAIL (`./access` 모듈 없음)

- [ ] **Step 7: `access.ts` 구현**

```ts
// src/lib/editor/access.ts
import {
  clearPageRestrictions,
  getCurrentConfluenceUser,
  restrictPageToAccount,
} from "@/lib/confluence/client";

let cachedServiceAccountId: string | null = null;

async function getServiceAccountId(): Promise<string> {
  if (!cachedServiceAccountId) {
    const user = await getCurrentConfluenceUser();
    cachedServiceAccountId = user.accountId;
  }
  return cachedServiceAccountId;
}

/** 다른 직원에게 이 페이지가 보이지 않도록, 서비스 계정 자신만 읽기/수정 가능하게 제한한다. */
export async function hidePageFromOthers(pageId: string): Promise<void> {
  const accountId = await getServiceAccountId();
  await restrictPageToAccount(pageId, accountId);
}

/** 제한을 해제해 Space 기본 권한(구성원 전체 공개)으로 되돌린다. */
export async function revealPageToSpace(pageId: string): Promise<void> {
  await clearPageRestrictions(pageId);
}
```

- [ ] **Step 8: 테스트 실행 → 통과 확인**

Run: `npm test -- access.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/lib/editor/roots.ts src/lib/editor/roots.test.ts src/lib/editor/access.ts src/lib/editor/access.test.ts
git commit -m "feat: add content roots lookup and draft-hiding helpers"
```

---

## Task 8: `editor/folder.ts` 개편 — 초안 루트 하위에 생성 + 숨김 적용

**Files:**
- Modify: `src/lib/editor/folder.ts` (전체 재작성)
- Test: `src/lib/editor/folder.test.ts`

**Interfaces:**
- Consumes: `getContentRoots`(Task 7), `hidePageFromOthers`(Task 7), `createPage`/`findChildPageByTitle`/`getConfiguredSpace`(`@/lib/confluence/client`)
- Produces: `export interface PersonalFolder { folderId: string; spaceKey: string }`, `export async function findPersonalFolder(email: string): Promise<PersonalFolder | null>`, `export async function createPersonalFolder(email: string): Promise<PersonalFolder>` (기존과 동일한 시그니처 유지) — Task 9, Task 11, 기존 `app/api/editor/folder/route.ts`·`app/editor/page.tsx`가 그대로 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/lib/editor/folder.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import * as roots from "./roots";
import * as access from "./access";
import { createPersonalFolder, findPersonalFolder } from "./folder";
import { ConflictError } from "./errors";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(roots, "getContentRoots").mockResolvedValue({
    draftsRootId: "drafts-1",
    publishedRootId: "published-1",
  });
  vi.spyOn(client, "getConfiguredSpace").mockResolvedValue({
    id: "space-1",
    key: "SFOODIT",
    homepageId: "home-1",
  });
});

describe("findPersonalFolder", () => {
  it("초안 루트 하위에서 이메일 제목의 폴더를 찾는다", async () => {
    const findSpy = vi.spyOn(client, "findChildPageByTitle").mockResolvedValue({
      id: "folder-1",
      status: "current",
      title: "user@s-food.com",
      spaceId: "space-1",
      parentId: "drafts-1",
      version: { number: 1, createdAt: "" },
    });

    const folder = await findPersonalFolder("user@s-food.com");

    expect(findSpy).toHaveBeenCalledWith("drafts-1", "user@s-food.com");
    expect(folder).toEqual({ folderId: "folder-1", spaceKey: "SFOODIT" });
  });

  it("폴더가 없으면 null을 반환한다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(null);

    const folder = await findPersonalFolder("user@s-food.com");

    expect(folder).toBeNull();
  });
});

describe("createPersonalFolder", () => {
  it("초안 루트 하위에 폴더를 만들고 서비스 계정 전용으로 숨긴다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(null);
    const createSpy = vi.spyOn(client, "createPage").mockResolvedValue({
      id: "folder-1",
      status: "current",
      title: "user@s-food.com",
      spaceId: "space-1",
      parentId: "drafts-1",
      version: { number: 1, createdAt: "" },
    });
    const hideSpy = vi.spyOn(access, "hidePageFromOthers").mockResolvedValue(undefined);

    const folder = await createPersonalFolder("user@s-food.com");

    expect(createSpy).toHaveBeenCalledWith({
      spaceId: "space-1",
      parentId: "drafts-1",
      title: "user@s-food.com",
      bodyValue: "<p>user@s-food.com님의 개인 폴더입니다.</p>",
    });
    expect(hideSpy).toHaveBeenCalledWith("folder-1");
    expect(folder).toEqual({ folderId: "folder-1", spaceKey: "SFOODIT" });
  });

  it("이미 폴더가 있으면 ConflictError를 던진다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue({
      id: "folder-1",
      status: "current",
      title: "user@s-food.com",
      spaceId: "space-1",
      parentId: "drafts-1",
      version: { number: 1, createdAt: "" },
    });

    await expect(createPersonalFolder("user@s-food.com")).rejects.toThrow(ConflictError);
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- folder.test.ts`
Expected: FAIL (기존 `folder.ts`는 `draftsRootId`가 아닌 `space.homepageId`를 부모로 사용)

- [ ] **Step 3: `folder.ts` 전체 교체**

```ts
// src/lib/editor/folder.ts
import { createPage, findChildPageByTitle, getConfiguredSpace } from "@/lib/confluence/client";
import { hidePageFromOthers } from "./access";
import { getContentRoots } from "./roots";
import { ConflictError } from "./errors";

export interface PersonalFolder {
  folderId: string;
  spaceKey: string;
}

/** 로그인 사용자의 이메일을 제목으로 하는 개인 폴더(초안 루트 하위 페이지)를 조회한다. */
export async function findPersonalFolder(email: string): Promise<PersonalFolder | null> {
  const [{ draftsRootId }, space] = await Promise.all([
    getContentRoots(),
    getConfiguredSpace(),
  ]);
  const page = await findChildPageByTitle(draftsRootId, email);
  if (!page) {
    return null;
  }
  return { folderId: page.id, spaceKey: space.key };
}

/** 개인 폴더가 없으면 초안 루트 하위에 새로 만들고, 다른 직원에게 보이지 않도록 제한한다. */
export async function createPersonalFolder(email: string): Promise<PersonalFolder> {
  const [{ draftsRootId }, space] = await Promise.all([
    getContentRoots(),
    getConfiguredSpace(),
  ]);

  const existing = await findChildPageByTitle(draftsRootId, email);
  if (existing) {
    throw new ConflictError("개인 폴더가 이미 존재합니다.");
  }

  const page = await createPage({
    spaceId: space.id,
    parentId: draftsRootId,
    title: email,
    bodyValue: `<p>${email}님의 개인 폴더입니다.</p>`,
  });

  await hidePageFromOthers(page.id);

  return { folderId: page.id, spaceKey: space.key };
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- folder.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/editor/folder.ts src/lib/editor/folder.test.ts
git commit -m "feat: create personal folders under the drafts root, hidden by default"
```

---

## Task 9: `editor/documents.ts` 개편 — 문서 생성 시 숨김 적용

**Files:**
- Modify: `src/lib/editor/documents.ts:82-105` (`createDocument`)
- Test: `src/lib/editor/documents.test.ts`

**Interfaces:**
- Consumes: `hidePageFromOthers`(Task 7)
- Produces: `createDocument`는 기존과 동일한 시그니처(`CreateDocumentInput` → `{ pageId, version }`)를 유지하되, 생성한 문서 페이지에 항상 `hidePageFromOthers`를 호출한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/lib/editor/documents.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import * as access from "./access";
import { createDocument } from "./documents";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("createDocument", () => {
  it("문서를 만든 뒤 서비스 계정 전용으로 숨긴다", async () => {
    vi.spyOn(client, "getConfiguredSpace").mockResolvedValue({
      id: "space-1",
      key: "SFOODIT",
      homepageId: "home-1",
    });
    vi.spyOn(client, "createPage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "제목",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 1, createdAt: "" },
    });
    vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "authorMeta",
      value: {},
      version: { number: 1 },
    });
    const hideSpy = vi.spyOn(access, "hidePageFromOthers").mockResolvedValue(undefined);

    const result = await createDocument({
      folderId: "folder-1",
      title: "제목",
      markdown: "본문",
      actualAuthorEmail: "user@s-food.com",
    });

    expect(hideSpy).toHaveBeenCalledWith("doc-1");
    expect(result).toEqual({ pageId: "doc-1", version: 1 });
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- documents.test.ts`
Expected: FAIL (`hidePageFromOthers`가 호출되지 않음)

- [ ] **Step 3: 구현 — `createDocument` 수정**

`src/lib/editor/documents.ts` 상단 import에 추가:

```ts
import { hidePageFromOthers } from "./access";
```

기존 82~105번째 줄의 `createDocument` 본문 중 `Promise.all([...])` 블록을:

```ts
  await Promise.all([
    upsertPageProperty(page.id, "authorMeta", {
      actualAuthorEmail: input.actualAuthorEmail,
    }),
    upsertPageProperty(page.id, SOURCE_MARKDOWN_PROPERTY_KEY, {
      markdown: input.markdown,
    }),
    hidePageFromOthers(page.id),
  ]);
```

로 교체한다(기존 두 항목에 `hidePageFromOthers(page.id)`를 추가).

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- documents.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/editor/documents.ts src/lib/editor/documents.test.ts
git commit -m "feat: hide newly created documents from other employees"
```

---

## Task 10: `editor/publish.ts` 개편 (1/2) — `PublishMetadata` viewers 구조 + slug 검사

**Files:**
- Modify: `src/lib/editor/publish.ts` (전체 재작성 — 이 Task와 Task 11에 걸쳐 진행)
- Test: `src/lib/editor/publish.test.ts`

**Interfaces:**
- Consumes: `findPublishedPageBySlug`(Task 6, 새 시그니처), `getConfiguredSpace`/`getPageProperty`/`upsertPageProperty`(`@/lib/confluence/client`)
- Produces: `export interface PublishViewerMetadata { slug: string; metaDescription: string }`, `export interface PublishMetadata { isPublished: boolean; publishedAt?: string; viewers: Record<string, PublishViewerMetadata> }`, `export interface SetPublishStateInput { pageId: string; isPublished: boolean; viewers?: Record<string, PublishViewerMetadata> }` — Task 11이 이 타입을 그대로 이어서 사용하고, Task 12(API 라우트·PublishForm)가 이 구조로 요청/응답을 주고받는다.

이 Task에서는 데이터 구조 변경과 slug 검증만 다룬다. 게시/게시취소 시 페이지 이동·제한 토글은 Task 11에서 이어서 추가한다(같은 함수를 계속 확장).

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/lib/editor/publish.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import { getPublishState, setPublishState } from "./publish";
import { ConflictError, ValidationError } from "./errors";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(client, "getConfiguredSpace").mockResolvedValue({
    id: "space-1",
    key: "SFOODIT",
    homepageId: "home-1",
  });
});

describe("getPublishState", () => {
  it("설정이 없으면 기본값(미게시, 빈 viewers)을 반환한다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);

    const state = await getPublishState("doc-1");

    expect(state).toEqual({ isPublished: false, viewers: {} });
  });
});

describe("setPublishState", () => {
  it("게시 시 slug/metaDescription이 없으면 ValidationError를 던진다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);

    await expect(
      setPublishState({ pageId: "doc-1", isPublished: true, viewers: {} })
    ).rejects.toThrow(ValidationError);
  });

  it("같은 뷰어에서 slug가 이미 쓰이고 있으면 ConflictError를 던진다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);
    vi.spyOn(client, "findPublishedPageBySlug").mockResolvedValue({
      id: "other-doc",
      status: "current",
      title: "다른 문서",
      spaceId: "space-1",
      parentId: null,
      version: { number: 1, createdAt: "" },
    });

    await expect(
      setPublishState({
        pageId: "doc-1",
        isPublished: true,
        viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명" } },
      })
    ).rejects.toThrow(ConflictError);
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- publish.test.ts`
Expected: FAIL (기존 `publish.ts`는 `targetViewers`/단일 `slug` 구조)

- [ ] **Step 3: `publish.ts` 재작성 (1부 — 데이터 구조 + slug 검사만)**

```ts
// src/lib/editor/publish.ts
import {
  ConfluenceApiError,
  findPublishedPageBySlug,
  getConfiguredSpace,
  getPageProperty,
  upsertPageProperty,
} from "@/lib/confluence/client";
import { ConflictError, NotFoundError, ValidationError } from "./errors";

const PUBLISH_PROPERTY_KEY = "publishMetadata";

export interface PublishViewerMetadata {
  slug: string;
  metaDescription: string;
}

export interface PublishMetadata {
  isPublished: boolean;
  publishedAt?: string;
  viewers: Record<string, PublishViewerMetadata>;
}

export interface SetPublishStateInput {
  pageId: string;
  isPublished: boolean;
  viewers?: Record<string, PublishViewerMetadata>;
}

async function getPublishPropertyOrThrow(pageId: string) {
  try {
    return await getPageProperty<PublishMetadata>(pageId, PUBLISH_PROPERTY_KEY);
  } catch (error) {
    if (error instanceof ConfluenceApiError && error.status === 404) {
      throw new NotFoundError("문서를 찾을 수 없습니다.");
    }
    throw error;
  }
}

/** 문서의 현재 게시 설정을 조회한다. 설정 이력이 없으면 기본값(미게시, 빈 viewers)을 반환한다. */
export async function getPublishState(pageId: string): Promise<PublishMetadata> {
  const property = await getPublishPropertyOrThrow(pageId);
  return property?.value ?? { isPublished: false, viewers: {} };
}

async function assertNoSlugConflict(
  pageId: string,
  previousViewers: Record<string, PublishViewerMetadata>,
  nextViewers: Record<string, PublishViewerMetadata>
) {
  for (const [viewerId, meta] of Object.entries(nextViewers)) {
    if (!meta.slug || !meta.metaDescription) {
      throw new ValidationError(`뷰어(${viewerId})의 slug와 metaDescription은 필수입니다.`);
    }

    const previousSlug = previousViewers[viewerId]?.slug;
    if (previousSlug === meta.slug) {
      continue;
    }

    const space = await getConfiguredSpace();
    const conflictingPage = await findPublishedPageBySlug(
      space.id,
      viewerId,
      meta.slug,
      PUBLISH_PROPERTY_KEY
    );
    if (conflictingPage && conflictingPage.id !== pageId) {
      throw new ConflictError(`뷰어(${viewerId})에서 이미 사용 중인 slug입니다.`);
    }
  }
}

/** 문서의 게시 여부·뷰어별 slug/메타 설명을 설정한다. */
export async function setPublishState(input: SetPublishStateInput) {
  const existingProperty = await getPublishPropertyOrThrow(input.pageId);
  const previousState: PublishMetadata =
    existingProperty?.value ?? { isPublished: false, viewers: {} };

  if (input.isPublished) {
    const viewers = input.viewers ?? previousState.viewers;
    if (Object.keys(viewers).length === 0) {
      throw new ValidationError("게시 시 최소 하나의 뷰어 설정이 필요합니다.");
    }
    await assertNoSlugConflict(input.pageId, previousState.viewers, viewers);

    const value: PublishMetadata = {
      isPublished: true,
      publishedAt: new Date().toISOString(),
      viewers,
    };
    await upsertPageProperty(input.pageId, PUBLISH_PROPERTY_KEY, value);

    return { pageId: input.pageId, isPublished: true, viewers, publishedAt: value.publishedAt };
  }

  const value: PublishMetadata = { isPublished: false, viewers: previousState.viewers };
  await upsertPageProperty(input.pageId, PUBLISH_PROPERTY_KEY, value);

  return { pageId: input.pageId, isPublished: false, viewers: value.viewers };
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- publish.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/editor/publish.ts src/lib/editor/publish.test.ts
git commit -m "feat: switch publish metadata to per-viewer structure"
```

---

## Task 11: `editor/publish.ts` 개편 (2/2) — 게시/게시취소 생명주기 (이동 + 제한 토글)

**Files:**
- Modify: `src/lib/editor/publish.ts` (Task 10에서 만든 `setPublishState`를 확장)
- Test: `src/lib/editor/publish.test.ts`

**Interfaces:**
- Consumes: `movePage`(Task 3), `hidePageFromOthers`/`revealPageToSpace`(Task 7), `getContentRoots`(Task 7), `findPersonalFolder`/`createPersonalFolder`(Task 8), `getPageProperty`(`@/lib/confluence/client`)
- Produces: `setPublishState`는 게시 상태가 실제로 바뀔 때(미게시→게시, 게시→미게시)만 문서 페이지를 이동시키고 제한을 토글한다. 반환 타입은 Task 10과 동일.

- [ ] **Step 1: 실패하는 테스트 작성 (기존 `publish.test.ts`에 추가)**

```ts
import * as roots from "./roots";
import * as access from "./access";
import * as folder from "./folder";

// ...(beforeEach에 아래 한 줄 추가로 매 테스트마다 초기화)
// vi.spyOn(roots, "getContentRoots").mockResolvedValue({ draftsRootId: "drafts-1", publishedRootId: "published-1" });

describe("setPublishState — 생명주기", () => {
  it("처음 게시할 때 게시됨 루트로 이동하고 제한을 해제한다", async () => {
    vi.spyOn(roots, "getContentRoots").mockResolvedValue({
      draftsRootId: "drafts-1",
      publishedRootId: "published-1",
    });
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);
    const moveSpy = vi.spyOn(client, "movePage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "제목",
      spaceId: "space-1",
      parentId: "published-1",
      version: { number: 2, createdAt: "" },
    });
    const revealSpy = vi.spyOn(access, "revealPageToSpace").mockResolvedValue(undefined);

    await setPublishState({
      pageId: "doc-1",
      isPublished: true,
      viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명" } },
    });

    expect(moveSpy).toHaveBeenCalledWith("doc-1", "published-1");
    expect(revealSpy).toHaveBeenCalledWith("doc-1");
  });

  it("게시 취소 시 작성자의 개인 폴더로 되돌리고 다시 숨긴다", async () => {
    vi.spyOn(roots, "getContentRoots").mockResolvedValue({
      draftsRootId: "drafts-1",
      publishedRootId: "published-1",
    });
    vi.spyOn(client, "getPageProperty").mockImplementation(async (_pageId, key) => {
      if (key === "publishMetadata") {
        return {
          id: "prop-1",
          key,
          value: { isPublished: true, viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명" } } },
          version: { number: 1 },
        };
      }
      if (key === "authorMeta") {
        return {
          id: "prop-2",
          key,
          value: { actualAuthorEmail: "user@s-food.com" },
          version: { number: 1 },
        };
      }
      return null;
    });
    vi.spyOn(folder, "findPersonalFolder").mockResolvedValue({
      folderId: "folder-1",
      spaceKey: "SFOODIT",
    });
    const moveSpy = vi.spyOn(client, "movePage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "제목",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 3, createdAt: "" },
    });
    const hideSpy = vi.spyOn(access, "hidePageFromOthers").mockResolvedValue(undefined);

    await setPublishState({ pageId: "doc-1", isPublished: false });

    expect(moveSpy).toHaveBeenCalledWith("doc-1", "folder-1");
    expect(hideSpy).toHaveBeenCalledWith("doc-1");
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- publish.test.ts`
Expected: FAIL (`movePage`/`revealPageToSpace`/`hidePageFromOthers`가 호출되지 않음)

- [ ] **Step 3: `publish.ts`에 생명주기 로직 추가**

상단 import를 아래로 교체:

```ts
import {
  ConfluenceApiError,
  findPublishedPageBySlug,
  getConfiguredSpace,
  getPageProperty,
  movePage,
  upsertPageProperty,
} from "@/lib/confluence/client";
import { hidePageFromOthers, revealPageToSpace } from "./access";
import { getContentRoots } from "./roots";
import { createPersonalFolder, findPersonalFolder } from "./folder";
import { ConflictError, NotFoundError, ValidationError } from "./errors";

const AUTHOR_PROPERTY_KEY = "authorMeta";
```

(`AUTHOR_PROPERTY_KEY`는 `PUBLISH_PROPERTY_KEY` 선언 옆에 둔다.)

`setPublishState`의 게시 분기(Task 10에서 작성한 `if (input.isPublished) { ... return ...; }` 블록)를 아래로 교체한다:

```ts
  if (input.isPublished) {
    const viewers = input.viewers ?? previousState.viewers;
    if (Object.keys(viewers).length === 0) {
      throw new ValidationError("게시 시 최소 하나의 뷰어 설정이 필요합니다.");
    }
    await assertNoSlugConflict(input.pageId, previousState.viewers, viewers);

    const value: PublishMetadata = {
      isPublished: true,
      publishedAt: new Date().toISOString(),
      viewers,
    };
    await upsertPageProperty(input.pageId, PUBLISH_PROPERTY_KEY, value);

    if (!previousState.isPublished) {
      const { publishedRootId } = await getContentRoots();
      await movePage(input.pageId, publishedRootId);
      await revealPageToSpace(input.pageId);
    }

    return { pageId: input.pageId, isPublished: true, viewers, publishedAt: value.publishedAt };
  }
```

그리고 미게시 분기(Task 10에서 작성한 마지막 블록)를 아래로 교체한다:

```ts
  const value: PublishMetadata = { isPublished: false, viewers: previousState.viewers };
  await upsertPageProperty(input.pageId, PUBLISH_PROPERTY_KEY, value);

  if (previousState.isPublished) {
    const authorProperty = await getPageProperty<{ actualAuthorEmail: string }>(
      input.pageId,
      AUTHOR_PROPERTY_KEY
    );
    const authorEmail = authorProperty?.value.actualAuthorEmail;
    if (!authorEmail) {
      throw new Error("작성자 정보를 찾을 수 없어 초안 폴더로 되돌릴 수 없습니다.");
    }

    const targetFolder =
      (await findPersonalFolder(authorEmail)) ?? (await createPersonalFolder(authorEmail));
    await movePage(input.pageId, targetFolder.folderId);
    await hidePageFromOthers(input.pageId);
  }

  return { pageId: input.pageId, isPublished: false, viewers: value.viewers };
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- publish.test.ts`
Expected: PASS (Task 10 + Task 11 테스트 전체)

- [ ] **Step 5: Commit**

```bash
git add src/lib/editor/publish.ts src/lib/editor/publish.test.ts
git commit -m "feat: move documents between drafts and published roots on publish toggle"
```

---

## Task 12: publish API 라우트 + `PublishForm.tsx` 업데이트

**Files:**
- Modify: `src/app/api/editor/documents/[pageId]/publish/route.ts`
- Modify: `src/components/editor/PublishForm.tsx`
- Test: `src/app/api/editor/documents/[pageId]/publish/route.test.ts`

**Interfaces:**
- Consumes: `setPublishState`(Task 11의 새 시그니처 — `viewers` 필드)
- Produces: API 요청/응답이 `targetViewers`/단일 `slug` 대신 `viewers: Record<string, {slug, metaDescription}>`를 사용 — `docs/product/api-spec.md`의 "Phase 1에서 변경 예정" 절이 실제로 반영된 상태가 된다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/app/api/editor/documents/[pageId]/publish/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as authGuard from "@/lib/auth-guard";
import * as publish from "@/lib/editor/publish";
import { PATCH } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("PATCH /api/editor/documents/[pageId]/publish", () => {
  it("viewers 필드를 그대로 setPublishState에 전달한다", async () => {
    vi.spyOn(authGuard, "requireSessionEmail").mockResolvedValue("user@s-food.com");
    const setSpy = vi.spyOn(publish, "setPublishState").mockResolvedValue({
      pageId: "doc-1",
      isPublished: true,
      viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명" } },
      publishedAt: "2026-08-21T00:00:00.000Z",
    });

    const request = new Request("http://localhost/api/editor/documents/doc-1/publish", {
      method: "PATCH",
      body: JSON.stringify({
        isPublished: true,
        viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명" } },
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ pageId: "doc-1" }) });
    const body = await response.json();

    expect(setSpy).toHaveBeenCalledWith({
      pageId: "doc-1",
      isPublished: true,
      viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명" } },
    });
    expect(body.viewers).toEqual({ "tech-blog": { slug: "my-post", metaDescription: "설명" } });
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- publish/route.test.ts`
Expected: FAIL (기존 라우트는 `targetViewers`/`slug`/`metaDescription`을 개별 필드로 읽음)

- [ ] **Step 3: 라우트 구현 교체**

`src/app/api/editor/documents/[pageId]/publish/route.ts` 전체를 아래로 교체:

```ts
import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { setPublishState, type PublishViewerMetadata } from "@/lib/editor/publish";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await requireSessionEmail();
    const { pageId } = await params;

    const payload = (await request.json()) as {
      isPublished?: boolean;
      viewers?: Record<string, PublishViewerMetadata>;
    };

    const result = await setPublishState({
      pageId,
      isPublished: Boolean(payload.isPublished),
      viewers: payload.viewers,
    });

    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- publish/route.test.ts`
Expected: PASS

- [ ] **Step 5: `PublishForm.tsx` 업데이트 (수동 확인 — UI 컴포넌트라 단위 테스트는 생략)**

`src/components/editor/PublishForm.tsx` 전체를 아래로 교체:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface ViewerMetadata {
  slug: string;
  metaDescription: string;
}

interface PublishFormProps {
  pageId: string;
  initial: {
    isPublished: boolean;
    viewers: Record<string, ViewerMetadata>;
  };
}

const VIEWER_OPTIONS = [{ value: "tech-blog", label: "Tech Blog" }];

export function PublishForm({ pageId, initial }: PublishFormProps) {
  const router = useRouter();
  const [isPublished, setIsPublished] = useState(initial.isPublished);
  const [enabledViewers, setEnabledViewers] = useState<string[]>(
    Object.keys(initial.viewers).length ? Object.keys(initial.viewers) : ["tech-blog"]
  );
  const [slug, setSlug] = useState(initial.viewers["tech-blog"]?.slug ?? "");
  const [metaDescription, setMetaDescription] = useState(
    initial.viewers["tech-blog"]?.metaDescription ?? ""
  );
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setError(null);
    setSavedAt(null);

    const viewers: Record<string, ViewerMetadata> = {};
    for (const viewerId of enabledViewers) {
      viewers[viewerId] = { slug, metaDescription };
    }

    try {
      const response = await fetch(`/api/editor/documents/${pageId}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished, viewers }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message ?? "게시 설정 저장에 실패했습니다.");
      }
      setSavedAt(data.publishedAt ?? "저장됨");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setStatus("idle");
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div className="field">
        <label>
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(event) => setIsPublished(event.target.checked)}
          />{" "}
          게시함
        </label>
      </div>

      <div className="field">
        <label htmlFor="slug">공개 경로(slug)</label>
        <input
          id="slug"
          type="text"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="예: my-first-post"
        />
      </div>

      <div className="field">
        <label htmlFor="metaDescription">메타 설명</label>
        <textarea
          id="metaDescription"
          value={metaDescription}
          onChange={(event) => setMetaDescription(event.target.value)}
          style={{ minHeight: 80 }}
        />
      </div>

      <div className="field">
        <label>노출 Viewer</label>
        {VIEWER_OPTIONS.map((option) => (
          <label key={option.value} style={{ fontWeight: 400 }}>
            <input
              type="checkbox"
              checked={enabledViewers.includes(option.value)}
              onChange={(event) => {
                setEnabledViewers((prev) =>
                  event.target.checked
                    ? [...prev, option.value]
                    : prev.filter((value) => value !== option.value)
                );
              }}
            />{" "}
            {option.label}
          </label>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}
      {savedAt && !error && (
        <p className="page-subtitle" style={{ margin: 0 }}>
          게시 설정이 저장되었습니다.
        </p>
      )}

      <div>
        <button
          type="submit"
          className="button button-primary"
          disabled={status === "saving"}
        >
          {status === "saving" ? "저장 중..." : "게시 설정 저장"}
        </button>
      </div>
    </form>
  );
}
```

`src/app/editor/[pageId]/publish/page.tsx`는 `initial={publishState}`를 그대로 전달하고 있고 `PublishMetadata`가 `{isPublished, publishedAt?, viewers}` 형태이므로 수정할 필요가 없다(초과 필드 `publishedAt`는 변수 전달 시 문제되지 않는다).

- [ ] **Step 6: 개발 서버로 수동 확인**

```bash
npm run dev
```

브라우저에서 문서 편집 → 게시 설정 화면으로 이동해 "게시함" 체크, slug/메타 설명 입력, "Tech Blog" 체크 후 저장 → 저장 성공 메시지가 보이는지 확인한다. `npm run lint`도 실행해 타입 오류가 없는지 확인한다.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/editor/documents/[pageId]/publish/route.ts src/app/api/editor/documents/[pageId]/publish/route.test.ts src/components/editor/PublishForm.tsx
git commit -m "feat: switch publish API and form to per-viewer metadata"
```

---

## Task 13: `editor/tags.ts` 신규 + API 라우트 추가

**Files:**
- Create: `src/lib/editor/tags.ts`
- Create: `src/app/api/editor/documents/[pageId]/tags/route.ts`
- Test: `src/lib/editor/tags.test.ts`

**Interfaces:**
- Consumes: `listLabels`/`addLabels`/`removeLabel`(Task 5), `requireSessionEmail`(`@/lib/auth-guard`), `toErrorResponse`(`@/lib/api-response`)
- Produces: `export async function getTags(pageId: string): Promise<string[]>`, `export async function setTags(pageId: string, tags: string[]): Promise<string[]>`, `PUT /api/editor/documents/{pageId}/tags` — `docs/product/api-spec.md`의 "계획된 신규 엔드포인트" 절이 실제로 반영된 상태가 된다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/lib/editor/tags.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import { getTags, setTags } from "./tags";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("getTags", () => {
  it("페이지 라벨 이름 목록을 반환한다", async () => {
    vi.spyOn(client, "listLabels").mockResolvedValue([
      { id: "1", name: "React" },
      { id: "2", name: "Backend" },
    ]);

    const tags = await getTags("doc-1");

    expect(tags).toEqual(["React", "Backend"]);
  });
});

describe("setTags", () => {
  it("새로 추가된 태그만 추가하고, 빠진 태그만 삭제한다", async () => {
    vi.spyOn(client, "listLabels").mockResolvedValue([
      { id: "1", name: "React" },
      { id: "2", name: "Old" },
    ]);
    const addSpy = vi.spyOn(client, "addLabels").mockResolvedValue(undefined);
    const removeSpy = vi.spyOn(client, "removeLabel").mockResolvedValue(undefined);

    const result = await setTags("doc-1", ["React", "Backend"]);

    expect(addSpy).toHaveBeenCalledWith("doc-1", ["Backend"]);
    expect(removeSpy).toHaveBeenCalledWith("doc-1", "Old");
    expect(result).toEqual(["React", "Backend"]);
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- tags.test.ts`
Expected: FAIL (`./tags` 모듈 없음)

- [ ] **Step 3: `tags.ts` 구현**

```ts
// src/lib/editor/tags.ts
import { addLabels, listLabels, removeLabel } from "@/lib/confluence/client";

/** 문서에 붙은 태그(Confluence 라벨) 목록을 조회한다. */
export async function getTags(pageId: string): Promise<string[]> {
  const labels = await listLabels(pageId);
  return labels.map((label) => label.name);
}

/** 문서의 태그를 지정한 목록으로 맞춘다(없던 태그는 추가, 빠진 태그는 제거). */
export async function setTags(pageId: string, tags: string[]): Promise<string[]> {
  const current = await getTags(pageId);
  const toAdd = tags.filter((tag) => !current.includes(tag));
  const toRemove = current.filter((tag) => !tags.includes(tag));

  if (toAdd.length > 0) {
    await addLabels(pageId, toAdd);
  }
  await Promise.all(toRemove.map((tag) => removeLabel(pageId, tag)));

  return tags;
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- tags.test.ts`
Expected: PASS

- [ ] **Step 5: API 라우트 작성**

```ts
// src/app/api/editor/documents/[pageId]/tags/route.ts
import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { setTags } from "@/lib/editor/tags";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    await requireSessionEmail();
    const { pageId } = await params;

    const payload = (await request.json()) as { tags?: string[] };
    const tags = await setTags(pageId, payload.tags ?? []);

    return NextResponse.json({ pageId, tags });
  } catch (error) {
    return toErrorResponse(error);
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/editor/tags.ts src/lib/editor/tags.test.ts src/app/api/editor/documents/[pageId]/tags/route.ts
git commit -m "feat: add document tagging via Confluence labels"
```

---

## Task 14: 문서 마무리 — `prd.md` 체크리스트 갱신

**Files:**
- Modify: `docs/product/prd.md`
- Modify: `docs/product/api-spec.md` (Phase 1 변경 예정 표시를 확정 표시로 정리)

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (문서 갱신만)

- [ ] **Step 1: `npm run lint`와 `npm test` 전체 통과 확인**

Run: `npm run lint && npm test`
Expected: 둘 다 통과 (lint 경고/에러 없음, 모든 테스트 PASS)

- [ ] **Step 2: `docs/product/prd.md`의 Phase 1 체크리스트를 완료로 갱신**

각 항목을 `- [x] (완료) ... — 산출물: <실제 커밋에 포함된 파일 경로>` 형태로 갱신하고, 상단 진행률 줄(`> 전체 진행률: ...`)의 숫자와 날짜도 갱신한다.

- [ ] **Step 3: `docs/product/api-spec.md`의 "Phase 1에서 변경 예정"/"계획된 신규 엔드포인트" 표시를 확정본으로 정리**

두 절의 "⚠️ 아직 구현되지 않았고..." 문구를 제거하고, 실제 구현된 요청/응답 형태(Task 12·13에서 작성한 그대로)로 본문에 병합한다.

- [ ] **Step 4: Commit**

```bash
git add docs/product/prd.md docs/product/api-spec.md
git commit -m "docs: mark Phase 1 content-structure work complete"
```
